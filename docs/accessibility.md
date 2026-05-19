---
title: Accessibility
layout: default
---

# Accessibility

* TOC
{:toc}

A reference for the keyboard + screen-reader guarantees the admin SPA makes,
and where to look when extending it.

## Modal dialogs

`MediaPicker` and `ConfirmDialog` both meet the WAI-ARIA *modal dialog*
pattern:

- `role="dialog"` + `aria-modal="true"` on the dialog container.
- `aria-labelledby` points at the dialog's title (visually rendered or
  `sr-only`).
- **Focus trap** — Tab and Shift+Tab cycle inside the dialog; the page
  behind it is unreachable while the dialog is open.
- **Initial focus** — moves to the primary action (`ConfirmDialog`) or the
  first focusable element (`MediaPicker`) on open.
- **Focus restore** — focus returns to whatever was focused before the
  dialog opened on close.
- **Escape** and **backdrop click** both close the dialog.

Implementation: `src/lib/useFocusTrap.js` is the shared hook. Reuse it for
any new modal-style surface; pair with `role="dialog" aria-modal="true"`
and an `aria-labelledby` association.

## Alerts and live regions

`Alert` (`components/ui/Alert.jsx`) attaches the right ARIA role per tone:

| Tone     | Role     | aria-live  | Use for                          |
|----------|----------|------------|----------------------------------|
| error    | alert    | assertive  | Validation errors, failed writes |
| warning  | alert    | assertive  | Pre-action warnings              |
| success  | status   | polite     | Confirmation of completed action |
| info     | status   | polite     | Neutral context                  |

Override with the `role` prop if a particular alert should not be announced
(rare).

The media uploader (`MediaPickerUploadTab`) also includes a hidden
`role="status"` region that narrates "Uploading image…" → "Uploaded
*name*." so screen-reader users hear the same progress sighted users see in
the button label.

## Forms

`TaxonomyField` wraps each control in `role="group"` with `aria-labelledby`
pointing at the visible label, so the field label is announced as part of
the group rather than as a loose `<span>`. Free-form tag inputs
(`MultiTagsControl`) have a visible hint ("Separate values with commas.")
that is wired through `aria-describedby` — placeholders are never the only
hint.

When you add new form fields, follow the same pattern:

1. Wrap controls in `<label>` (`Field`) or `role="group" aria-labelledby`
   (multi-control groups).
2. Hint text goes below the input, not in the placeholder. Wire it via
   `aria-describedby`.
3. Errors render above the field, never below the submit button, and use
   `<Alert tone="error">` so they're announced.

## Editor surfaces

`EditorImageMenu` is a `role="toolbar"` (`aria-label="Image actions"`) that
appears above an image in the Toast UI WYSIWYG editor. When the toolbar
appears:

- Focus moves to **Replace image** (the first action).
- Tab moves to **Delete image**.
- Escape closes the toolbar and restores focus to whatever the editor had
  focused.

**Known gap.** The toolbar is surfaced by clicking an image. Pure-keyboard
discovery depends on the Toast UI image-selection flow, which is not fully
keyboard-navigable in WYSIWYG mode. Markdown mode is the keyboard-friendly
escape hatch for now — toggling to Markdown via the editor mode toggle
gives full keyboard control of image markup. Tracked alongside the broader
editor-a11y work.

## Media library tiles

The library tab renders tiles as a `<ul role="list">` of `<button>`s with
`aria-label="Choose <filename>"`. The inner `<img>` carries `alt=""` so the
filename isn't announced twice. The loading skeleton is wrapped in
`role="status" aria-label="Loading images"` so the wait is announced and
the inner skeleton tiles are `aria-hidden`.

## What to verify in a browser

The audit was performed by reading source; before shipping a related
change, verify in the browser:

- **VoiceOver** (macOS): every state change in the media picker
  (open/close/upload progress/success) is announced.
- **Keyboard only**: Tab through the full *create page → upload image →
  set as featured* flow without touching the mouse.
- **Escape** closes any open modal/toolbar and focus lands somewhere
  sensible (never on `<body>`).

Per the project rule in [feedback_test_before_done], a11y changes are not
"done" until they've been driven from a browser at least once.
