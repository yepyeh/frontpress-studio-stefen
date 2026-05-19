# Theme Builder

Sidebar → **Theme builder**. A four-pane editor for the active theme:

- **Header** — theme picker, file tabs, layout toggle, Save.
- **Structure outline** (left) — block tree parsed from the open file.
- **Live preview** (top right) — iframe rendering the public site with click-to-source bridge.
- **Code panel** (bottom) — Monaco editor with per-file syntax highlighting and an undo history per file.

## Opening a file

The file tabs at the top of the code panel list every editable file in the active theme — templates (`.twig` / `.php` / `.html`) and assets (`.css` / `.scss` / `.js`). Click one to open it. Switching files preserves the editor state for each (Monaco keeps a per-path model).

The auto-pick on first load is `templates/page.twig` if present, then any `.twig`, then any template, then the first file.

## The outline

The outline panel parses the open template's source into a tree of:

- **Twig control flow** — `{% if %}`, `{% for %}`, `{% block %}`, etc.
- **HTML elements** — every tag in a curated visual set (article, section, div, header, main, nav, h1–h6, li, ul, ol, p, blockquote, a, button, img, figure, table, …). Inline-only elements like `<span>` are skipped to keep the outline readable.

Each row shows the tag, an optional label, and the source line number. Clicking a row:

- Selects it.
- Scrolls the code editor to that line and selects the line.
- Highlights the corresponding rendered element in the preview (when the source-map bridge resolves it).

Drag a row to move that block in the source; drop indicators show before / inside / after. Cross-parent moves are supported.

## The live preview

The iframe loads the public site with `?fp_admin_preview=1` appended to the URL. Server-side, when this param is present **and** the request has an admin session, the renderer wraps each `partial()` call's output and the top-level template's output with `<!--fp:src:<path>:start-->` / `:end` HTML comments, and appends a click-handler script.

### Editable URL

The path input in the preview header shows what the iframe is loading. Type a different path → enter → iframe reloads. So when you're editing `post.twig`, you can preview an actual post (`/blog/some-post`).

The framework auto-picks a default URL when you switch files:

- `post.twig` → `/blog`
- `page.twig` → `/`
- `archive.twig` → `/blog`
- `taxonomy.twig` → `/categories/news`
- `feed.twig` → `/feed`
- `404.twig` → `/__fp_preview_404__` (any unknown path)
- partials, CSS, etc. → `/`

Your manual edits stick — auto-pick only fires until you type into the field.

### Click → jump to source

Click anything in the iframe:

1. The injected script walks up the DOM (balancing nested markers) to find the source file.
2. If the click target isn't a "visual" element (e.g. a `<span>`), it walks up to the nearest visual ancestor.
3. It also computes an *occurrence* — how many same-tag visual elements share this source file and appear before this one in document order.
4. `postMessage` parent: `{ type: 'fp:select', path, tag, occurrence }`.

The Theme Builder receives the message, opens the matching file (queuing the selection if a cross-file switch is needed), and resolves `(tag, occurrence)` to a specific source block. The outline highlights it, the code editor jumps + selects the line, and a pill in the preview header shows `<tag> / line N`.

A subtle dashed outline appears on hover in the iframe so you can tell elements are mappable.

### Why your theme structure matters

The click-to-source bridge depends on partials being **self-contained** — each partial's output should close every tag it opens. The bundled `blank-twig` does this via `_layout.twig` extending: `_header.twig` is just `<header>...</header>`, `_footer.twig` is just `<footer>...</footer>`, and the route templates use `{% extends '_layout.twig' %}` with `{% block content %}` inside `<main>`.

If you use the older split-partial pattern (`_header.twig` opens `<body>` and `<main>`, `_footer.twig` closes them), the browser parser engulfs the partial's end-marker inside the unclosed tags and clicks anywhere in main content map to `_header.twig`. Refactor to layout inheritance to fix it. See [Theme Builder internals](../advanced/theme-builder-internals.md) for the failure mode in detail.

## The code panel

Monaco editor, loaded from `cdn.jsdelivr.net/npm/monaco-editor@0.52.2` on first navigation. Per-file language is auto-detected from the extension:

| Extension | Monaco language |
|-----------|-----------------|
| `.twig`, `.html` | html |
| `.css`, `.scss` | css |
| `.js`, `.mjs` | javascript |
| `.ts` | typescript |
| `.json` | json |
| `.md` | markdown |
| `.php` | php |
| `.yml`, `.yaml` | yaml |

Each path gets its own Monaco model, so undo history is per-file.

### Save

- **⌘S** / **Ctrl+S** anywhere in the screen saves the open file. Cleared cache on save: HTML page cache + Twig compile cache.
- The header **Save changes** button is the same action with a click target.

Save errors surface as a red toast and an inline alert above the panel.

### Cursor → outline breadcrumb

The code panel surfaces a breadcrumb at the top showing the chain of ancestor blocks around the current cursor line — `<body> > <main> > <article> > <h1>`. Click any segment to jump the cursor / outline to that block.

## Add a section / Add a template

- **+ Add section** on the outline — inserts an `{# fp:block #}`-marked section snippet into the open file. Lands inside `{% block content %} … {% endblock %}` if present, otherwise above the closing `partial('footer')` call, otherwise at end of file.

- **+ New template** in the header — opens a dialog: name + extension (`.twig` or `.php`). Creates `templates/<name>.twig`, opens it in the panel.

## Layout

Two-pane vertical layout (preview on top, code on bottom) by default. The layout toggle in the header switches between *preview-on-top*, *code-on-top*, and *preview-only*. Drag the horizontal resizer between the two panes to change the split — your preference persists in `localStorage`.

## Air-gapped installs

Monaco loads from the CDN. If your admin can't reach `cdn.jsdelivr.net`:

1. Host the Monaco build yourself somewhere on your origin or LAN.
2. Edit `src/components/CodeEditor.jsx`:

   ```js
   loader.config({ paths: { vs: '/local/path/to/monaco/min/vs' } });
   ```

3. `npm run build` and ship the new bundle.

Or proxy `cdn.jsdelivr.net/npm/monaco-editor` through your own reverse proxy.
