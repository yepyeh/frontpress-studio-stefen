# Fields and taxonomies

**Settings → Manage fields** configures the structured metadata each page carries — beyond just `title` / `date`. Two built-in taxonomies (**tags**, **categories**) always exist; you add more.

The framework calls these top-level groups **taxonomies** and the metadata inside them **fields**. Each field's `name` is the front-matter key. The field's value gets written to the page's YAML on save.

## Shape on disk

Configured taxonomies live in `site/config.json` under `taxonomies`:

```json
{
  "taxonomies": {
    "tags":       { "label": "Tags",       "post_types": [],       "fields": [] },
    "categories": { "label": "Categories", "post_types": [],       "fields": [] },
    "series": {
      "label": "Series",
      "post_types": ["blog"],
      "fields": [
        {
          "name": "series",
          "type": "array",
          "widget": "select",
          "items": ["WordPress", "Tailwind", "Performance"],
          "multiple": false,
          "hidden": false
        },
        {
          "name": "series_part",
          "type": "single",
          "value": "",
          "hidden": false
        }
      ]
    }
  }
}
```

Edit this directly if you prefer, or use the **Manage fields** screen — same result.

## Taxonomy properties

| Property | Type | Notes |
|----------|------|-------|
| `label` | string | Display name shown in the editor sidebar group header. |
| `slug` (object key) | string | URL slug — taxonomies become routes at `/<slug>/<term>`. Rename via the **Slug** input on the Fields screen. |
| `post_types` | string[] | Folders this taxonomy applies to. Empty array = applies to all. |
| `fields` | array | Sub-fields — see below. |

`tags` and `categories` are special: they always exist, are always available on every folder (post_types is irrelevant for them in the editor — the **Tags** / **Categories** inputs render unconditionally), and they back the public-side taxonomy routes (`/tags/<x>`, `/categories/<x>`).

## Field types

Two types — `single` and `array`. Use the **Type** dropdown on each subfield row to switch.

### `single`

A free-text field. Renders as a one-line `<input>` in the sidebar.

| Property | Type | Notes |
|----------|------|-------|
| `name` | string | Front-matter key. The value the user types ends up at `meta[name]`. |
| `type` | `"single"` | |
| `value` | string | Default — pre-fills the input when creating a new page in a matching folder. |
| `hidden` | bool | When `true`, suppresses the field from the sidebar UI but keeps its config. The page's existing value (if any) is preserved on save. Useful for fields you populate programmatically. |

### `array`

A list of pre-defined choices. Three widget variants:

| Property | Type | Notes |
|----------|------|-------|
| `name` | string | Front-matter key. |
| `type` | `"array"` | |
| `items` | string[] | The available choices, one per line in the textarea. |
| `widget` | `"select"` \| `"checkbox"` \| `"radio"` | How the picker renders. |
| `multiple` | bool | If `true`, the user can pick multiple items — value is written as a YAML list. If `false`, single choice — value is a single string. |
| `hidden` | bool | Same semantics as for `single`. |

Widget semantics:

- **`select`** — dropdown. `<select>` if `multiple: false`, `<select multiple>` if `true`.
- **`checkbox`** — list of checkboxes. Forces `multiple: true` regardless of the flag.
- **`radio`** — radio button group. Forces `multiple: false` regardless of the flag.

## Reading fields in templates

Fields are flattened into the page's `meta` — they show up alongside the built-ins:

```yaml
---
title: WordPress Block Theme Without Editing JSON
date: 2026-04-22
tags: [winden, json]
categories: [tutorials]
series: WordPress
series_part: 3
featured: true
---
```

```twig
{# Single post (post.twig) #}
<h1>{{ meta.title }}</h1>
{% if meta.series %}
  <p class="kicker">{{ meta.series }} — part {{ meta.series_part }}</p>
{% endif %}

{# Archive lists (archive.twig) — meta keys are flattened up to the post object #}
{% for post in posts %}
  {{ post.title }} — {{ post.series|default('') }}
{% endfor %}
```

For `array` fields with `multiple: true`, the value is a list:

```twig
{% if post.tags is iterable %}
  {% for tag in post.tags %}
    <a href="/tags/{{ tag|lower|url_encode }}">{{ tag }}</a>
  {% endfor %}
{% endif %}
```

## Querying by field value

`posts()` filters compare scalars with `===` and check `in_array` for array values:

```php
// "show me featured posts"
$featured = posts(['filter' => ['featured' => true], 'limit' => 6]);

// "show me posts in the WordPress series"
$wp = posts(['filter' => ['series' => 'WordPress']]);

// "show me posts tagged 'winden'" — tags is an array on each post,
// so this triggers the in_array branch
$tagged = posts(['filter' => ['tags' => 'winden']]);
```

**Gotcha**: custom filter keys must go inside `filter`, not at the top level. `posts(['series' => 'WordPress'])` is **silently ignored** — only the documented top-level keys (`folder`, `orderby`, `order`, `limit`, `offset`, `filter`) are respected.

## How the editor sidebar renders fields

Order in the sidebar:

1. **Title** input (always top).
2. **Save / Preview** buttons.
3. **Slug** input.
4. **Featured image** — bound to `meta.image`.
5. **Status** (Live / Draft) → writes `meta.draft`.
6. **Template** — per-page override → writes `meta.template`.
7. **Tags** (always shown).
8. **Categories** (always shown).
9. Each additional taxonomy whose `post_types` matches the page's folder (or whose `post_types` is empty). Within each taxonomy, fields render top to bottom in their configured order. Fields with `hidden: true` are skipped.

The active page's folder is what gates `post_types` matching. A `series` taxonomy with `post_types: ["blog"]` only shows on pages under `blog/`; on pages under `pages/`, it doesn't appear at all (but the front-matter value, if any, is preserved on save).

## Renaming and reordering

- **Rename a taxonomy** — change its `Slug`. The `/tags/foo` style URL changes immediately. Existing pages keep their YAML keys; if your YAML uses the old key, search-and-replace across `site/content/` or accept that those pages no longer surface in the taxonomy archive.
- **Rename a sub-field** — change its `Name`. The front-matter key changes for new saves but old pages still carry the old key. Migration is manual.
- **Reorder fields** — drag rows up/down in the sidebar. The order is persisted in `site/config.json`.

## Removing a field

The **trash icon** on each row deletes that subfield from config. **Existing pages keep their YAML value** — removing a field config doesn't strip values from `.md` files. If you want them gone, delete the keys with a one-liner:

```bash
# Strip `series:` from every .md under site/content/
find site/content -name '*.md' -exec sed -i '' '/^series:/d' {} \;
```

(Test first. Take a backup.)

## "Hide from sidebar" — programmatic fields

A field with `hidden: true` is configured but never rendered in the editor. Use this pattern for fields you populate from automation:

```yaml
---
title: My Post
last_indexed_at: 2026-05-17T12:00:00Z   # populated by your indexing script
fetch_count: 0                          # populated by a hit-counter
---
```

…where `last_indexed_at` and `fetch_count` are configured fields with `hidden: true`. Save the page in the admin → the values survive. The editor sidebar stays clean.

## Built-in taxonomies' archive routes

`tags` and `categories` are wired to the public router. Visiting `/tags/php` resolves a page to `templates/taxonomy.twig` with:

| Variable | Value |
|----------|-------|
| `taxonomy` | `'tags'` |
| `term` | `'php'` (URL slug) |
| `label` | `'PHP'` (original cased term) |
| `posts` / `items` | matching posts |
| `page`, `total_pages`, `per_page` | pagination |

Custom taxonomies you create (`series`, etc.) are **not** auto-routed — they're metadata only. If you want a `/series/wordpress` archive, add a route in `index.php` that delegates to `templates/taxonomy.twig` with the right `$vars`. See [Extending → Custom routes](../advanced/extending.md#custom-routes).

## Slugification

Term-to-URL slugifying uses `FrontPress\Index::slugify()`:

- Lowercase.
- Spaces and `/` → `-`.
- Strip non-alphanumeric (except `-`).
- Collapse repeated `-`.

So `"News Flash"` → `news-flash`, `"PHP & friends"` → `php-friends`. The `slug_url($term)` helper does this for you when building taxonomy links from templates.
