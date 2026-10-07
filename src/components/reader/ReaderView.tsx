import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { Note } from '@/types';
import { readerAnnotations, type ReaderHighlightColor, type ReaderStroke } from '@/lib/reader/highlights';
import { MARK_COLORS } from '@/lib/theme/palette';
import TiptapEditor from '@/components/editor/TiptapEditor';

/**
 * Reader Mode (reader guide, phases 1–3): a note opens as a document, a folder
 * opens as an ordered chapter collection. Read-only rendering shares the same
 * source notes as the editor. Annotations are session-scoped: text highlights,
 * freehand pen strokes and sticky text notes over a normalized content box,
 * with eraser and per-note undo.
 */

const COLORS: ReaderHighlightColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'pink', 'purple', 'gray'];
const PEN_WIDTH = 2.5;

type ReaderTool = 'select' | 'pen' | 'highlight' | 'text' | 'eraser';

interface TextSlice {
  node: Text;
  start: number;
}

function collectTextNodes(root: HTMLElement): TextSlice[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const slices: TextSlice[] = [];
  let offset = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    slices.push({ node: current as Text, start: offset });
    offset += (current.textContent ?? '').length;
  }
  return slices;
}

function globalOffsets(range: Range, slices: TextSlice[]): { start: number; end: number } | null {
  let start = Number.POSITIVE_INFINITY;
  let end = Number.NEGATIVE_INFINITY;
  for (const slice of slices) {
    if (!range.intersectsNode(slice.node)) continue;
    const startInNode = range.startContainer === slice.node ? range.startOffset : 0;
    const endInNode = range.endContainer === slice.node ? range.endOffset : slice.node.data.length;
    start = Math.min(start, slice.start + startInNode);
    end = Math.max(end, slice.start + endInNode);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return { start, end: Math.max(start, end) };
}

function offsetFromPoint(root: HTMLElement, x: number, y: number): number | null {
  const doc = root.ownerDocument;
  let caret: { node: Text; offset: number } | null = null;
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos?.offsetNode instanceof Text) caret = { node: pos.offsetNode, offset: pos.offset };
  } else if (doc.caretRangeFromPoint) {
    const range = doc.caretRangeFromPoint(x, y);
    if (range?.startContainer instanceof Text) caret = { node: range.startContainer, offset: range.startOffset };
  }
  if (!caret) return null;
  const slices = collectTextNodes(root);
  const slice = slices.find((s) => s.node === caret!.node);
  return slice ? slice.start + caret.offset : null;
}

/** Distance from a point to a stroke's segments, in screen pixels. */
function strokeDistance(stroke: ReaderStroke, x: number, y: number, box: DOMRect): number {
  let min = Number.POSITIVE_INFINITY;
  const pts = stroke.points.map((p) => ({ x: box.left + p.x * box.width, y: box.top + p.y * box.height }));
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq));
    const px = a.x + t * dx, py = a.y + t * dy;
    min = Math.min(min, Math.hypot(x - px, y - py));
  }
  if (pts.length === 1) min = Math.min(min, Math.hypot(x - pts[0]!.x, y - pts[0]!.y));
  return min;
}

export function ReaderView({
  notes,
  startNoteId,
  variant = 'collection',
  folderId = null,
  onCreateNote,
  onClose
}: {
  notes: Note[];
  startNoteId?: string | null;
  /** 'collection' = folder chapter reader with sidebar; 'single' = pane reader beside the list. */
  variant?: 'collection' | 'single';
  folderId?: string | null;
  onCreateNote?: () => Promise<string | null>;
  onClose: () => void;
}) {
  const startIndex = Math.max(0, notes.findIndex((note) => note.id === startNoteId));
  const [chapterIndex, setChapterIndex] = useState(startIndex === -1 ? 0 : startIndex);
  const note = notes[chapterIndex];
  const noteId = note?.id ?? '';
  // Header shows the effective title (title or auto-title from first line),
  // truncated — never a body-content breadcrumb (guide §6).
  const chapterLabel = note
    ? note.title?.trim() || (note.plainTextContent || '').trim().split('\n')[0]?.slice(0, 60) || 'Untitled'
    : 'Untitled';

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [tool, setTool] = useState<ReaderTool>('select');
  const [penColor, setPenColor] = useState(MARK_COLORS[0]!.solid);
  const [hlColor, setHlColor] = useState<ReaderHighlightColor>('yellow');
  const [bubble, setBubble] = useState<{ x: number; y: number; start: number; end: number } | null>(null);
  const [headings, setHeadings] = useState<Array<{ level: number; text: string; pos: number }>>([]);
  const [marksTick, setMarksTick] = useState(0);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [pendingJumpId, setPendingJumpId] = useState<string | null>(null);

  const editorRef = useRef<Editor | null>(null);
  const paneRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const scrollPositions = useRef<Map<string, number>>(new Map());
  const activeStroke = useRef<ReaderStroke | null>(null);
  const livePolyline = useRef<SVGPolylineElement | null>(null);

  const refresh = useCallback(() => setMarksTick((tick) => tick + 1), []);
  useEffect(() => readerAnnotations.subscribe(refresh), [refresh]);

  // A newly created note becomes the current chapter once the list refreshes
  useEffect(() => {
    if (!pendingJumpId) return;
    const index = notes.findIndex((n) => n.id === pendingJumpId);
    if (index !== -1) {
      setChapterIndex(index);
      setPendingJumpId(null);
    }
  }, [notes, pendingJumpId]);

  const switchChapter = useCallback(
    (nextIndex: number) => {
      if (noteId && paneRef.current) scrollPositions.current.set(noteId, paneRef.current.scrollTop);
      setChapterIndex(Math.max(0, Math.min(notes.length - 1, nextIndex)));
      setBubble(null);
      setEditingTextId(null);
    },
    [noteId, notes.length]
  );

  useEffect(() => {
    const saved = noteId ? scrollPositions.current.get(noteId) : undefined;
    const frame = requestAnimationFrame(() => {
      if (paneRef.current) paneRef.current.scrollTop = saved ?? 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [noteId]);

  // Headings of the current chapter
  useEffect(() => {
    if (!editorRef.current || !noteId) {
      setHeadings([]);
      return;
    }
    const frame = requestAnimationFrame(() => {
      const items: Array<{ level: number; text: string; pos: number }> = [];
      editorRef.current!.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.childCount > 0) {
          items.push({ level: Number(node.attrs.level), text: node.textContent, pos });
        }
        return true;
      });
      setHeadings(items);
    });
    return () => cancelAnimationFrame(frame);
  }, [noteId, chapterIndex]);

  // Paint session highlights via the CSS Custom Highlight API
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || !noteId) return undefined;
    const paint = () => {
      const root = editor.view.dom as HTMLElement;
      const slices = collectTextNodes(root);
      const rangesByColor = new Map<ReaderHighlightColor, Range[]>();
      for (const mark of readerAnnotations.listMarks(noteId)) {
        for (const slice of slices) {
          const nodeEnd = slice.start + slice.node.data.length;
          if (nodeEnd <= mark.start || slice.start >= mark.end) continue;
          const range = document.createRange();
          range.setStart(slice.node, Math.max(0, mark.start - slice.start));
          range.setEnd(slice.node, Math.min(slice.node.data.length, mark.end - slice.start));
          const list = rangesByColor.get(mark.color) ?? [];
          list.push(range);
          rangesByColor.set(mark.color, list);
        }
      }
      for (const color of COLORS) {
        const key = `reader-hl-${color}`;
        const ranges = rangesByColor.get(color) ?? [];
        if (ranges.length) CSS.highlights.set(key, new Highlight(...ranges));
        else CSS.highlights.delete(key);
      }
    };
    const frame = requestAnimationFrame(paint);
    return () => {
      cancelAnimationFrame(frame);
      for (const color of COLORS) CSS.highlights.delete(`reader-hl-${color}`);
    };
  }, [noteId, headings, marksTick]);

  // ---- Highlighter tool: drag across text paints the mark in real time ----
  const hlAnchorRef = useRef<Range | null>(null);
  const hlLiveRangeRef = useRef<Range | null>(null);
  const hlLiveRef = useRef(false);

  const caretRangeAt = (x: number, y: number): Range | null => {
    const range = document.caretRangeFromPoint?.(x, y);
    return range ?? null;
  };

  const onPanePointerDown = (event: React.PointerEvent) => {
    if (tool !== 'highlight' || event.button !== 0) return;
    const anchor = caretRangeAt(event.clientX, event.clientY);
    if (!anchor) return;
    anchor.collapse(true);
    hlAnchorRef.current = anchor;
    hlLiveRangeRef.current = anchor.cloneRange();
    hlLiveRef.current = true;
    try { (event.currentTarget as Element).setPointerCapture(event.pointerId); } catch { /* inactive pointer */ }
  };

  const onPanePointerMove = (event: React.PointerEvent) => {
    if (tool !== 'highlight' || !hlLiveRef.current || !hlAnchorRef.current) return;
    const caret = caretRangeAt(event.clientX, event.clientY);
    if (!caret) return;
    caret.collapse(true);
    const live = document.createRange();
    if (caret.compareBoundaryPoints(Range.START_TO_START, hlAnchorRef.current) <= 0) {
      live.setStart(caret.startContainer, caret.startOffset);
      live.setEnd(hlAnchorRef.current.startContainer, hlAnchorRef.current.startOffset);
    } else {
      live.setStart(hlAnchorRef.current.startContainer, hlAnchorRef.current.startOffset);
      live.setEnd(caret.startContainer, caret.startOffset);
    }
    hlLiveRangeRef.current = live;
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      CSS.highlights.set('reader-hl-live', new Highlight(live));
    }
  };

  const finishHighlight = () => {
    if (!hlLiveRef.current) return;
    hlLiveRef.current = false;
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) CSS.highlights.delete('reader-hl-live');
    const live = hlLiveRangeRef.current;
    hlLiveRangeRef.current = null;
    const root = editorRef.current?.view.dom as HTMLElement | null;
    if (!live || live.collapsed || !root) return;
    const offsets = globalOffsets(live, collectTextNodes(root));
    if (!offsets || offsets.end - offsets.start < 2) return;
    readerAnnotations.addMark({ noteId, color: hlColor, start: offsets.start, end: offsets.end, text: '' });
    setMarksTick((tick) => tick + 1);
  };

  // Selection → highlight bubble (select tool only)
  const handlePointerUp = () => {
    if (tool !== 'select') {
      setBubble(null);
      return;
    }
    const selection = window.getSelection();
    const text = selection?.toString() ?? '';
    if (!selection || selection.isCollapsed || !text.trim() || !editorRef.current) {
      setBubble(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const root = editorRef.current.view.dom as HTMLElement;
    if (!root.contains(range.commonAncestorContainer)) {
      setBubble(null);
      return;
    }
    const offsets = globalOffsets(range, collectTextNodes(root));
    if (!offsets || offsets.end - offsets.start < 2) {
      setBubble(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    setBubble({ x: rect.left + rect.width / 2, y: rect.top, start: offsets.start, end: offsets.end });
  };

  const applyHighlight = (color: ReaderHighlightColor) => {
    if (!bubble || !noteId) return;
    readerAnnotations.addMark({ noteId, color, start: bubble.start, end: bubble.end, text: '' });
    window.getSelection()?.removeAllRanges();
    setBubble(null);
  };

  // ---- Pen drawing on the normalized overlay ----
  const overlayPoint = (event: { clientX: number; clientY: number }) => {
    const box = overlayRef.current?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)),
      y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
    };
  };

  const onOverlayPointerDown = (event: React.PointerEvent) => {
    if (tool !== 'pen' || event.button !== 0) return;
    const point = overlayPoint(event);
    if (!point) return;
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    activeStroke.current = { id: '', noteId, color: penColor, width: PEN_WIDTH, points: [point] };
    // Live polyline updated directly — no React render per sample (guide §4)
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', `${point.x * 100},${point.y * 100}`);
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', penColor);
    polyline.setAttribute('stroke-width', String(PEN_WIDTH));
    polyline.setAttribute('stroke-linecap', 'round');
    polyline.setAttribute('stroke-linejoin', 'round');
    polyline.setAttribute('vector-effect', 'non-scaling-stroke');
    overlayRef.current?.appendChild(polyline);
    livePolyline.current = polyline;
  };

  const onOverlayPointerMove = (event: React.PointerEvent) => {
    const stroke = activeStroke.current;
    if (!stroke || tool !== 'pen') return;
    const point = overlayPoint(event);
    if (!point) return;
    const last = stroke.points[stroke.points.length - 1]!;
    // Gentle distance filter: skip micro-jitter, keep the tip responsive
    if (Math.hypot(point.x - last.x, point.y - last.y) < 0.0015) return;
    stroke.points.push(point);
    livePolyline.current?.setAttribute('points', stroke.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' '));
  };

  const onOverlayPointerUp = () => {
    const stroke = activeStroke.current;
    if (!stroke) return;
    livePolyline.current?.remove();
    livePolyline.current = null;
    activeStroke.current = null;
    if (stroke.points.length > 1) readerAnnotations.addStroke(stroke);
  };

  const onOverlayClick = (event: React.MouseEvent) => {
    if (tool !== 'text' && tool !== 'eraser') return;
    const box = overlayRef.current?.getBoundingClientRect();
    if (!box) return;
    if (tool === 'text') {
      const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
      const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
      const id = readerAnnotations.addText({ noteId, x, y, text: '', color: 'yellow' });
      setEditingTextId(id);
      return;
    }
    // Eraser: nearest stroke within reach, or a text note under the pointer
    let bestStroke: string | null = null;
    let bestDistance = 12;
    for (const stroke of readerAnnotations.listStrokes(noteId)) {
      const distance = strokeDistance(stroke, event.clientX, event.clientY, box);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestStroke = stroke.id;
      }
    }
    if (bestStroke) {
      readerAnnotations.removeStroke(bestStroke, noteId);
      return;
    }
    const hitText = readerAnnotations.listTexts(noteId).find((t) => {
      const tx = box.left + t.x * box.width;
      const ty = box.top + t.y * box.height;
      return event.clientX >= tx - 8 && event.clientX <= tx + 192 && event.clientY >= ty - 8 && event.clientY <= ty + 64;
    });
    if (hitText) readerAnnotations.removeText(hitText.id, noteId);
    // Highlights: click anywhere within the highlighted text
    const root = editorRef.current?.view.dom as HTMLElement | null;
    const offset = root ? offsetFromPoint(root, event.clientX, event.clientY) : null;
    if (offset !== null) readerAnnotations.removeMarkAtOffset(noteId, offset);
  };

  const jumpToHeading = (pos: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
    const domAt = editor.view.domAtPos(pos + 1);
    const el = domAt.node instanceof Element ? domAt.node : domAt.node.parentElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const createNote = async () => {
    if (!onCreateNote) return;
    const id = await onCreateNote();
    if (id) setPendingJumpId(id);
  };

  // Keyboard shortcuts H/P/T/E outside text fields (guide §1)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const map: Record<string, ReaderTool> = { h: 'select', p: 'pen', t: 'text', e: 'eraser' };
      const next = map[event.key.toLowerCase()];
      if (next) setTool(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const chapterList = useMemo(
    () =>
      notes.map((n, index) => ({
        id: n.id,
        index,
        title: n.title?.trim() || (n.plainTextContent || '').trim().split('\n')[0]?.slice(0, 50) || 'Untitled'
      })),
    [notes]
  );

  const strokes = noteId ? readerAnnotations.listStrokes(noteId) : [];
  const textNotes = noteId ? readerAnnotations.listTexts(noteId) : [];

  if (!note) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <p className="text-[13px] text-[var(--muted)]">This notebook has no notes to read yet.</p>
        <button type="button" onClick={onClose} className="pressable rounded-md bg-primary-600 px-4 py-2 text-[13px] font-medium text-[var(--on-brand)] hover:bg-primary-700">Close reader</button>
      </div>
    );
  }

  const toolButton = (active: boolean) =>
    `pressable flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium ${active ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`;

  return (
    <div className="flex h-full min-h-0">
      {/* Contents sidebar — collection reader only */}
      {variant === 'collection' && sidebarOpen && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-none flex-col border-r border-[var(--line)] bg-[var(--panel)] lg:static lg:z-auto" data-testid="reader-sidebar">
          {chapterList.length > 0 && (
            <div className="flex max-h-[46%] min-h-0 flex-none flex-col overflow-hidden px-2 pb-1 pt-4">
              <p className="eyebrow mb-1 flex-none px-2 text-[var(--muted)]">Chapters</p>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {chapterList.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => switchChapter(chapter.index)}
                    className={`pressable mb-0.5 flex w-full items-center rounded-md px-3 py-1.5 text-left text-[12.5px] ${chapter.index === chapterIndex ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/25 dark:text-primary-200' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{chapter.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className={`flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 ${chapterList.length > 0 ? 'border-t border-[var(--line)]' : 'pt-4'}`}>
            <p className="eyebrow mb-1 flex-none px-2 text-[var(--muted)]">On this page</p>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {headings.length ? (
                headings.map((heading) => (
                  <button
                    key={`${heading.pos}-${heading.text}`}
                    type="button"
                    onClick={() => jumpToHeading(heading.pos)}
                    className="pressable flex w-full items-center rounded-md py-1 pr-1.5 text-left text-[12px] text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
                    style={{ paddingLeft: 8 + (heading.level - 1) * 12 }}
                  >
                    <span className="min-w-0 flex-1 truncate">{heading.text || 'Untitled'}</span>
                  </button>
                ))
              ) : (
                <p className="px-2 py-1 text-[11.5px] text-[var(--muted)]">No headings.</p>
              )}
            </div>
          </div>
          <p className="flex-none px-4 py-2 text-[10.5px] text-[var(--muted)]">Highlights last for this session.</p>
        </aside>
      )}

      {/* Reading pane */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-1 border-b border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 sm:px-3">
          {variant === 'collection' && (
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`pressable hidden h-8 w-8 items-center justify-center rounded-md lg:flex ${sidebarOpen ? 'text-[var(--ink)]' : 'text-[var(--muted)]'} hover:bg-[var(--panel-soft)]`}
              aria-label="Toggle contents sidebar"
              title="Toggle contents"
            >
              <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M9.5 4.5v15" /></svg>
            </button>
          )}
          <button type="button" onClick={() => switchChapter(chapterIndex - 1)} disabled={chapterIndex === 0} className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] disabled:opacity-40" aria-label="Previous chapter" title="Previous chapter">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m15 5-7 7 7 7" /></svg>
          </button>
          <button type="button" onClick={() => switchChapter(chapterIndex + 1)} disabled={chapterIndex >= notes.length - 1} className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] disabled:opacity-40" aria-label="Next chapter" title="Next chapter">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <p className="min-w-0 flex-1 truncate px-2 text-[12.5px] font-medium text-[var(--muted)]">{chapterLabel} · {chapterIndex + 1}/{notes.length}</p>

          {/* Annotation palette — segmented tools + separate undo */}
          <div className="flex flex-none items-center gap-0.5 rounded-lg border border-[var(--line)] p-0.5">
            <button type="button" onClick={() => setTool(tool === 'pen' ? 'select' : 'pen')} className={toolButton(tool === 'pen')} aria-label="Pen tool" title="Pen (P) — draw on the page">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m14.5 4.5 5 5L8 21H3v-5L14.5 4.5Z" /><path d="m12.5 6.5 5 5" /></svg>
              Pen
            </button>
            {tool === 'pen' && (
              <div className="flex items-center gap-1 pl-0.5">
                {MARK_COLORS.map((mark) => (
                  <button
                    key={mark.key}
                    type="button"
                    onClick={() => setPenColor(mark.solid)}
                    aria-label={`Pen color ${mark.label}`}
                    title={`Pen color: ${mark.label}`}
                    className={`h-4 w-4 rounded-full border border-black/20 ${penColor === mark.solid ? 'ring-2 ring-[var(--brand)] ring-offset-1' : ''}`}
                    style={{ background: mark.solid }}
                  />
                ))}
              </div>
            )}
            <button type="button" onClick={() => setTool(tool === 'highlight' ? 'select' : 'highlight')} className={toolButton(tool === 'highlight')} aria-label="Highlight tool" title="Highlight — drag across text">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 11.5 4-4L20.5 15 15 20.5l-6-6Z" /><path d="m13 7.5 3.5-3.5 3.5 3.5-3.5 3.5M4.5 19.5h6" /></svg>
              Highlight
            </button>
            {tool === 'highlight' && (
              <div className="flex items-center gap-1 pl-0.5">
                {MARK_COLORS.map((mark) => (
                  <button
                    key={mark.key}
                    type="button"
                    onClick={() => setHlColor(mark.key as ReaderHighlightColor)}
                    aria-label={`Highlight color ${mark.label}`}
                    title={`Highlight color: ${mark.label}`}
                    className={`h-4 w-4 rounded-full border border-black/20 ${hlColor === mark.key ? 'ring-2 ring-[var(--brand)] ring-offset-1' : ''}`}
                    style={{ background: `var(--mark-${mark.key})` }}
                  />
                ))}
              </div>
            )}
            <button type="button" onClick={() => setTool(tool === 'text' ? 'select' : 'text')} className={toolButton(tool === 'text')} aria-label="Text note tool" title="Text (T) — click to place a note">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 4.5h10a2 2 0 0 1 2 2V13h-5.5L9 15.5V13H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" /><path d="M8 8.5h6M8 11h4" /></svg>
              Text
            </button>
            <button type="button" onClick={() => setTool(tool === 'eraser' ? 'select' : 'eraser')} className={toolButton(tool === 'eraser')} aria-label="Eraser tool" title="Eraser (E) — click a mark to remove it">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m13 4.5 6.5 6.5a1.5 1.5 0 0 1 0 2.1L13 19.5H8l-4.5-4.5a1.5 1.5 0 0 1 0-2.1l7.4-8.4a1.5 1.5 0 0 1 2.1 0Z" /><path d="m9 8 7 7" /></svg>
              Eraser
            </button>
          </div>
          <button type="button" onClick={() => readerAnnotations.undo(noteId)} className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="Undo last annotation" title="Undo">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M8 6 4 10l4 4" /><path d="M4 10h9a6 6 0 0 1 6 6v1" /></svg>
          </button>
          {onCreateNote && (
            <button type="button" onClick={() => void createNote()} className="pressable flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="Add a note here" title={folderId ? 'Add a note to this notebook' : 'Add a note'}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
              Note
            </button>
          )}
          <button type="button" onClick={onClose} className="pressable flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="Exit reader mode" title="Exit reader mode">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
            Exit
          </button>
        </div>

        <div
          ref={paneRef}
          className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${tool === 'eraser' ? 'cursor-crosshair' : ''} ${tool === 'highlight' ? 'reader-highlighting' : ''}`}
          onPointerDown={onPanePointerDown}
          onPointerMove={onPanePointerMove}
          onPointerUp={() => { finishHighlight(); handlePointerUp(); }}
        >
          <div className="relative mx-auto w-full px-6 py-10 sm:px-10">
            {/* Annotation overlay: pen strokes + sticky text notes */}
            <svg
              ref={overlayRef}
              className={`absolute inset-0 h-full w-full ${tool === 'select' || tool === 'highlight' ? 'pointer-events-none' : ''}`}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              style={{ touchAction: tool === 'pen' ? 'none' : undefined, zIndex: 5 }}
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onOverlayPointerMove}
              onPointerUp={onOverlayPointerUp}
              onClick={onOverlayClick}
            >
              {strokes.map((stroke) => (
                <polyline
                  key={stroke.id}
                  points={stroke.points.map((p) => `${p.x * 100},${p.y * 100}`).join(' ')}
                  fill="none"
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {textNotes.map((textNote) => (
              <div
                key={textNote.id}
                className={`reader-text-note absolute rounded-lg p-2 shadow-sm ${tool === 'eraser' ? 'cursor-crosshair' : ''}`}
                style={{ left: `${textNote.x * 100}%`, top: `${textNote.y * 100}%`, width: 180, zIndex: 6 }}
                onClick={(event) => {
                  if (tool === 'eraser') {
                    event.stopPropagation();
                    readerAnnotations.removeText(textNote.id, noteId);
                  }
                }}
              >
                <textarea
                  value={textNote.text}
                  placeholder="Note…"
                  autoFocus={editingTextId === textNote.id}
                  readOnly={tool !== 'text' && editingTextId !== textNote.id}
                  onChange={(event) => readerAnnotations.updateText(textNote.id, noteId, { text: event.target.value })}
                  onBlur={() => {
                    if (!textNote.text.trim()) readerAnnotations.removeText(textNote.id, noteId);
                    setEditingTextId(null);
                  }}
                  className="w-full resize-none border-0 bg-transparent text-[12px] leading-snug text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                  rows={2}
                  onInput={(event) => {
                    const el = event.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
              </div>
            ))}

            <TiptapEditor
              key={note.id}
              noteId={note.id}
              content={note.content}
              editable={false}
              reader
              showToolbar={false}
              className="reader-content"
              onEditorReady={(instance) => { editorRef.current = instance; }}
            />
          </div>
        </div>

        {/* Highlight color bubble on selection */}
        {bubble && (
          <div
            className="app-panel fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg p-1 shadow-lg shadow-black/15"
            style={{ left: Math.max(60, Math.min(bubble.x, window.innerWidth - 60)), top: Math.max(48, bubble.y - 8) }}
            onMouseDown={(event) => event.preventDefault()}
          >
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Highlight ${color}`}
                title={`Highlight ${color}`}
                onClick={() => applyHighlight(color)}
                className={`h-5 w-5 rounded-full border border-black/10 transition-transform hover:scale-110 reader-color-${color}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReaderView;
