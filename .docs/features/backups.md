# Backups

Sidebar → **Backup**.

## Three scopes

Each downloads as a single ZIP, named with the date and scope:

| Scope | What's inside |
|-------|---------------|
| **Full** | Everything under `site/` — content, uploads, themes, settings, cache. The complete site state at this moment. |
| **Content** | `site/content/` only. Markdown files + per-post attachments. Useful for migrating posts between installs. |
| **Settings** | `site/config.json` + the active theme's slug. Useful for replicating site config without copying content. |

Backups always exclude:

- `site/cache/` (regenerable; just dead weight in the archive).
- `cms/` and the framework entry-point PHP files (framework code, comes from the release zip).
- `config.php` (admin credentials — never bundled).
- Hidden files (`.DS_Store`, `.git*`, `.env*`).

The archive's top-level folder name is `site/`, so unzipping it next to your `index.php` puts files exactly where they belong.

## Restore

The Restore tab takes any ZIP produced by the Backup tab:

1. Drag a ZIP into the dropzone (or click to pick).
2. Pick **Replace** or **Merge**:
   - **Replace** wipes `site/` (or the matching subset) first, then extracts. Files in the current install that aren't in the backup disappear.
   - **Merge** extracts on top of the existing tree. Existing files are overwritten by the backup's version; files only present locally survive.
3. Click **Restore**. The framework atomically replaces files (rename-aside pattern). On any error mid-restore, the in-progress state is rolled back.

Restoring a **Settings** backup only writes to `site/config.json` + activates the named theme; nothing else is touched.

## What restore does NOT do

- It does **not** install missing themes. If your backup references theme `foo` and `site/themes/foo` is gone, the framework falls back to whatever theme is present. Re-install the theme separately (drag the theme zip onto the Themes screen, or use the same Restore flow on a backup that includes themes).
- It does **not** rotate the admin password. Credentials live in `config.php`, outside `site/`, and are never backed up.
- It does **not** wipe the trash (`site/cache/trash/`). Items there survive a restore.

## Automation

The backup endpoints are unauthenticated by *path* but require an admin session cookie. To pull a Full backup from cron:

```bash
# 1. Get a session cookie
curl -c /tmp/fp.cookies \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' \
  https://your-domain/admin/api/login

# 2. Download the Full backup
curl -b /tmp/fp.cookies \
  -o /backups/site-$(date +%F).zip \
  https://your-domain/admin/api/backup/full

# 3. Logout (optional, drops the server-side session)
curl -b /tmp/fp.cookies https://your-domain/admin/api/logout
```

If you'd rather not script the cookie dance, a plain `tar` of `site/` from the server side works equally well:

```bash
tar czf /backups/site-$(date +%F).tar.gz -C /path/to/webroot site
```

## Trash and undo

Deleted pages and themes go into `site/cache/trash/` for 30 days before permanent removal. The admin's delete actions surface a 10-second **Undo** toast that restores immediately.

Trash is excluded from backups. If you're rolling a backup forward across the 30-day window, deletes are final — there's no second chance once the trash sweep runs.

## Backup file format

The ZIP is plain — no custom headers, no encryption. Open it in any tool to inspect. The file shape:

```
site-2026-05-17.zip
└── site/
    ├── config.json
    ├── content/
    ├── themes/
    └── uploads/
```

Restore is a straight unzip operation; nothing about the archive depends on FrontPress Studio specifically. You can hand-edit the contents before restoring.
