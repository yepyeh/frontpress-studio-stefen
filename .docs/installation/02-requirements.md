# Requirements

## PHP

- **PHP 8.1 or newer.** The codebase uses readonly properties, enums, never-return types, and string functions like `str_contains` that are 8.1+.
- Built-in extensions you can usually assume are present on any host: `json`, `mbstring`, `fileinfo`, `dom`, `zip`, `gd` (for image thumbnails). Most shared hosts ship these by default.
- `session` support (every commodity host).

If your host doesn't show the PHP version, drop a `phpinfo.php` with `<?php phpinfo();` into the webroot, hit it once, then delete it.

## Web server

- **Apache** with `mod_rewrite` enabled. The shipped `.htaccess` does the route rewriting; no extra config needed.
- **nginx** with the equivalent location rewrites — example config:

  ```nginx
  location / {
      try_files $uri $uri/ /index.php?$query_string;
  }
  location /admin/api/ {
      try_files $uri /admin.php?$query_string;
  }
  location /admin/ {
      try_files $uri /admin.php?$query_string;
  }
  ```

- LiteSpeed / OpenLiteSpeed honour `.htaccess` directly.

## Filesystem

The webroot must be writable by the PHP process for:

- `config.php` — rewritten when the admin password is hashed for the first time.
- `site/` — content, uploads, theme installs, cache.

Typical permissions on shared hosting: `755` directories, `644` files, owner = the PHP user. Most one-click installers get this right by default.

## Browser (admin)

Anything evergreen: Chrome / Firefox / Safari / Edge from the last two years. The admin uses ES2022, CSS grid, `fetch`, modern dialog elements.

The Theme Builder loads the Monaco code editor from a CDN (`cdn.jsdelivr.net`), so the admin needs network access on first load. See [Theme Builder feature](../features/theme-builder.md) if you need to mirror it locally for air-gapped installs.

## Composer (source installs only)

Only required if you're cloning the source repo rather than unzipping a release. Releases ship `cms/vendor/` already populated.

```bash
composer install --working-dir=cms
```

## Node + npm (admin development only)

Only required if you want to modify the React admin. Releases ship `admin/assets/` pre-built.

```bash
cd src && npm install && npm run build
```

Node 20 LTS or newer.
