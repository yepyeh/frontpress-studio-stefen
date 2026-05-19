import { useEffect, useRef, useState } from 'react';

/**
 * Two-pane layout with a draggable handle between them.
 *
 *   <VerticalResizer storageKey="theme-builder-split" direction="column">
 *     <TopPane />
 *     <BottomPane />
 *   </VerticalResizer>
 *
 * `direction` matches flex-direction semantics:
 *   - 'column' (default) → panes stacked top/bottom, handle is horizontal,
 *     drag moves vertically. The component name made sense when this
 *     was the only mode.
 *   - 'row' → panes side-by-side, handle is vertical, drag moves
 *     horizontally.
 *
 * Pointer events with capture keep the cursor glued to the handle when
 * crossing an iframe or other event-stealing child; both panes get
 * `pointer-events: none` during drag as belt-and-braces.
 *
 * Arrow keys nudge by 2% so the split is keyboard-reachable.
 * `storageKey` persists the current split percentage in localStorage.
 */
export default function VerticalResizer({
  children,
  storageKey,
  direction = 'column',
  defaultFirst = 50,
  minFirst = 20,
  maxFirst = 80,
}) {
  const containerRef = useRef(null);
  const draggingRef = useRef(false);
  const [firstPct, setFirstPct] = useState(
    () => readStored(storageKey, direction, defaultFirst, minFirst, maxFirst),
  );
  const [active, setActive] = useState(false);

  // Re-read when direction changes — we store percentages per-direction
  // because the optimal split sizes are usually different (you might
  // want 60/40 stacked but 40/60 side-by-side).
  useEffect(() => {
    setFirstPct(readStored(storageKey, direction, defaultFirst, minFirst, maxFirst));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storedKey(storageKey, direction), String(firstPct)); } catch (_) {}
  }, [storageKey, direction, firstPct]);

  function update(clientX, clientY) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = direction === 'row'
      ? ((clientX - rect.left) / rect.width) * 100
      : ((clientY - rect.top)  / rect.height) * 100;
    setFirstPct(Math.max(minFirst, Math.min(maxFirst, pct)));
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    setActive(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function onPointerMove(e) {
    if (!draggingRef.current) return;
    update(e.clientX, e.clientY);
  }
  function onPointerUp(e) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setActive(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  function onKeyDown(e) {
    const dec = direction === 'row' ? 'ArrowLeft'  : 'ArrowUp';
    const inc = direction === 'row' ? 'ArrowRight' : 'ArrowDown';
    let next = firstPct;
    if (e.key === dec)             next = firstPct - 2;
    else if (e.key === inc)        next = firstPct + 2;
    else if (e.key === 'PageUp')   next = firstPct - 10;
    else if (e.key === 'PageDown') next = firstPct + 10;
    else if (e.key === 'Home')     next = minFirst;
    else if (e.key === 'End')      next = maxFirst;
    else return;
    e.preventDefault();
    setFirstPct(Math.max(minFirst, Math.min(maxFirst, next)));
  }

  const [first, second] = Array.isArray(children) ? children : [children, null];
  const template = `${firstPct}% 6px 1fr`;
  const containerClass = `grid min-h-0 min-w-0 flex-1`;
  const containerStyle = direction === 'row'
    ? { gridTemplateColumns: template }
    : { gridTemplateRows: template };
  const handleClass = direction === 'row' ? 'cursor-col-resize' : 'cursor-row-resize';
  const handleBorders = direction === 'row' ? 'border-x' : 'border-y';

  return (
    <section
      ref={containerRef}
      className={containerClass}
      style={containerStyle}
    >
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={active ? { pointerEvents: 'none' } : undefined}
      >
        {first}
      </div>
      <div
        role="separator"
        aria-orientation={direction === 'row' ? 'vertical' : 'horizontal'}
        aria-valuenow={Math.round(firstPct)}
        aria-valuemin={minFirst}
        aria-valuemax={maxFirst}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={`${handleClass} ${handleBorders} border-zinc-200 transition-colors focus:outline-none focus:bg-blue-200 ${
          active ? 'bg-blue-400' : 'bg-zinc-100 hover:bg-zinc-200'
        }`}
      />
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={active ? { pointerEvents: 'none' } : undefined}
      >
        {second}
      </div>
    </section>
  );
}

// Per-direction keys so column-mode and row-mode splits don't clobber
// each other when the user toggles between layouts.
function storedKey(key, direction) {
  return `${key}:${direction}`;
}

function readStored(key, direction, fallback, min, max) {
  if (!key) return fallback;
  try {
    const raw = localStorage.getItem(storedKey(key, direction));
    if (!raw) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < min || n > max) return fallback;
    return n;
  } catch (_) {
    return fallback;
  }
}
