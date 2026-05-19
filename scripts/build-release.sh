#!/usr/bin/env bash
#
# build-release.sh — package a turnkey mdframework zip for shared hosting.
#
# Mirrors what the GitHub Actions release workflow does so you can build
# locally (e.g. to test the artifact before tagging). Restores your dev
# composer install at the end so this script is safe to run in a working
# tree.
#
# Usage:
#   scripts/build-release.sh [version]
#     version defaults to the contents of cms/VERSION.

set -euo pipefail

# Resolve project root (parent of scripts/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-$(cat cms/VERSION 2>/dev/null || echo dev)}"
PKG="frontpress-studio-${VERSION}"
OUT="release/${PKG}"

echo "→ Building ${PKG}"

# 1. Production composer install (no dev deps, optimized autoloader).
( cd cms && composer install --no-dev --optimize-autoloader --classmap-authoritative --no-interaction --no-progress )

# 2. Production admin SPA build.
( cd src && npm ci --no-audit --no-fund && npm run build )

# 3. Stage the files we ship via rsync + .distignore.
rm -rf release
mkdir -p "$OUT"

# rsync's --exclude-from doesn't honour '#' comments or blank lines;
# preprocess .distignore into a clean pattern list.
EXCLUDES=$(mktemp -t mdf-excludes.XXXXXX)
trap 'rm -f "$EXCLUDES"' EXIT
grep -vE '^(#|$)' .distignore > "$EXCLUDES"

rsync -a \
  --exclude-from="$EXCLUDES" \
  --exclude='.git/' \
  --exclude='release/' \
  ./ "$OUT/"

# 4. Zip. -y preserves symlinks (default zip dereferences them, turning
#    `assets -> site/themes/blank/assets` into a real dir of stale files).
#    Modern unzip on macOS/Linux extracts the symlink correctly. Windows
#    users see a regular file containing the target string — bootstrap's
#    ensureAssetsLink() self-heals on first request either way.
( cd release && zip -ryq "${PKG}.zip" "${PKG}" )

# 5. Restore dev composer install (phpunit, phpstan, etc.) so the working
#    tree keeps working after this script runs.
( cd cms && composer install --no-interaction --no-progress )

echo "✓ release/${PKG}.zip ($(du -h "release/${PKG}.zip" | cut -f1))"
