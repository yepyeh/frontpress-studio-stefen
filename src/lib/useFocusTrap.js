import { useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusable(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Trap Tab/Shift+Tab inside `containerRef` while `active` is true, move
 * initial focus to the first focusable child (or to `initialFocusRef` if
 * provided), and restore focus to whatever was focused before activation
 * on cleanup. Pair with `role="dialog"` + `aria-modal="true"` for modals.
 */
export default function useFocusTrap(containerRef, active, initialFocusRef) {
  useEffect(() => {
    if (!active) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const previouslyFocused = document.activeElement;

    // Defer to next frame so children that focus themselves (e.g. autoFocus
    // on an input) win the race; only fall back if nothing inside took focus.
    const id = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      if (!container.contains(document.activeElement)) {
        focusable(container)[0]?.focus();
      }
    });

    function onKey(e) {
      if (e.key !== 'Tab') return;
      const items = focusable(container);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(id);
      container.removeEventListener('keydown', onKey);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [containerRef, active, initialFocusRef]);
}
