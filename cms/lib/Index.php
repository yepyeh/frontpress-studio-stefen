<?php

declare(strict_types=1);

namespace FrontPress;

defined('FRONTPRESS_BOOT') || exit;

class Index
{
    private string $contentDir;
    private string $cacheDir;
    private Content $content;

    /**
     * Per-request memo of the parsed index, keyed by absolute index-file path
     * + filemtime. Several controllers can each instantiate `Index` during a
     * single request; without this they each re-decode the same JSON.
     *
     * @var array<string, array<string, array<string, mixed>>>
     */
    private static array $cache = [];

    public function __construct(string $contentDir, string $cacheDir, Content $content)
    {
        $this->contentDir = rtrim($contentDir, '/');
        $this->cacheDir   = rtrim($cacheDir, '/');
        $this->content    = $content;
    }

    /**
     * Get the compiled index, rebuilding if any .md file is newer than the index.
     *
     * @return array<string, array<string, mixed>>
     */
    public function get(bool $includeDrafts = false): array
    {
        $indexFile = $this->cacheDir . '/index.json';
        if ($this->needsRebuild($indexFile)) {
            $this->build();
            unset(self::$cache[$indexFile]);
        }
        $cacheKey = $indexFile . '@' . (int)@filemtime($indexFile);
        $all      = self::$cache[$cacheKey]
            ?? (self::$cache[$cacheKey] = json_decode(file_get_contents($indexFile), true) ?? []);

        if ($includeDrafts) {
            return $all;
        }
        return array_filter($all, fn ($p) => empty($p['draft']));
    }

    private function needsRebuild(string $indexFile): bool
    {
        if (!is_file($indexFile)) {
            return true;
        }
        $indexTime = filemtime($indexFile);

        // Fast positive signal: any admin write touches the marker, so a
        // marker newer than the index means "an admin-driven change since
        // the last build" — short-circuit without walking the tree.
        $marker = $this->cacheDir . '/index.mtime';
        if (is_file($marker) && filemtime($marker) > $indexTime) {
            return true;
        }

        // External edits (Finder rename, `mv`, `rm`, `cp -p`, rsync, SCP,
        // git checkout, etc.) don't touch the marker. They DO bump the
        // parent directory's mtime — that's universal on Linux/macOS for
        // any add/remove/rename inside a directory. Walk the content tree
        // and rebuild on any directory or .md file newer than the index.
        // Cheap — one stat per entry, sub-millisecond for typical sites.
        // Without this check, once the marker exists from any admin
        // action, external changes are invisible until the next admin
        // save — the exact bug a flat-file CMS shouldn't have, since
        // editing content with whatever tool you like is the whole point.
        if ((int)@filemtime($this->contentDir) > $indexTime) {
            return true;
        }
        $iter = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->contentDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST,
        );
        foreach ($iter as $entry) {
            if ($entry->isDir()) {
                if ($entry->getMTime() > $indexTime) {
                    return true;
                }
                continue;
            }
            if ($entry->getExtension() === 'md' && $entry->getMTime() > $indexTime) {
                return true;
            }
        }
        return false;
    }

    public function touchMarker(): void
    {
        $marker = $this->cacheDir . '/index.mtime';
        if (!is_dir($this->cacheDir)) {
            @mkdir($this->cacheDir, 0755, true);
        }
        @touch($marker);
    }

    /**
     * Scan all .md files and write cache/index.php.
     */
    public function build(): void
    {
        $posts = [];
        $iter  = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->contentDir, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($iter as $file) {
            if ($file->getExtension() !== 'md') {
                continue;
            }

            $relPath = str_replace($this->contentDir . '/', '', $file->getPathname());
            $relPath = substr($relPath, 0, -3); // strip .md

            // Skip _index.md files — they're archive customizers, not listed as posts
            if (basename($relPath) === '_index') {
                continue;
            }

            $meta = $this->content->parseMeta($file->getPathname());
            if ($meta === null) {
                // Malformed YAML — logged by FrontMatter. Skip so one bad
                // file can't poison the rest of the index.
                continue;
            }
            $parts  = explode('/', $relPath);
            $folder = $parts[0];
            $slug   = end($parts);
            $date   = $meta['date'] ?? null;

            // URL: pages are flat, everything else keeps folder prefix
            $url = $folder === 'pages' ? '/' . $slug : '/' . $relPath;

            $posts[$relPath] = [
                'slug'       => $slug,
                'folder'     => $folder,
                'path'       => $relPath,
                'url'        => $url,
                'title'      => $meta['title'] ?? $slug,
                'date'       => $date,
                'categories' => (array)($meta['categories'] ?? []),
                'tags'       => (array)($meta['tags'] ?? []),
                'draft'      => !empty($meta['draft']),
                'meta'       => $meta,
                'mtime'      => $file->getMTime(),
            ];
        }

        // Sort by date desc (null dates last)
        uasort($posts, function ($a, $b) {
            $ad = $a['date'] ? strtotime((string)$a['date']) : 0;
            $bd = $b['date'] ? strtotime((string)$b['date']) : 0;
            return $bd <=> $ad;
        });

        Fs::atomicWrite(
            $this->cacheDir . '/index.json',
            json_encode($posts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
    }

    /**
     * Slugify a taxonomy term for URL matching: "News Flash" → "news-flash".
     */
    public static function slugify(string $s): string
    {
        $s = strtolower(trim($s));
        $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
        return trim($s, '-');
    }

    /**
     * Return posts whose $taxonomy (e.g. "tags" or "categories") contains a
     * term that slugifies to $slug, together with the first matching raw term
     * (useful for the page title).
     *
     * @return array{posts: array<int, array<string, mixed>>, label: ?string}
     */
    public function findByTaxonomyTerm(string $taxonomy, string $slug, bool $includeDrafts = false): array
    {
        $slug  = self::slugify($slug);
        $label = null;
        $posts = [];
        foreach ($this->get($includeDrafts) as $p) {
            $values = (array)($p[$taxonomy] ?? $p['meta'][$taxonomy] ?? []);
            foreach ($values as $v) {
                if (self::slugify((string)$v) === $slug) {
                    $posts[] = $p;
                    $label ??= (string)$v;
                    break;
                }
            }
        }
        return ['posts' => $posts, 'label' => $label];
    }

    /**
     * Filter posts by arbitrary front matter fields.
     * Example: filter(['folder' => 'blog', 'featured' => true])
     *
     * @param  array<string, mixed>              $criteria
     * @return array<string, array<string, mixed>>
     */
    public function filter(array $criteria, bool $includeDrafts = false): array
    {
        $posts = $this->get($includeDrafts);
        return array_filter($posts, function ($p) use ($criteria) {
            foreach ($criteria as $key => $value) {
                $actual = $p[$key] ?? $p['meta'][$key] ?? null;
                if (is_array($actual)) {
                    if (!in_array($value, $actual, true)) {
                        return false;
                    }
                } elseif ($actual !== $value) {
                    return false;
                }
            }
            return true;
        });
    }
}
