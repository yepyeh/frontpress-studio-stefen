# Extending

Patterns for going beyond the bundled features. No formal plugin system — extension happens by editing template files, dropping in custom helpers, or working with the existing service classes.

## Custom front matter

Any key you add to a post's YAML block is:

- Available in templates as `meta.your_key`.
- Searchable via `posts(['filter' => ['your_key' => ...]])`.
- Surfaced in archive listings flattened up to the top level: `post.your_key`.

No registration needed. Edit a `.md` file, add the key, save:

```yaml
---
title: Hello
featured: true
reading_time: 5
authors: ["marko", "claude"]
---
```

In `archive.twig`:

```twig
{% for post in posts %}
  <article>
    <h2>{{ post.title }}</h2>
    {% if post.featured %}<span class="badge">⭐ Featured</span>{% endif %}
    <p>{{ post.reading_time }} min read</p>
  </article>
{% endfor %}
```

In a custom query:

```php
$featured = posts(['filter' => ['featured' => true], 'limit' => 6]);
```

To surface the field in the admin's sidebar editor for that post type, configure a taxonomy under **Settings → Manage fields** — see [Pages and posts → Taxonomies and custom fields](../features/pages-and-posts.md#taxonomies-and-custom-fields).

## Custom template helpers

`template_helpers.php` registers globals using `if (!function_exists(...))`. Adding your own is a matter of:

1. Create `site/themes/<active>/helpers.php` (or whatever name).
2. Define functions guarded the same way:

   ```php
   <?php
   if (!function_exists('reading_time')) {
       function reading_time(string $body): int {
           $words = str_word_count(strip_tags($body));
           return max(1, (int)round($words / 220));
       }
   }
   ```

3. `require_once` it from your `_layout.twig` parent (via PHP) or from a `_header.php` partial:

   ```php
   <?php require_once __DIR__ . '/helpers.php'; ?>
   ```

The helper is then available in any template:

```twig
<p>{{ reading_time(html) }} min read</p>
```

```php
<p><?= e(reading_time($html)) ?> min read</p>
```

### Registering with Twig explicitly

Twig only auto-discovers helpers that are listed in `TemplateRenderer::registerHelpers()`. If your helper isn't there, Twig won't see it as a function call.

Workaround: call the global as a regular PHP function inside a `{% set %}`:

```twig
{% set rt = attribute(_self, 'reading_time') is defined ? reading_time(html) : 0 %}
```

…or just use a PHP template (`post.php`) which has direct PHP access:

```php
<p><?= e(reading_time($html)) ?> min read</p>
```

For long-lived helpers, edit `cms/lib/TemplateRenderer.php` and add your function to the `addFunction` chain so Twig sees it natively. (But that file is overwritten by the next update — see [Updates](../installation/04-updates.md).)

## Custom routes

The public router is hand-coded in `index.php` (~60 lines). To add a new route shape (e.g. `/api/search.json` for an in-theme search endpoint), grep for `case 'post':` and add a sibling case.

Keep it simple — `index.php` is the only file that runs on public requests; you can mostly treat it as the "controller" for the public site.

For one-off endpoints, a cleaner approach is to drop a single PHP file at the webroot and add a rewrite in `.htaccess`:

```apache
RewriteRule ^api/search\.json$ /api-search.php [L]
```

…then write `api-search.php` as a standalone script that includes `bootstrap.php` and serves JSON.

## Hooks

There's no `add_action` / `do_action` system. The codebase is small enough that you can edit it directly, and updates overwrite framework code anyway.

That said, a few hooks are *implicit* via globals:

| Global | Set by | Read by |
|--------|--------|---------|
| `$GLOBALS['fp_template_dir']` | `bootstrap.php` on theme resolution | `partial()` |
| `$GLOBALS['fp_current_template']` | `render()` | `seo_head()`, `inject_seo()` |
| `$GLOBALS['fp_current_vars']` | `render()` | `seo_head()` |
| `$GLOBALS['fp_template_preview']` | `bootstrap.php` when `?fp_admin_preview=1` + admin session | `partial()`, `render()` for marker injection |
| `$GLOBALS['admin_logged_in']` | `index.php` | `admin_edit_button()` |

You can flip the preview flag inside a partial or template to enable/disable marker injection per-region; you can also stuff your own state into `$GLOBALS` and read it in another template. Not pretty, but it works.

## Custom block builder (don't)

The framework had a JSON-tree visual block builder at one point (`.fp.json` files + `BlockComposer`). It was removed in 0.0.70 — see the [changelog](../../docs/changelog.md) for why.

The short version: **the round-trip between a visual block tree and `.twig` / `.php` source is lossy**. Whitespace, comments, expression forms, and structural choices get rewritten on save. Keeping a separate `.fp.json` source alongside the canonical `.twig` was a worse split than expected.

If you want richer visual editing, the right path forward is to deepen the [Theme Builder](../features/theme-builder.md) rather than re-introducing a parallel format. The marker convention (`{# fp:block id="X" #}` … `{# /fp:block #}`) is reserved for that direction — you can add markers to your source today and the parser will surface them in the outline.

## Working with services

Most extension scenarios eventually need to call into the framework's services. Instantiate them directly — no DI container, no service locator.

```php
use FrontPress\Content;
use FrontPress\Index;
use FrontPress\Config;

$config  = new Config(__DIR__ . '/site/config.json');
$content = new Content(__DIR__ . '/site/content');
$index   = new Index($content, __DIR__ . '/site/cache/index.json');

$page = $content->load('blog/some-post');
$tag  = $index->findByTaxonomyTerm('tags', 'php');
```

From inside a public request, the bootstrap has already instantiated these:

```php
$config  = $GLOBALS['fp_config'];
$index   = $GLOBALS['fp_index'];
$content = $GLOBALS['fp_content'];
```

The interfaces are stable enough to script against — patching `cms/lib/*` is not, since it's overwritten on update.
