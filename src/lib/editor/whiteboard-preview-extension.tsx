import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import WhiteboardPreview from '@/components/whiteboards/WhiteboardPreview';

const MORE_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
);
const RESIZE_SVG = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4h5v5M20 4l-6.5 6.5M9 20H4v-5M4 20l6.5-6.5" /></svg>
);

function WhiteboardNodeView({ node, updateAttributes, editor }: NodeViewProps) {
  const navigate = useNavigate();
  const boardId = node.attrs.boardId as string;
  const editable = editor?.isEditable ?? true;
  const frameRef = useRef<HTMLDivElement | null>(null);
  const badgeRef = useRef<HTMLSpanElement | null>(null);

  const widthPct = Number(node.attrs.width) || 100;

  // Resize grip — same corner-anchored feel as image resizing: the left edge
  // stays put while the width follows the pointer. DOM-only updates through
  // requestAnimationFrame, one transaction on release.
  const onHandleDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const frame = frameRef.current;
    if (!frame) return;
    const containerW = frame.parentElement?.clientWidth || 1;
    const startW = frame.getBoundingClientRect().width;
    const startX = event.clientX;
    const handle = event.currentTarget;
    try { handle.setPointerCapture(event.pointerId); } catch { /* pointer may be inactive (e.g. synthetic events) */ }

    let raf = 0;
    let nextPct = widthPct;
    const move = (ev: PointerEvent) => {
      const w = Math.max(120, Math.min(containerW, startW + ev.clientX - startX));
      nextPct = Math.round((w / containerW) * 1000) / 10;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          raf = 0;
          frame.style.width = `${w}px`;
          if (badgeRef.current) badgeRef.current.textContent = `${Math.round(w)} px`;
        });
      }
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      cancelAnimationFrame(raf);
      frame.style.width = '';
      updateAttributes({ width: nextPct });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  };

  // The editor pane owns whiteboard context menus (Open / Remove); a synthetic
  // right-click from the ·· button reuses that exact menu.
  const openMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom + 6
      })
    );
  };

  // ProseMirror's draggable node view swallows plain link clicks, so the
  // wrapper itself opens the board (the tools stop propagation).
  return (
    <NodeViewWrapper
      className="whiteboard-embed"
      style={{ width: `${widthPct}%`, maxWidth: '100%', cursor: 'pointer' }}
      onClick={() => navigate(`/whiteboards/${boardId}`)}
    >
      <div ref={frameRef} className="whiteboard-embed-frame">
        <WhiteboardPreview boardId={boardId} />
        {editable && <span ref={badgeRef} className="wb-badge" />}
        {editable && (
          <button
            type="button"
            className="embed-tool embed-tool--menu"
            title="Whiteboard options"
            aria-label="Whiteboard options"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={openMenu}
          >
            {MORE_SVG}
          </button>
        )}
        {editable && (
          <span
            className="embed-tool embed-tool--resize"
            title="Drag to resize"
            aria-label="Resize whiteboard"
            onPointerDown={onHandleDown}
            onClick={(event) => event.stopPropagation()}
          >
            {RESIZE_SVG}
          </span>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export const WhiteboardPreviewExtension = Node.create({
  name: 'whiteboardPreview',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      boardId: {
        default: '',
        parseHTML: element => element.getAttribute('data-whiteboard-id'),
        renderHTML: attributes => ({ 'data-whiteboard-id': attributes.boardId })
      },
      width: {
        default: 100,
        parseHTML: element => parseFloat(element.getAttribute('data-width') || '100'),
        renderHTML: attributes => ({ 'data-width': attributes.width })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-whiteboard-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardNodeView);
  }
});
