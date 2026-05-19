# Media library

Two pools, same code path:

- **Global media** — `site/uploads/`. Shared across all posts.
- **Per-post media** — `site/content/<folder>/<slug>/`. Lives next to the `.md` file, deleted when the post is deleted.

## Global media

Sidebar → **Global media**. The grid shows every file in `site/uploads/` with a preview, file size, and dimensions for images. Drop new files anywhere in the grid (or click the empty dropzone) to upload.

Each file has a sidecar `.meta.json` next to it for **alt text** and **caption**. Edit those by clicking a thumbnail.

Allowed types: **JPG · PNG · GIF · WebP · SVG · PDF · ZIP**. Other extensions are rejected at upload.

Size limit: `uploads.max_mb` in `site/config.json` (default 10 MB). Lift it under **Settings → Site** if you need to.

## Per-post uploads

In the page editor:

1. Click the **Files** tab in the editor surface toggle (only visible once the page is saved).
2. The dropzone takes any file; the list below shows what's already there.
3. Click an image to insert it into the body at the current cursor position.

These files are *attached to this post*. Deleting the post deletes the folder.

## Image insertion from the body

The editor toolbar's **Image** button opens a two-tab picker:

- **Library** — grid of every image in `site/uploads/` *and* every image in this post's per-post folder.
- **Upload** — drag-and-drop or click-to-pick. The new file auto-inserts into the body on success.

Drag-drop directly onto the editor surface (anywhere) also works — it uploads via the same path and inserts at the drop point.

## Image rendering on the public site

The starter themes apply these defaults:

```css
img, picture, video, svg { max-width: 100%; height: auto; display: block; }
article img { margin-inline: auto; margin-block: 1.5rem; border-radius: 6px; }
```

So images scale down to the column width without distortion. If you build your own theme, copy those rules into your stylesheet.

## URLs

- Global media: `/uploads/cover.jpg` → served from `site/uploads/cover.jpg`.
- Per-post: `/uploads/blog/my-post/diagram.png` → served from `site/content/blog/my-post/diagram.png`.

Both go through `index.php`'s `/uploads/*` handler, which:

1. Looks for the file under `site/content/` first (per-post bucket).
2. Falls back to `site/uploads/` (global bucket).
3. Rejects anything that isn't an allowed image / file type.
4. `realpath`-checks containment so `..` escapes can't reach files outside `site/`.

## Thumbnails

JPG/PNG/GIF/WebP get a 320×320 thumbnail generated at upload time. Stored at `<filename>-thumb.<ext>` next to the original. Used by the admin grid + the WYSIWYG editor's image picker for performance.

SVG and PDF are listed without thumbs (fast to render directly).

## Replace and delete

Click an image in the editor body to surface a small action menu:

- **Replace** — opens the picker; the next pick swaps the image's src in the markdown.
- **Delete** — removes the image from the body. The file itself stays on disk (delete it from the **Files** panel or **Global media** if you want it gone).

## Sidecar `.meta.json`

For `site/uploads/cover.jpg`:

```json
{
  "alt":     "Cover image — a sunset over the bay",
  "caption": "Photographed in Marin County, May 2026"
}
```

The editor populates these via the **Edit details** drawer on each thumbnail. Themes can read them via:

```twig
{# inside a custom helper or the SEO meta tags pipeline #}
```

The public renderer doesn't auto-inject the sidecar into image tags — it's a convention for themes that want richer alt / captions than the markdown image syntax provides.
