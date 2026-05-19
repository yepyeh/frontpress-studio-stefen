# Theme Builder internals

How the visual editing surface works under the hood. For the user-facing reference, see [Theme Builder feature](../features/theme-builder.md).

## Three components

### 1. The block parser (`src/lib/themeBuilderBlocks.js`)

Walks a Twig (or PHP / HTML) source string and emits a tree of blocks for the outline. Three kinds of nodes:

- **marker** — explicit author intent: `{# fp:block id="..." type="..." label="..." #} … {# /fp:block #}`. These are first-class, editable, reorderable.
- **code** — Twig control flow (`{% for %}`, `{% if %}`). Visible in the outline as structure; not directly mouse-editable.
- **html** — HTML elements matching the curated visual tag set (article, section, div, header, main, nav, h1–h6, li, ul, ol, p, blockquote, a, button, img, figure, table, …). Same read-only role as `code`.

Backed by a character-stream tokenizer (`themeBuilderTokenizer.js`) that's quote-aware. It handles:

- Multi-line opening tags (`<div\n  class="x">`).
- Multiple elements on one line (`{% if x %}<p>…</p>{% endif %}` — the `<p>` nests inside the condition).
- `>` inside attribute values (`<a title="1>2">`).
- HTML comments and self-closing / void tags.

The token stream is then run through a stack walker. Marker / code / html each track their own nesting on the stack, so `</div>` can't accidentally close `{% if %}`.

### 2. The preview marker bridge (`bootstrap.php` + `cms/lib/template_helpers.php`)

When the public-site render receives `?fp_admin_preview=1` *and* the request has a valid admin session, the renderer wraps output with HTML comments identifying the source file:

- `render()` wraps the whole rendered body with `<!--fp:src:templates/<route>.twig:start-->` / `:end`.
- `partial()` wraps each partial's output with `<!--fp:src:templates/<partial>.twig:start-->` / `:end`.

The route template renders inside the layout chain, so the comment tree mirrors the source's nesting:

```
<!--fp:src:templates/archive.twig:start-->
<!doctype html>
<html>
  <head>...</head>
  <body>
    <div class="container">
      <!--fp:src:templates/_header.twig:start-->
      <header>...</header>
      <!--fp:src:templates/_header.twig:end-->
      <main>
        <h1>Blog</h1>
        ...
      </main>
      <!--fp:src:templates/_footer.twig:start-->
      <footer>...</footer>
      <!--fp:src:templates/_footer.twig:end-->
    </div>
  </body>
</html>
<!--fp:src:templates/archive.twig:end-->
```

A small click-handler script is also appended near `</body>`. On click it:

1. Walks up the DOM (balancing nested markers — a sibling region's `:end` is skipped past via its matching `:start`).
2. Computes the click target's *tag* and *occurrence* — how many same-tag visual elements that share the source file appear before this one in document order.
3. `postMessage`s the parent: `{ type: 'fp:select', path, tag, occurrence }`.

Non-structural targets (`<a>`, `<span>`, `<img>` outside `<figure>`) walk up to their nearest *visual* ancestor first so the outline always has something to highlight.

### 3. The Theme Builder screen (`src/screens/ThemeBuilder.jsx`)

A `useEffect` listens for `window.message` events of type `fp:select`. Flow:

- If the path matches an editable file in the current theme:
  - **Same file open** → resolve `(tag, occurrence)` against the current block tree via `findElementByTag(blocks, tag, occurrence)` → `setSelectedBlockId(match.id)`. The outline highlights it; the code editor jumps + selects via `focusLine`.
  - **Different file** → queue the selection (`pendingSelection` state), `setPath()` to switch files. When the new draft arrives, a second `useEffect` resolves the queued selection against the freshly-parsed tree.

`findElementByTag` does a depth-first walk and counts `html`-source blocks with the matching tag.

## Self-contained partials matter

The marker mechanism works correctly only when each partial's output is well-formed (closes every tag it opens). The bundled `blank-twig` does this via Twig inheritance:

- `_layout.twig` owns the full `<!doctype>` → `</html>` chrome and wraps `{% block content %}` inside `<main>`.
- `_header.twig` is just `<header>...</header>`.
- `_footer.twig` is just `<footer>...</footer>`.
- Route templates `{% extends '_layout.twig' %}` and define `{% block content %}`.

The failure mode if a partial opens tags without closing them: the browser's HTML parser engulfs the partial's `:end` marker inside the unclosed element. For example, an old-style `_header.twig` that outputs `<!doctype>`, `<html>`, `<head>`, `<body>`, `<div>`, `<header>`, `<nav>`, `<main>` (without closing them) — the `:end` marker lands inside the unclosed `<main>` as its first child. Walking up from a click on `<h1>` inside `<main>` finds `_header.twig:start` first, so every click maps to `_header.twig`.

Refactor split partials to layout inheritance to fix this. The `blank-twig` starter has the right shape; copy from it.

## Auth gating

The preview chrome is **only** emitted when the request has `$_SESSION['admin_user']` set. A drive-by visitor hitting the same URL with `?fp_admin_preview=1` gets a normal render — no markers, no script.

The session check happens in `bootstrap.php`'s `render()`:

```php
$previewMode = !empty($_GET['fp_admin_preview']) && !empty($GLOBALS['admin_logged_in']);
$GLOBALS['fp_template_preview'] = $previewMode;
```

`$GLOBALS['admin_logged_in']` is set in `index.php` from `!empty($_SESSION['admin_user'])`. Public requests' `session_start()` already runs before bootstrap, so the cookie is available.

## Marker convention for theme authors

You can author your own `fp:block` markers in templates. They don't affect the rendered output (Twig comments are stripped) but they appear as **first-class, editable blocks** in the outline.

```twig
{# fp:block id="hero" type="section" label="Hero" #}
<section class="hero">
  <h1>{{ meta.title }}</h1>
</section>
{# /fp:block #}
```

The outline shows `Hero (section)` with a "marker" tone, and the **+ Add section** button on the outline can insert another one. Marker blocks are the only nodes drag-and-drop reorders — code / html blocks are read-only from the UI.

For nested markers, the parser supports arbitrary depth — `{# fp:block id="parent" #}` containing other `{# fp:block id="child" #}` blocks. The stack walker pairs them by source position.

## File-level vs line-level mapping

Today the marker bridge resolves clicks to a **file** (path) and an **element** (tag + occurrence within that file). It doesn't carry exact source line numbers across the network — the client parses the source to find the line.

This works because:

1. The parser is fast (sub-millisecond on typical templates).
2. Per-file line numbers stay consistent across renders.
3. Avoids server-side template instrumentation (which would require a custom Twig loader, breaking cache compatibility).

If you need finer granularity (e.g. line numbers for content inside `{% for %}` loops, which all map to the same source line per iteration), you'd need a pre-render template transform that emits per-iteration `data-fp-line` attributes. Not implemented; PRs welcome.

## CSS

A subtle dashed outline on `*:hover` is injected by the preview script so the user can tell elements are clickable:

```css
*:hover {
  outline: 1px dashed rgba(59, 130, 246, .4);
  outline-offset: 1px;
  cursor: crosshair;
}
```

This is added to `document.head` via `style.textContent =` rather than the page's stylesheet, so it doesn't leak into normal browsing.
