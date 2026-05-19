# Pages and posts

All content is plain Markdown files under `site/content/`, organised in folders. Each folder is a "post type" — `blog/`, `pages/`, `docs/`, whatever you like. Files are addressable by their path: `site/content/blog/hello-world.md` → `/blog/hello-world`.

## Creating content

1. **Pages** (or whatever your sidebar calls a folder).
2. Pick a folder, or create one with **+ New folder**.
3. **Create your first page** → enter a title → start writing.

The editor has three surfaces (toggle in the toolbar above the editor area):

- **WYSIWYG** — rich-text Toast UI Editor. Best for most writing.
- **Markdown** — split view of raw markdown + preview.
- **HTML** — CodeMirror with syntax highlighting. Edits round-trip back through Toast UI's HTML→Markdown converter on save, so the file on disk is still markdown.

A fourth tab — **Files** — appears once the page is saved. It shows per-post attachments stored in `site/content/<folder>/<slug>/`. Drop images, PDFs, anything into the dropzone; they're addressable as relative URLs from the post body.

## Front matter

Every file starts with optional YAML front matter:

```markdown
---
title: My First Post
date: 2026-05-17
tags: [php, markdown]
categories: [news]
image: /uploads/cover.jpg
draft: false
excerpt: One-line summary that appears in archive lists.
---

# Body

Markdown content goes here.
```

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Falls back to filename if absent. |
| `date` | YYYY-MM-DD | Used for sorting + display. |
| `tags`, `categories` | array of strings | Free-form. Surface as archive routes at `/tags/<slug>` and `/categories/<slug>`. |
| `image` | URL or array | Featured image. Starter themes render it above the title. |
| `draft` | bool | `true` hides the post from the public site (still visible in admin). |
| `excerpt` | string | Shown in archive lists if present. |
| `template` | string | Override the route default — see [Per-page template](#per-page-template) below. |

Any other keys you add land in `meta` and are visible to templates as `{{ meta.your_key }}`.

## The sidebar — Save / Status / Slug / Template

When editing a page, the right-hand sidebar has:

- **Save** — `⌘S` shortcut. Saves to disk; the public URL reflects the new state immediately.
- **Preview** — opens the rendered page in a new tab.
- **Slug** — the URL fragment, auto-derived from the title until you edit it manually.
- **Status** — *Live* or *Draft*. Drafts are excluded from the public site and from `posts()` queries.
- **Featured image** — pick from the global media library or upload via the dropzone.
- **Template** — per-page override; defaults to the route type (`post.twig` for items in folders, `page.twig` for top-level pages). The dropdown only lists user-selectable templates (not `_partials`, `archive`, `taxonomy`, `feed`, `404`).
- **Delete** — soft delete with a 10-second Undo toast. The file moves to `site/cache/trash/`; restore re-creates it in place.

## Per-page template

Add `template: landing` to front matter to use `templates/landing.twig` (or `.php`) instead of the default `post.twig` / `page.twig`. The dropdown in the sidebar writes this field for you.

The template name must match a real, non-system template in the active theme. Unknown names return a 400 from `POST /admin/api/pages` rather than silently dropping the value.

## Taxonomies and custom fields

Two taxonomies are built in — **tags** and **categories** — and they always appear in the sidebar.

Add more under **Settings → Manage fields**:

1. **+ Add taxonomy** — create a new top-level field group (`Series`, `Featured`, whatever).
2. Configure **Applies to folders** to scope it to specific post types. Leave empty for all folders.
3. Add **sub-fields** — each sub-field's `Name` is the front-matter key.

Two field types:

- **Single value** — free-text input. Default value pre-fills new posts.
- **List of choices** — pick from a predefined set. Three widgets (dropdown / checkboxes / radios) and an **Allow multiple values** toggle for the dropdown variant.

Plus a **Hide from sidebar** toggle on every field — suppresses it from the editor UI while keeping its config (useful for fields you populate programmatically).

Full reference: [Fields and taxonomies](fields.md).

## The public side

Routes are inferred from filesystem layout:

- `site/content/<folder>/<slug>.md` → `/<folder>/<slug>` (uses `post.twig`).
- `site/content/<slug>.md` → `/<slug>` (uses `page.twig`).
- `/<folder>` → folder listing (uses `archive.twig`).
- `/<folder>/page/2` → second page of the archive.
- `/tags/<slug>`, `/categories/<slug>` → taxonomy archive (uses `taxonomy.twig`).
- `/feed`, `/<folder>/feed` → Atom feed (uses `feed.twig`).

A folder's `_index.md` (optional) provides an intro block + `posts_per_page` override for that folder's archive.

For the variables each route hands to templates, see [Templates](../advanced/templates.md).

## Importing / exporting

**Pages → ⋯ menu**:

- **Export** — downloads every page in the current folder as a ZIP of `.md` files.
- **Import** — drop a ZIP back to restore. Existing files with the same name are overwritten.

Useful for moving content between installs, or for editing offline in a different editor.
