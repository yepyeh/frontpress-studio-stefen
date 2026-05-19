# SCSS auto-compile

Optional pipeline. Off by default — the bundled starters ship a hand-authored `style.css`. Opt in by dropping a `style.scss` (or any `.scss`) into your active theme's `assets/`.

## Engine

[scssphp](https://scssphp.github.io/scssphp/) v2.x — pure-PHP Sass implementation. Pulled in via composer, vendored in `cms/vendor/`. **No Node, no `sass` binary, no build step.** Works on any host that runs PHP, including the cheapest shared hosting where you can't install a toolchain.

Output is minified (compressed) by default.

Tradeoff: scssphp implements a useful but partial subset of Sass. `@import`, `@mixin`, `@function`, control directives, and the standard math/color functions all work. **`@use` / `@forward`** (modern Sass module syntax) have limited support — if you're starting fresh, prefer `@import` for partials. Anything that compiles in scssphp 2.x compiles here.

## Two layout conventions

Both scanned automatically; mix-and-match within the same theme.

| Layout | Source | Output |
|--------|--------|--------|
| **Flat** | `assets/style.scss` | `assets/style.css` (sibling) |
| **Nested** | `assets/scss/style.scss` | `assets/css/style.css` |

Flat is simplest for small themes. Nested is useful when you want SCSS sources visibly separated from compiled output (`assets/scss/_tokens.scss`, `assets/scss/_forms.scss`, `assets/scss/style.scss` → `assets/css/style.css`).

Files whose basename starts with `_` (`_tokens.scss`, `_forms.scss`) are treated as **partials** — inlined by their importer, no standalone `.css` produced.

The entire `assets/` tree is added to scssphp's import paths, so `@import 'tokens';` resolves regardless of subfolder depth.

## When it runs

With `APP_ENV=dev` (the default), every **public-site** request runs `FrontPress\ScssCompiler::compileTheme()` for the active theme. The freshness check is the **newest mtime under the entire `assets/` tree** compared against each entry's compiled `.css` — touch any partial or import, every dependent entry recompiles.

Cheap on hot cache: one `RecursiveDirectoryIterator` walk + one `stat()` per entry. Typical overhead is sub-millisecond when nothing has changed.

**Admin requests don't trigger SCSS compile.** `admin.php` doesn't run `bootstrap.php`. To pick up an `.scss` edit, refresh the public site (`/`) once; the admin sees the new CSS on its next reload because both surfaces serve from the same `/assets/style.css`.

In `APP_ENV=prod`, the freshness check is skipped entirely. Compile never runs; deploy with `style.css` already built (visit `/` locally with `APP_ENV=dev` before zipping, or run your own SCSS pipeline).

To opt out entirely, delete the `.scss` files — the framework leaves your hand-authored `style.css` alone.

## Compile errors

A malformed `.scss` file logs to PHP's `error_log`:

```
FrontPress\ScssCompiler: failed compiling <path>: <message>
```

…and is skipped. The request still serves whatever `.css` is on disk, so a broken SCSS edit can't take down the public site. When CSS isn't updating as you expect, the PHP error log is the first place to look.

## Source maps

Not emitted. The bundled use case is "small themes, short stylesheets" — finding the source of a rule is fast enough without maps, and skipping them keeps the output minimal.

If you want source maps for development, run your own `sass` toolchain alongside the auto-compile — scssphp will leave `.css` files alone as long as their mtime is newer than the source.

## Custom compile targets

If you have entries other than `style.scss`, the auto-compiler picks them up automatically. Drop `print.scss` next to `style.scss` and you'll get `print.css` siblings; reference it from a template:

```twig
<link rel="stylesheet" href="{{ asset_url('print.css') }}" media="print">
```

The framework's only convention is "non-underscore-prefixed `.scss` files compile to same-named `.css`".
