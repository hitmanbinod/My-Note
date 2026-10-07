import { useRef } from 'react';

/**
 * Column resize via edge dragging. During the drag the width is applied
 * directly as a CSS variable on <html> — zero React re-renders, zero lag.
 * The React state (and settings) are committed once on release.
 */
export function useDragResize(
  getWidth: () => number,
  setWidth: (width: number) => void,
  commit: (width: number) => void,
  min: number,
  max: number,
  varName: string,
  snap?: { below: number; to: number },
  tag?: string,
  resetTo?: number
) {
  const latest = useRef(getWidth);
  latest.current = getWidth;

  const onPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = latest.current();
    const clamp = (value: number) => Math.min(max, Math.max(min, value));
    const apply = (value: number) => {
      document.documentElement.style.setProperty(varName, `${value}px`);
    };

    document.body.classList.add('col-resizing');
    if (tag) document.body.dataset.resizing = tag;
    apply(clamp(startWidth));

    let finalWidth = clamp(startWidth);
    const move = (moveEvent: PointerEvent) => {
      finalWidth = clamp(startWidth + moveEvent.clientX - startX);
      apply(finalWidth);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('col-resizing');
      delete document.body.dataset.resizing;
      // Snapped panes (e.g. the icon rail) land on their exact width on release
      const committed = snap && finalWidth < snap.below ? snap.to : finalWidth;
      setWidth(committed);
      commit(committed);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onDoubleClick = () => {
    // Double-click returns the pane to its default width (min/max midpoint when none given)
    const reset = Math.round(resetTo ?? (min + max) / 2);
    setWidth(reset);
    commit(reset);
  };

  return { onPointerDown, onDoubleClick };
}
