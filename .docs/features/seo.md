# SEO

The framework auto-injects an SEO meta block into every HTML response. You don't have to touch your theme — by default, opening any page in a browser shows:

```html
<head>
  <!-- your theme's tags ... -->
  <!-- SEO injected by FrontPress\Seo -->
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://your-site.com/blog/some-post">
  <meta name="description" content="…from meta.description or settings default">
  <meta property="og:title" content="…">
  <meta property="og:description" content="…">
  <meta property="og:image" content="…">
  <meta property="og:url" content="…">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="…">
  <!-- /SEO -->
</head>
```

## Where the data comes from

For each meta tag, the resolution order is:

1. **Page front matter** (`meta.description`, `meta.canonical`, `meta.image`, `meta.og_image`, etc.)
2. **Site defaults** under **Settings → SEO**.
3. **Computed fallback**:
   - Title: `meta.title` + the configured suffix.
   - Description: the first ~160 chars of the page's body (stripped of markdown).
   - Canonical: the full URL derived from `site.url` + the route path.
   - OG image: the page's `meta.image` if set, otherwise the site default.

## Per-page overrides in front matter

```yaml
---
title: My First Post
meta_description: A 160-char custom description that overrides the auto-extract.
og_image: /uploads/social-card.jpg
twitter_card: summary_large_image
canonical: https://other-domain.com/canonical-here
robots: noindex,nofollow
---
```

Field names match the meta-tag suffixes — `meta_description`, `og_title`, `og_description`, `og_image`, `twitter_card`, `twitter_image`, `canonical`, `robots`.

## Manual placement with `seo_head()`

By default the framework auto-injects the SEO block before `</head>` — your theme doesn't have to call anything. But if you want the tags at an explicit position in your `<head>` (e.g. before a third-party analytics tag), call:

**Twig:**

```twig
<head>
  <meta charset="utf-8">
  {{ seo_head()|raw }}
  <script async src="https://...analytics..."></script>
</head>
```

**PHP:**

```php
<head>
  <meta charset="utf-8">
  <?= seo_head() ?>
  <script async src="https://...analytics..."></script>
</head>
```

Calling `seo_head()` once tells the framework to skip the implicit injection so you don't get duplicate tags.

## Feed-only pages

The auto-injector looks for `</head>` in the rendered body. Templates that don't produce HTML (`feed.twig` writes Atom XML and sets `Content-Type: application/atom+xml`) won't contain `</head>` and pass through untouched. Same for the rare PHP route that handles its own output directly.

## Disabling SEO for one page

Put `robots: noindex,nofollow` in the page's front matter, or set the site-wide robots default to `noindex,nofollow` under **Settings → SEO** (useful for staging copies).

To skip SEO injection entirely for one page, your template can call:

```php
\FrontPress\Seo::markEmittedThisRequest();
```

…before the body is generated. That suppresses both the implicit injection and any explicit `seo_head()`.

## Sitemap and robots.txt

There's no built-in `/sitemap.xml` generation today. The `/feed` Atom feed covers the "tell aggregators about new content" use case. If you need a Google-style XML sitemap, build it as a custom template (`templates/sitemap.twig`) and add a rewrite rule in `.htaccess` mapping `/sitemap.xml` → `/index.php?fp_route=sitemap`.

The framework does serve a static `robots.txt` from `site/` if you drop one there. Otherwise responses use whatever robots header the active page wants.
