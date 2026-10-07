import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';

const PRESETS = [
  { label: 'S', title: 'Small', pct: 33 },
  { label: 'M', title: 'Medium', pct: 66 },
  { label: 'L', title: 'Large', pct: 100 }
];
const MIN_PX = 80;
const SNAP_PX = 8;

const MORE_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
);

export function ResizableImageView({ node, updateAttributes, selected, editor, deleteNode }: NodeViewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [altPopover, setAltPopover] = useState<{ x: number; y: number } | null>(null);
  const [altDraft, setAltDraft] = useState('');
  const [lightbox, setLightbox] = useState(false);

  const widthPct: number = Number(node.attrs.width) || 100;
  const align: string = node.attrs.align ?? 'center';
  const wrapOn: boolean = node.attrs.float !== false;
  const alt: string = (node.attrs.alt as string) ?? '';
  const editable = editor?.isEditable ?? true;

  // Esc deselects / closes lightbox; [ and ] step through S/M/L (guide §7)
  useEffect(() => {
    if (!selected) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (lightbox && event.key === 'Escape') {
        event.preventDefault();
        setLightbox(false);
        return;
      }
      if (event.key === 'Escape') {
        (event.target as HTMLElement)?.blur?.();
        return;
      }
      if (event.key === '[' || event.key === ']') {
        const order = PRESETS.map((p) => p.pct);
        const currentIdx = order.reduce((best, pct, i) => (Math.abs(pct - widthPct) < Math.abs(order[best]! - widthPct) ? i : best), 0);
        const nextIdx = Math.max(0, Math.min(order.length - 1, currentIdx + (event.key === ']' ? 1 : -1)));
        updateAttributes({ width: order[nextIdx]! });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, widthPct, lightbox, updateAttributes]);

  // Keep an empty paragraph after a trailing floated image so there's always
  // somewhere to click and type beside it.
  useEffect(() => {
    if (!editor || align === 'center' || !wrapOn) return;
    const doc = editor.state.doc;
    if (doc.lastChild?.type.name === 'image') {
      editor.commands.insertContentAt(doc.content.size, { type: 'paragraph' });
    }
  }, [editor, align, wrapOn, node.attrs.width]);

  // Corner-anchored resize (UpNote-style): the top-left edge stays put while
  // the width follows the pointer — DOM-only updates, one transaction on release.
  const onResizeDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const wrapper = frameRef.current?.parentElement;
    if (!wrapper || !wrapper.parentElement) return;
    const containerW = wrapper.parentElement.clientWidth || 1;
    const startW = wrapper.getBoundingClientRect().width;
    const startX = e.clientX;
    const pinnedLeft = wrapper.getBoundingClientRect().left - wrapper.parentElement.getBoundingClientRect().left;
    wrapper.classList.add('pin-left');
    wrapper.style.marginLeft = `${pinnedLeft}px`;

    const handle = e.currentTarget;
    try { handle.setPointerCapture(e.pointerId); } catch { /* pointer may be inactive (e.g. synthetic events) */ }
    setDragging(true);

    let raf = 0;
    let nextW = startW;

    const move = (ev: PointerEvent) => {
      let w = startW + (ev.clientX - startX);
      w = Math.max(MIN_PX, Math.min(containerW, w));
      if (!ev.altKey) {
        const hit = PRESETS.map((p) => (containerW * p.pct) / 100).find((s) => Math.abs(s - w) < SNAP_PX);
        if (hit) w = hit;
      }
      nextW = w;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          wrapper.style.width = `${nextW}px`;
          if (badgeRef.current) badgeRef.current.textContent = `${Math.round(nextW)} px`;
        });
      }
    };

    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      cancelAnimationFrame(raf);
      wrapper.classList.remove('pin-left');
      wrapper.style.marginLeft = '';
      wrapper.style.width = ''; // let the attribute drive it again
      setDragging(false);
      const pct = Math.round((nextW / containerW) * 1000) / 10;
      // Corner anchoring persists: the image keeps the left edge it was
      // dragged from instead of snapping back to center.
      updateAttributes({ width: pct, align: 'left' }); // single transaction = single undo
    };

    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  const copyImage = async () => {
    try {
      const blob = await (await fetch(node.attrs.src as string)).blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]);
    } catch {
      alert('Could not copy the image to the clipboard.');
    }
  };

  const downloadImage = () => {
    const anchor = document.createElement('a');
    anchor.href = node.attrs.src as string;
    anchor.download = alt.replace(/[^\w\-. ]+/g, '') || 'image.png';
    anchor.click();
  };

  const saveAlt = () => {
    updateAttributes({ alt: altDraft.trim() });
    setAltPopover(null);
  };

  const menuItems: ContextMenuItem[] = [
    { label: 'View full size', run: () => setLightbox(true) },
    {
      label: 'Align',
      children: [
        { label: 'Left', active: align === 'left', run: () => updateAttributes({ align: 'left' }) },
        { label: 'Center', active: align === 'center', run: () => updateAttributes({ align: 'center' }) },
        { label: 'Right', active: align === 'right', run: () => updateAttributes({ align: 'right' }) }
      ]
    },
    { label: 'Wrap text', active: wrapOn, run: () => updateAttributes({ float: !wrapOn }) },
    { label: 'Alt text…', run: () => { if (menuPos) { setAltDraft(alt); setAltPopover(menuPos); setMenuPos(null); } } },
    { label: 'Copy image', run: () => void copyImage() },
    { label: 'Download', run: downloadImage },
    { separator: true, label: '' },
    { label: 'Delete', danger: true, run: () => deleteNode() }
  ];

  return (
    <NodeViewWrapper
      className={`img-node${dragging ? ' pin-left' : ''}`}
      data-align={align}
      data-float={String(wrapOn)}
      style={{ width: `${widthPct}%` }}
    >
      <div
        ref={frameRef}
        className={`img-frame${selected ? ' is-selected' : ''}${dragging ? ' is-resizing' : ''}`}
        onContextMenu={(event) => {
          if (!editable) return;
          event.preventDefault();
          event.stopPropagation();
          setMenuPos({ x: event.clientX, y: event.clientY });
        }}
      >
        <img
          src={node.attrs.src as string}
          alt={alt}
          draggable={false}
          onClick={(event) => {
            if (event.detail === 2) setLightbox(true);
          }}
        />

        {editable && (
          <button
            type="button"
            className="embed-tool embed-tool--menu"
            title="Image options"
            aria-label="Image options"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
            }}
          >
            {MORE_SVG}
          </button>
        )}

        {editable && selected && <span ref={badgeRef} className="img-badge" />}

        {editable && (
          <span
            className="img-resize-zone"
            title="Drag to resize"
            aria-label="Resize image"
            onPointerDown={onResizeDown}
            onClick={(event) => event.stopPropagation()}
          />
        )}

        {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} items={menuItems} onClose={() => setMenuPos(null)} />}

        {altPopover && (
          <div
            className="fixed z-[60] w-[280px] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-3 shadow-lg"
            style={{ left: Math.max(8, Math.min(altPopover.x - 140, window.innerWidth - 296)), top: Math.min(altPopover.y, window.innerHeight - 170) }}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 text-[12px] font-semibold text-[var(--ink)]">Alt text</p>
            <input
              autoFocus
              value={altDraft}
              onChange={(event) => setAltDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') saveAlt(); if (event.key === 'Escape') setAltPopover(null); }}
              placeholder="Describe the image"
              className="mb-2.5 h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2.5 text-[13px] text-[var(--ink)] outline-none focus:border-[var(--brand)]"
            />
            <div className="flex items-center justify-between">
              {alt ? (
                <button type="button" className="rounded px-1.5 py-1 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => { updateAttributes({ alt: null }); setAltPopover(null); }}>
                  Remove
                </button>
              ) : <span />}
              <div className="flex items-center gap-1.5">
                <button type="button" className="rounded px-2 py-1 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" onClick={() => setAltPopover(null)}>
                  Cancel
                </button>
                <button type="button" className="rounded-md bg-primary-600 px-2.5 py-1 text-[12px] font-semibold text-[var(--on-brand)] hover:bg-primary-700" onClick={saveAlt}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-8"
            onClick={() => setLightbox(false)}
            role="dialog"
            aria-label="Image viewer"
          >
            <img src={node.attrs.src as string} alt={alt} className="max-h-full max-w-full rounded-lg" onClick={(event) => event.stopPropagation()} />
            <button
              type="button"
              aria-label="Close viewer"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              onClick={() => setLightbox(false)}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
            </button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default ResizableImageView;
