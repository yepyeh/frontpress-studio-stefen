---
title: Extending
layout: default
---

# Extending

## Add a new collection

Create a folder under `site/content/` and drop `.md` files in. It immediately gets a `/<folder>` archive, `/<folder>/<slug>` post routes, `/<folder>/feed`, and pagination. No registration step.

Optionally add `_index.md` inside the folder to customise the archive (intro text, title, `posts_per_page:` override). The `_index.md` itself is never listed as a post.

## Add front-matter fields

Any key you add to a post's YAML block is:

- Available as `meta.<key>` in templates.
- Indexed and filterable: `posts(['filter' => ['featured' => true]])`.
- Shown / editable in the admin sidebar if registered as a sub-field under a taxonomy in **Settings → Manage fields**.

## Custom templates

Two ways to use a non-default template for a post:

**Per-post (recommended).** Add `template:` to front matter:

```yaml
---
title: A landing page
template: landing
---
```

Then create `site/themes/<active>/templates/landing.twig` (or `landing.php`). The admin editor sidebar exposes the same choice as a **Template** dropdown — populated from `ThemeService::listTemplates()`. Partials (filenames starting with `_`) and route-bound templates (`archive`, `taxonomy`, `feed`, `404`) are excluded.

**Per-folder.** Conventionally, all posts in `content/products/*.md` get rendered through the active theme's `post.twig`. To diverge, either:

1. Set `template:` on each post in that folder, or
2. Customise the public renderer at `index.php` to switch on `$route['folder']` before calling `render()`.

The first option is normal usage; the second is for forks.

## Add a taxonomy

Edit `site/config.json` (or use **Settings** in the admin):

```json
"taxonomies": {
  "tags": {
    "label": "Tags",
    "post_types": ["blog", "tutorials"],
    "fields": [
      {
        "name": "tags",
        "type": "array",
        "widget": "checkbox",
        "multiple": true,
        "items": ["gsap", "php", "css"]
      }
    ]
  }
}
```

- `post_types` scopes the taxonomy to specific content folders — controls which folders show the field in the editor sidebar.
- `fields` defines the editor controls. The field's `name` is the front-matter key it writes to.
- Tags / categories automatically get archive URLs at `/<taxonomy>/<slug>` and pagination at `/<taxonomy>/<slug>/page/<n>`.

See [Templates → Filtering by tags / categories](templates.md#filtering-by-tags--categories) for templating these archives.

## Add a template helper

Drop a function into `cms/lib/template_helpers.php`:

```php
if (!function_exists('reading_time')) {
    function reading_time(string $body, int $wpm = 220): string
    {
        $words = str_word_count(strip_tags($body));
        $mins  = max(1, (int)ceil($words / $wpm));
        return $mins . ' min read';
    }
}
```

To make it available in Twig too, register it in `cms/lib/TemplateRenderer.php`:

```php
foreach (['e', 'asset_url', 'slug_url', 'reading_time'] as $fn) {
    $this->twig->addFunction(new TwigFunction($fn, $fn));
}
```

Use:

```twig
<span>{{ reading_time(html) }}</span>
```

```php
<?= e(reading_time($html)) ?>
```

## Hook into the index

`FrontPress\Index` is exposed at `$GLOBALS['fp_index']`. Use it for custom queries that go beyond `posts()`:

- `$index->get($includeDrafts = false)` — full index keyed by relative path.
- `$index->filter($criteria, $includeDrafts = false)` — multi-key filter (scalars compare with `===`, arrays use `in_array`).
- `$index->findByTaxonomyTerm($taxonomy, $slug)` — slug-matched lookup (`{posts: [], label: ?string}`).

See [Templates → Filtering by tags / categories](templates.md#filtering-by-tags--categories) for examples.
