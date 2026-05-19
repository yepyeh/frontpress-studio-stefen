# API reference

Every admin operation is a JSON endpoint under `/admin/api/`. Routed by `cms/lib/Api/Router.php` to one of the controllers in `cms/lib/Api/`.

## Conventions

- All requests use JSON bodies (`Content-Type: application/json`).
- Responses are JSON: `{ ok: true, ... }` on success, `{ ok: false, error: '<message>' }` on failure.
- State-changing requests (`POST`, `PUT`, `DELETE`) require a CSRF token in the `X-CSRF-Token` header. Fetch the current token from `GET /admin/api/me`.
- Auth: a session cookie set by `POST /admin/api/login` (`HttpOnly`, `SameSite=Strict`).
- Status codes: 200 for success (regardless of `ok` truth value in the body), 400 for validation errors, 401 for missing auth, 403 for CSRF failure, 404 for unknown actions, 405 for wrong HTTP method.

## Auth

### `GET /admin/api/me`

Anonymous; returns the current auth state + a fresh CSRF token. Called once on SPA bootstrap.

```json
{
  "ok": true,
  "authenticated": true,
  "user": "fpsadmin",
  "csrf": "<token>",
  "passwordIsDefault": false
}
```

### `POST /admin/api/login`

```json
{ "username": "...", "password": "..." }
```

Returns the user + CSRF on success. 401 on bad credentials (doesn't distinguish bad username from bad password — prevents user enumeration).

### `POST /admin/api/logout`

Destroys the session. No body required.

### `POST /admin/api/password`

Authenticated + CSRF. Rotates the admin password.

```json
{ "current": "...", "next": "..." }
```

Rejects when `next` < 8 chars or `next` is the literal `admin` / `fpspass`. Atomically rewrites `config.php`.

## Pages

### `GET /admin/api/pages`

List pages. Query params:

- `folder` (string, optional) — filter to one folder.
- `q` (string, optional) — substring search across title + body.
- `limit` (int, default 100), `offset` (int, default 0).

Response:

```json
{
  "ok": true,
  "pages": [
    {
      "path": "blog/my-post",
      "url":  "/blog/my-post",
      "title": "My Post",
      "date": "2026-05-17",
      "draft": false,
      "folder": "blog",
      "slug": "my-post",
      "meta": { ... },
      "mtime": 1747498800
    }
  ],
  "total": 42
}
```

### `GET /admin/api/pages/<path>`

Single page contents.

```json
{
  "ok": true,
  "path": "blog/my-post",
  "meta": { ... },
  "body": "Markdown body source...",
  "html": "<p>Rendered HTML...</p>"
}
```

### `POST /admin/api/pages`

Create a page. Body:

```json
{
  "path": "blog/my-new-post",
  "title": "My New Post",
  "body": "Markdown content...",
  "status": "published",
  "template": "",
  "taxonomies": { "tags": ["php"], "categories": ["news"] }
}
```

### `PUT /admin/api/pages/<path>`

Update. Same body shape as POST. `path` in the body, if different from the URL, triggers a rename.

### `DELETE /admin/api/pages/<path>`

Soft-delete to `site/cache/trash/`. Returns `{ ok: true, token: '<undo-token>' }`. The token is valid for 30 days.

### `POST /admin/api/pages-restore`

```json
{ "token": "..." }
```

Restore a soft-deleted page.

### `GET /admin/api/pages-export?folder=blog`

ZIP download of every page in the folder.

### `POST /admin/api/pages-import`

Multipart form-data ZIP upload. Restores pages by path (overwrites existing).

## Media

### `GET /admin/api/media`

Query params: `pagePath` (optional — list per-post; omit to list global), `q` (search).

### `POST /admin/api/media`

Multipart upload. Fields: `file` (binary), `pagePath` (optional). Returns the new file's URL and metadata.

### `DELETE /admin/api/media`

Body: `{ url: "/uploads/cover.jpg" }`. Deletes the file + thumbnail + sidecar.

### `PUT /admin/api/media`

Update `alt` / `caption` in the sidecar. Body: `{ url, alt, caption }`.

## Themes

### `GET /admin/api/themes`

```json
{
  "ok": true,
  "themes":   [ { slug, name, engine, version, ... }, ... ],
  "active":   "blank",
  "starters": [ { slug, name, engine, description }, ... ]
}
```

### `GET /admin/api/themes/templates`

User-selectable templates in the active theme. Excludes partials + system templates (archive, taxonomy, feed, 404).

### `GET /admin/api/themes/files?theme=<slug>`

List editable files in a theme.

```json
{
  "ok": true,
  "theme": "blank",
  "active": "blank",
  "files": [
    { "path": "templates/post.twig", "name": "post.twig", "kind": "template", "language": "twig", "size": 412 },
    { "path": "assets/style.css",    "name": "style.css", "kind": "asset",    "language": "css",  "size": 2103 }
  ]
}
```

### `GET /admin/api/themes/file?theme=<slug>&path=<rel>`

Read one editable file. `path` is the relative path returned by the files endpoint.

```json
{ "ok": true, "path": "templates/post.twig", "content": "..." }
```

### `POST /admin/api/themes/file`

Write one file. Authenticated + CSRF.

```json
{ "theme": "blank", "path": "templates/post.twig", "content": "..." }
```

Validates `path` is editable, writes atomically (rename-aside), clears caches.

### `POST /admin/api/themes/activate`

`{ slug }`. Activates the theme; clears caches; re-symlinks `assets/`.

### `POST /admin/api/themes/install`

`{ starter, theme_slug }`. Copies a starter into `site/themes/<theme_slug>`. `theme_slug` defaults to the starter name.

### `POST /admin/api/themes/replace`

`{ starter, theme_slug }`. Re-installs a starter over an existing theme (preserves the slug). Used for the "reset to starter" workflow.

### `POST /admin/api/themes/delete`

`{ slug }`. Soft-delete to trash. Refuses if the slug is the active theme.

### `GET /admin/api/themes/download?slug=<slug>`

ZIP download of a theme.

### `POST /admin/api/themes/upload`

Multipart form-data ZIP upload. Validates with `ThemeArchiver`, installs (new slug) or replaces (matching slug).

## Settings

### `GET /admin/api/settings`

Returns the parsed `site/config.json`.

### `PUT /admin/api/settings`

Body: the full config object. Validated, then atomically written.

## Backup

### `GET /admin/api/backup/full`

Streams a ZIP of everything under `site/` except cache + trash.

### `GET /admin/api/backup/content`

`site/content/` only.

### `GET /admin/api/backup/settings`

`site/config.json` + active-theme slug.

### `POST /admin/api/backup/restore`

Multipart form-data ZIP upload + form fields:

- `scope`: `full` / `content` / `settings`
- `mode`: `replace` / `merge`

## Search

### `GET /admin/api/search?q=<query>&limit=20`

Full-text search across all pages (title + body). Returns `{ pages: [...], total }` with the same shape as `pages` list.

## Cache

### `POST /admin/api/cache/clear`

Body: `{ scope: "all" | "html" | "twig" | "index" }`. Clears the requested cache scope.

## Updates

### `GET /admin/api/update/check`

Fetches the latest release from `api.github.com` and compares against `cms/VERSION`. Returns the new version + changelog excerpt if newer.

### `POST /admin/api/update/install`

Body: `{ version }`. Downloads the matching release ZIP, verifies SHA-256, atomic-replaces framework files. Returns `{ ok: true, version: "new" }` on success.

## Audit

### `GET /admin/api/audit/login`

The last 50 login attempts (success + failure) from `site/cache/audit.json`. Used by the Security screen.
