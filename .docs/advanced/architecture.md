# Architecture

Two layers, sharply separated.

## Public site (PHP)

Entry: `index.php`.

```
HTTP request
    │
    ▼
.htaccess   ── rewrites everything not in /admin/, /assets/, /uploads/ → index.php
    │
    ▼
index.php   ── session_start, route resolution, dispatch
    │
    ▼
bootstrap.php  ── autoload, helpers, render()
    │
    ▼
Active theme's templates/  ── Twig or PHP, your code
    │
    ▼
HTML out, plus SEO auto-injection
```

`index.php` is the only entry point for the public site. It:

1. Starts the session.
2. Loads bootstrap (autoload, env vars, services).
3. Builds the post index (cached in `site/cache/index.json`; rebuilt on content changes via mtime checks).
4. Resolves the URL to a route ('post', 'page', 'archive', 'taxonomy', 'feed', '404', or static asset).
5. Calls `render($template, $vars)`, which buffers the template's output, runs SEO injection, echos.

There is no router framework. The URL → route mapping is ~60 lines of pattern matching in `index.php`.

## Admin (PHP + React SPA)

Two halves:

### React SPA — `src/`

Built with Vite. Bundled into `admin/assets/`. Served by `admin.php` → `cms/templates/spa.php`, a tiny HTML shell that loads the built assets.

Stack:

- **React 18** + React Router 6
- **TanStack Query** for server state
- **Tailwind CSS v4**
- **Toast UI Editor** for the page editor (markdown + WYSIWYG + HTML)
- **Monaco Editor** (CDN-loaded) for the Theme Builder

The SPA owns all admin UI logic. It hits `/admin/api/*` for data.

### JSON API — `cms/lib/Api/`

Every admin operation is a JSON endpoint under `/admin/api/`. Entry point is `admin.php`, which:

1. Starts the session.
2. Routes via `cms/lib/Api/Router.php` to a controller (`PagesController`, `MediaController`, `ThemesController`, …).
3. Each controller validates auth, CSRF (on state-changing requests), then JSON-responds.

The full surface is documented in [API reference](api-reference.md).

## Session and auth

`session_set_cookie_params([HttpOnly, SameSite=Strict, Path=/])`, then `session_start()`. The admin login writes `$_SESSION['admin_user'] = '<configured username>'`. Every state-changing endpoint:

1. `Router::requireAuth()` — fails 401 if no admin user in session.
2. `Router::requireCsrf()` — fails 403 if the `X-CSRF-Token` header doesn't match the per-session token. The SPA fetches its token from `GET /admin/api/me` on bootstrap and threads it through every mutating request.

GET endpoints generally only require auth, not CSRF — they're idempotent.

## Data layout

```
site/
├── content/
│   └── <folder>/<slug>.md       — one file per page
│       └── <slug>/              — per-post attachments (lazy-created)
├── uploads/                      — global media library
├── themes/<active>/templates/    — what render() consumes
├── config.json                   — site settings (Settings → Site)
└── cache/
    ├── index.json                — flat index of all pages, rebuilt on mtime change
    ├── twig/                     — Twig compile cache
    ├── html/                     — full-page HTML cache (when enabled)
    └── trash/                    — soft-deleted pages and themes
```

No database. The index cache is a single JSON file written atomically on mtime change. `posts()` filters / sorts / paginates it in memory. For typical sites (a few hundred pages) this is instant; for many thousands the index could move to SQLite but hasn't needed to.

## Services and the `cms/lib/` namespace

All PHP code is namespaced `FrontPress\` (PSR-4 autoload, mapped in `cms/composer.json` to `cms/lib/`). Classes you'll likely encounter:

| Class | Job |
|-------|-----|
| `Content` | Markdown reader/writer. Front-matter parse, body rendering via `cebe/markdown`. |
| `Index` | Builds and queries the flat post index. `posts()` is a thin wrapper. |
| `ThemeService` | List, activate, install-from-starter, delete themes. |
| `ThemeArchiver` | Pack/unpack theme ZIPs with validation. |
| `ThemeFiles` | Safe read/write of editable theme files for the Theme Builder. |
| `TemplateRenderer` | Twig wrapper. Registers helpers as Twig functions. |
| `Seo` | Builds the meta tag block. Auto-injects before `</head>`. |
| `MediaService` | Upload pipeline, thumbnail generation, type validation. |
| `BackupService` | Pack/unpack site state into ZIPs. |
| `BackupRestorer` | Atomic restore via rename-aside. |
| `Env` | `.env` / `config.php` reader, password hash management. |
| `Config` | `site/config.json` reader/writer. |
| `CacheService` | HTML cache, Twig cache, index cache management. |

Controllers under `cms/lib/Api/` are thin glue — validate inputs, call a service, JSON-respond. Most are 50–150 lines.

## Static asset serving

Themes' `assets/` is symlinked into the webroot at `/assets/` on theme activation. Direct browser hits at `/assets/style.css` are served by the web server — PHP never touches them.

Same for `/uploads/*` — `index.php` handles these with a fast path that:

1. Validates the filename against an allow-list of extensions.
2. `realpath`-checks containment.
3. Streams the file with the right `Content-Type`.

Per-post media at `site/content/<folder>/<slug>/<file>` is also reachable via `/uploads/<folder>/<slug>/<file>`; the handler tries `site/content/` first, falls back to `site/uploads/`.

## What's *not* here

- No ORM. Content is files.
- No template framework abstraction. Twig is Twig.
- No build-time site generation. Every request is a live render. The HTML cache handles repeat-traffic perf.
- No queues, no workers, no background jobs. All work is request-scoped.
