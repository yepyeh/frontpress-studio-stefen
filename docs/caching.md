---
title: Caching
layout: default
---

# Caching

* TOC
{:toc}

FrontPress Studio has no database, so the only thing worth caching is the Markdown → HTML parse and the front-matter scan that builds the post index. Both happen on disk, both invalidate themselves, and you almost never need to think about them.

## What gets cached

Three caches live under `app/site/cache/`:

| Cache | Location | What it stores | Triggers a rebuild |
|-------|----------|----------------|--------------------|
| Per-page HTML | `site/cache/html/<md5>.json` | The output of Markdown + front-matter parsing for one content file (`{ meta, body, html }`). Filename is `md5(<relative content path>).json` | Source `.md` is newer than the cache file |
| Post index | `site/cache/index.json` | Compiled list of every post (slug, folder, URL, dates, tags, categories, full meta) — backs `posts()`, archives, taxonomy archives, feeds, sitemap | `cache/index.mtime` marker is newer than `index.json` |
| Twig compiled templates | `site/cache/twig/` | PHP code Twig emits from `.twig` files | Source `.twig` file edited (`auto_reload: true`) |

There is **no** full-page response cache — every request still runs through `index.php`. Caching only skips the expensive bits: parsing Markdown and walking the content tree.

## How invalidation works

### HTML cache
File-mtime based. `Content::load()` compares `filemtime($cacheFile)` against `filemtime($sourceFile)` and reuses the cache only when the source isn't newer. Save the post in the admin, edit the `.md` over SSH, `git pull`, `rsync` — all of them bump the source mtime, all of them invalidate the right cache file on the next request.

### Post index
The index covers the *whole* content tree, so naive invalidation would mean re-scanning every `.md` on every request. Instead there's a one-byte sentinel file at `site/cache/index.mtime`:

- Every admin write (create / update / delete a page, change settings, restore a backup) calls `CacheService::clearIndex()`, which removes `index.json` and `touch`es `index.mtime`.
- `Index::needsRebuild()` only does an `mtime > mtime` comparison between the marker and `index.json` — O(1).
- On a **cold cache** (no marker — fresh deploy, manually deleted `cache/`), the code falls back to scanning every `.md` file once so the first request still detects changes.

This is why a `git pull` or `rsync` deploy works without any cache clear: the source mtimes change, the per-page HTML invalidates per file, and the first archive request triggers a one-time full scan that rebuilds the index and writes a new marker.

### Twig cache
Twig is configured with `auto_reload: true` (`FrontPress\TemplateRenderer::__construct`), so editing a `.twig` template invalidates the compiled file on next render. You should never need to clear it by hand during development. Theme switching is the one case — handled automatically (see below).

## Automatic clears

These run without you doing anything:

| Action | What it clears |
|--------|----------------|
| Save a page in the admin | That page's HTML cache + index marker |
| Delete a page | That page's HTML cache + index marker |
| Save site settings | Index marker (taxonomy/post-type changes affect the index) |
| Activate a different theme | Twig cache (compiled templates from the previous theme would be wrong) |
| Restore a backup | All caches |

## Manual cache control

### From the admin

**Settings → Site settings → Cache** has two buttons:

- **Clear cache** — wipes `cache/html/`, `cache/index.json`, and `cache/twig/`. Pages rebuild lazily on next request.
- **Clear & rebuild** — same wipe, then warms the cache: rebuilds the index and renders every page (drafts included) so the next visitor hits a hot cache. Useful after a bulk content import.

Both surface as JSON endpoints (CSRF-protected):

```
POST /admin/api/cache/clear     → { ok: true }
POST /admin/api/cache/rebuild   → { ok: true, count: <pages warmed> }
```

### From the shell

```bash
# Nuke everything — rebuilds on next request
rm -rf app/site/cache/

# Nuke just per-page HTML, keep the index and twig caches
rm -rf app/site/cache/html/

# Force a full index rebuild on next request
rm app/site/cache/index.json
touch app/site/cache/index.mtime
```

The `cache/` directory is git-ignored and recreated on demand — deleting it can't break anything.

## When to actually think about caching

Realistically, two situations:

1. **Edited content outside the admin and a page still shows old HTML.** Either the editor didn't update mtime (rare) or you copied a file with `cp -p` preserving an old timestamp. Fix: `touch site/content/<path>.md` or delete `site/cache/html/`.
2. **Wrote a new template helper / changed a Twig partial and a page didn't pick it up.** Twig auto-reloads on template changes, but a helper is a PHP file — it doesn't invalidate compiled templates. Clear `cache/twig/` (or hit **Clear cache** in the admin).

For everything else: the cache takes care of itself.
