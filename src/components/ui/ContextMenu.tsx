import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  danger?: boolean;
  /** Marks the item with the active (brand) style, e.g. the current sort order. */
  active?: boolean;
  /** Small color circle rendered before the label (color pickers). */
  dot?: string;
  run?: () => void;
  separator?: boolean;
  /** Drill-down submenu (editor-style Insert Column ▸). */
  children?: ContextMenuItem[];
  /** Inline color swatch row (e.g. folder colors). */
  swatches?: Array<{ color: string; run: () => void }>;
}

/**
 * App-drawn right-click menu (UpNote-style). Rendered in a portal, clamped to
 * the window, closed by any click / Escape / scroll / resize. mousedown is
 * prevented so invoking an item never clears the editor's selection.
 * Items with `children` drill down in place; "Back" returns to the root.
 */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: ContextMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [subItems, setSubItems] = useState<{ parent: string; items: ContextMenuItem[] } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - rect.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))
    });
  }, [x, y]);

  useLayoutEffect(() => {
    const close = () => onClose();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('click', close);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const shown = subItems ? subItems.items : items;
  return createPortal(
    <div
      ref={ref}
      className="toolbar-menu"
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 90 }}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      {subItems && (
        <button
          type="button"
          onMouseDown={(event) => { if (event.button === 0) event.preventDefault(); }}
          onClick={(event) => { event.stopPropagation(); setSubItems(null); }}
        >
          <span className="text-[var(--brand)]">‹ {subItems.parent}</span>
        </button>
      )}
      {shown.map((item, index) =>
        item.separator ? (
          <div key={`sep-${index}`} className="menu-separator" />
        ) : item.swatches ? (
          <div key={`sw-${index}`} className="flex items-center justify-between gap-2 px-2 py-1.5">
            <span className="text-[12px] text-[var(--muted)]">{item.label}</span>
            <span className="flex items-center gap-1.5">
              {item.swatches.map((swatch) => (
                <button
                  key={swatch.color}
                  type="button"
                  aria-label={`${item.label} ${swatch.color}`}
                  title={swatch.color}
                  onMouseDown={(event) => { if (event.button === 0) event.preventDefault(); }}
                  onClick={(event) => {
                    event.stopPropagation();
                    swatch.run();
                    onClose();
                  }}
                  className="h-4.5 w-4.5 h-[18px] w-[18px] rounded-full border border-black/20 transition-transform hover:scale-110"
                  style={{ background: swatch.color }}
                />
              ))}
            </span>
          </div>
        ) : (
          <button
            key={`${item.label}-${index}`}
            type="button"
            className={`${item.active ? 'is-active ' : ''}${item.danger ? 'text-red-600 dark:text-red-400' : ''}`}
            onMouseDown={(event) => { if (event.button === 0) event.preventDefault(); }}
            onClick={(event) => {
              if (item.children?.length) {
                event.stopPropagation();
                setSubItems({ parent: item.label, items: item.children });
                return;
              }
              item.run?.();
              onClose();
            }}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.dot && <span className="mr-1.5 h-3 w-3 flex-none rounded-full border border-black/15" style={{ background: item.dot }} />}
            {item.shortcut && <span className="flex-none text-[11px] tabular-nums text-[var(--muted)]">{item.shortcut}</span>}
            {item.children?.length && <span className="flex-none text-[10px] text-[var(--muted)]">›</span>}
          </button>
        )
      )}
    </div>,
    document.body
  );
}

