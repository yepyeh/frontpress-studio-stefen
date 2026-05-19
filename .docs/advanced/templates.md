# Templates

Engine-agnostic reference. For end-to-end examples in your engine of choice, the existing public docs have cookbooks: [Twig cookbook](../../docs/templates-twig.md) and [PHP cookbook](../../docs/templates-php.md).

## Theme layout

```
site/themes/<slug>/
├── theme.json
├── templates/
│   ├── _layout.twig         — twig themes: HTML shell, {% block content %}
│   ├── _header.twig
│   ├── _footer.twig
│   ├── post.{twig|php}
│   ├── page.{twig|php}
│   ├── archive.{twig|php}
│   ├── taxonomy.{twig|php}
│   ├── feed.{twig|php}
│   ├── 404.{twig|php}
│   └── …                    — custom templates referenced via meta.template
└── assets/
    ├── style.css
    └── style.scss            — optional, auto-compiled in dev
```

## Choosing an engine

Per template, not per theme. `render('post', …)` looks for `post.php` first, then `post.twig`. PHP wins if both exist.

| Engine | When it fits |
|--------|--------------|
| **Twig** | Designer-friendly. Autoescapes HTML by default. Compiled, so fast even with auto-reload on. Default for new themes. |
| **PHP** | Full PHP power — call any function, instantiate classes. No autoescape (`e()` on every interpolation). Use when a template needs logic Twig would make awkward. |

Every helper has the same name and signature in both engines.

## Helpers

Defined in `cms/lib/template_helpers.php`. Registered as Twig functions of the same name in `cms/lib/TemplateRenderer.php`.

| Helper | Signature | Notes |
|--------|-----------|-------|
| `e($v)` | `string` ← scalar/Stringable | HTML-escape (`htmlspecialchars`, `ENT_QUOTES`, UTF-8). Returns `''` for `null`/`false`. Twig autoescapes; call manually only when escaping is off. |
| `partial($name, $vars=[])` | `void` (echoes) | Render a partial. Resolution order below. |
| `asset_url($path)` | `string` | Prefix `/assets/` — the active theme's `assets/` is symlinked there. |
| `paginate($page, $totalPages, $baseUrl)` | `string` (HTML) | Returns the prev / "Page X of Y" / next nav block. Empty when `$totalPages <= 1`. Twig: pipe through `|raw`. |
| `slug_url($term, $taxonomy='categories')` | `string` | URL for a taxonomy archive (`/categories/php`). Slugifies first. |
| `inspect($value, $label='')` | `string` (HTML) | Pretty-printed labelled dump of any value. Useful while building a theme. |
| `seo_head()` | `string` (HTML) | The SEO meta block, for explicit placement. Calling it disables the implicit auto-injection. |

Plus three globals (set up in `bootstrap.php`):

| Helper | Purpose |
|--------|---------|
| `posts(array $args = [])` | Query the post index. See [posts() API](#posts-api). |
| `render(string $template, array $vars = [])` | Render a named template (PHP wins, Twig fallback). Used by `index.php` to dispatch routes. |
| `csrf_token()` | Current session's CSRF token (admin only). |

### Partial resolution order

`partial('header')` looks for these files inside the active theme's `templates/` (in order, first match wins):

1. `components/header.php`
2. `components/header.twig`
3. `components/header.html`
4. `_header.php`
5. `header.php`
6. `_header.twig`
7. `header.twig`
8. `_header.html`
9. `header.html`

`.twig` partials route through `TemplateRenderer`. PHP partials are `require`d with `$vars` extracted into local scope. `.html` partials are emitted verbatim (`$vars` ignored — static markup).

Convention: prefix shared layout chunks with `_` (`_header`, `_footer`). The leading underscore marks them as "not a user-selectable template" — the per-page template dropdown in the admin filters them out.

## Variables per route

### `post` / `page`

For URLs like `/blog/my-post` and `/about`.

| Variable | Type | Notes |
|----------|------|-------|
| `meta` | array | Front matter (`title`, `date`, `tags`, `categories`, `image`, `draft`, `excerpt`, `template`, plus any custom keys). |
| `html` | string | Rendered Markdown HTML. Already trusted — `<?= $html ?>` (PHP) or `{{ html\|raw }}` (Twig). |
| `route` | array | `{ type: 'post', path: 'blog/my-post', folder: 'blog' }`. |

### `archive`

For folder listings (`/blog`, `/blog/page/2`).

| Variable | Type | Notes |
|----------|------|-------|
| `folder` | string | The folder slug. |
| `items` / `posts` | array | This page's posts (already sliced). `posts` is an alias. Each post has front matter flattened up to the top level — `post.image`, `post.tags`, etc. Canonical fields (`url`, `title`, `date`, `slug`, `folder`, `path`, `mtime`, `draft`) win over same-named meta keys. |
| `folders` | string[] | Every content folder slug — useful for filter tabs. |
| `intro` | array \| null | The folder's `_index.md` parsed (`{ meta, body, html }`), or `null`. |
| `page` | int | Current page number, 1-indexed. |
| `total_pages` | int | Total number of pages. |
| `per_page` | int | Posts per page. Resolves from `_index.md:posts_per_page`, then `site/config.json:posts_per_page`, then 10. |

### `taxonomy`

For `/tags/<slug>`, `/categories/<slug>`, with optional `/page/<n>`.

| Variable | Type | Notes |
|----------|------|-------|
| `taxonomy` | `'tags'` \| `'categories'` \| custom | Which taxonomy. |
| `term` | string | The URL slug (`'php'`). |
| `label` | string | Original cased term — use for the page title (`"PHP"`). |
| `items` / `posts` | array | Same shape as `archive`. |
| `page`, `total_pages`, `per_page` | int | Same as `archive`. |

### `feed`

Atom feed at `/feed` and `/<folder>/feed`.

| Variable | Type | Notes |
|----------|------|-------|
| `site_name`, `title` | string | Title strings. |
| `site_url`, `feed_url` | string | Absolute URLs. |
| `updated` | int | Unix timestamp of the most recent included item. |
| `items` | array | Up to 20 most recent posts; each has `absolute_url` pre-computed. |

### `404`

| Variable | Type | Notes |
|----------|------|-------|
| `url` | string | The path that didn't resolve. |

## posts() API

`posts()` is the front-end query helper. Reads the index, filters, sorts, paginates, returns a plain array.

```php
function posts(array $args = []): array
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `folder` | string | — | Limit to one content folder. |
| `filter` | array | `[]` | Key/value pairs matched against canonical fields and meta. Scalars compare with `===`; if the post's value is an array (tags, categories), `in_array` is used. |
| `orderby` | string | `'date'` | `date`, `title`, or any meta key. |
| `order` | string | `'desc'` | `'desc'` or `'asc'`. |
| `limit` | int | `0` | Max posts (`0` = all). |
| `offset` | int | `0` | Skip N. |

Drafts are excluded by default.

```php
$recent     = posts(['folder' => 'blog', 'limit' => 3]);
$az         = posts(['folder' => 'tutorials', 'orderby' => 'title', 'order' => 'asc']);
$featured   = posts(['filter' => ['featured' => true], 'limit' => 6]);
$phpPosts   = posts(['filter' => ['tags' => 'PHP']]);
$page2      = posts(['folder' => 'blog', 'limit' => 10, 'offset' => 10]);
```

**Gotcha:** custom filter keys must go inside `filter`, not at the top level. `posts(['featured' => true])` does **not** filter — `featured` is silently ignored.

## Per-page template override

Add `template:` to front matter:

```yaml
---
title: Special landing
template: landing
---
```

Resolution rules (`ThemeService::resolveTemplate()`):

- Looks up `templates/landing.php`, then `templates/landing.twig`.
- Excludes partials (`_*`) and route-bound templates (`archive`, `taxonomy`, `feed`, `404`).
- Validated server-side; unknown names return 400 on save.

## Twig specifics

- Compiled templates land in `site/cache/twig/`. `auto_reload: true` in dev, so editing `.twig` picks up on next request.
- Cache invalidation: theme switch and admin **Cache → Clear all** both clear via `CacheService::clearTwig()`.
- Autoescape: `html` mode. `{{ html|raw }}` to emit pre-rendered Markdown HTML.
- Globals: `config` (full site config array). `partial()`, `paginate()` are registered with `is_safe: ['html']`, so their output is not re-escaped.

## PHP specifics

- No autoescape — call `e()` on every interpolation. Exceptions: `$html` (rendered Markdown) and `$intro['html']`, pre-trusted.
- `extract($vars, EXTR_SKIP)` runs in `render()` — your variables don't clobber globals.
- The output-buffer layout pattern still works (`ob_start()` → set `$content_body` → `require '_layout.php'`); the starters use `partial('header')` / `partial('footer')` instead, simpler.

## Loop via front matter

Pages can embed a post loop without a custom template using the `loop:` key:

```yaml
---
title: Home
loop:
  folder: blog
  orderby: date
  order: desc
  limit: 5
---
```

Keys mirror `posts()`. The loop renders below the page body as a simple `<section>` of linked titles. For richer markup, drop `loop:` and switch to a custom template.
