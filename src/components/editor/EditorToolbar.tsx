import { Editor } from '@tiptap/react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import IconButton from '@/components/ui/IconButton';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useLiveQuery } from 'dexie-react-hooks';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';
import { useSettings } from '@/hooks/useSettings';
import { fileToDataUrl } from '@/lib/utils/image';
import { MARK_COLORS } from '@/lib/theme/palette';
import { makeQuote } from '@/lib/editor/quote';

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarMenuItem {
  label: string;
  active?: boolean;
  /** Optional color dot rendered before the label (color pickers). */
  swatch?: string;
  run: () => void;
}

interface ToolbarEntry {
  id: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  run?: () => void;
  /** Dropdown entries open this menu from the bar; when overflowed their items land inside ••• instead. */
  menu?: ToolbarMenuItem[];
  /** Main button runs the action; only the caret opens the color menu. */
  split?: boolean;
  trailing?: React.ReactNode;
  /** Extra tools live in ••• until the user places them in the bar via Edit toolbar. */
  extra?: boolean;
}

type MoreMenuItem = ToolbarMenuItem | 'separator';

/** Default bar layout; the user's saved order (settings.toolbarOrder) overrides it. */
const DEFAULT_ORDER = ['heading', 'bold', 'italic', 'underline', 'strike', 'highlight', 'color', 'bullet', 'ordered', 'task', 'undo', 'redo', 'align', 'code', 'codeBlock', 'quote', 'link', 'image', 'mic'];

const EditorToolbar = memo(function EditorToolbar({ editor }: EditorToolbarProps) {
  const { settings, update } = useSettings();
  const [paintActive, setPaintActive] = useState(false);
  const [paintColor, setPaintColor] = useState(MARK_COLORS[5]!.solid);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [customizing, setCustomizing] = useState(false);
  const dragSource = useRef<{ type: 'bar'; index: number } | { type: 'chip'; id: string } | null>(null);
  const prevPositions = useRef<Map<string, number>>(new Map());
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // In-note embeds pick from note-scoped boards only — the Whiteboards section
  // has its own separate set, so adding/deleting here can't touch it.
  const boards = useLiveQuery(() => whiteboardsRepository.list('note'), [], []);

  // Close any open dropdown when clicking elsewhere
  useEffect(() => {
    if (!openMenuId) return undefined;
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuId]);

  // ESC leaves customize mode
  useEffect(() => {
    if (!customizing) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCustomizing(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [customizing]);

  useEffect(() => {
    if (!recorder) return undefined;
    const timer = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recorder]);

  const handleSetLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkUrl(previousUrl || '');
    setShowLinkModal(true);
  }, [editor]);

  const applyLink = () => {
    if (linkUrl) {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const insertBoard = (boardId: string) => {
    editor.chain().focus().insertContent({ type: 'whiteboardPreview', attrs: { boardId } }).run();
    setShowBoardModal(false);
  };

  const createAndInsertBoard = async () => {
    try {
      const board = await whiteboardsRepository.create({ scope: 'note' });
      insertBoard(board.id);
    } catch {
      alert('Could not create a whiteboard.');
    }
  };

  const insertImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not add the image.');
    }
  };

  const insertVideo = () => {
    const url = prompt('YouTube video URL', 'https://www.youtube.com/watch?v=');
    if (!url) return;
    const match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
    const id = match?.[1];
    if (!id) {
      alert('That does not look like a YouTube URL.');
      return;
    }
    editor.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: `https://www.youtube.com/embed/${id}` } }).run();
  };

  const insertTex = () => {
    const tex = prompt('TeX formula', 'e^{i\\pi} + 1 = 0');
    if (tex) editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { tex } }).run();
  };

  const formatRecordTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const toggleRecording = async () => {
    if (recorder) {
      recorder.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      // Live transcript while recording — the Web Speech API runs alongside
      // the mic capture; when it's unavailable the memo simply saves without one.
      type SRResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
      type SpeechRecognitionLike = {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((event: SRResultEvent) => void) | null;
        onerror: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      type SpeechRecognitionCtor = new () => SpeechRecognitionLike;
      const speechWindow = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
      const SRCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
      let recognition: SpeechRecognitionLike | null = null;
      let transcriptText = '';
      if (SRCtor) {
        try {
          recognition = new SRCtor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = navigator.language || 'en-US';
          recognition.onresult = (event: SRResultEvent) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) text += `${event.results[i]?.[0]?.transcript ?? ''} `;
            transcriptText = text.trim();
          };
          recognition.onerror = () => { /* transcript is best-effort */ };
          recognition.start();
        } catch {
          recognition = null;
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        try { recognition?.stop(); } catch { /* already stopped */ }
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const duration = recordSeconds;
        // data URL + real waveform peaks in parallel; the memo stores both
        void Promise.all([
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          }),
          import('@/lib/editor/voice-peaks').then(({ computePeaksFromBlob }) => computePeaksFromBlob(blob)).catch(() => null)
        ]).then(([dataUrl, peaks]) => {
          if (!dataUrl) {
            alert('Could not save the recording.');
            return;
          }
          setRecordSeconds(() => {
            editor
              .chain()
              .focus()
              .insertContent({
                type: 'voiceMemo',
                attrs: { dataUrl, duration, createdAt: Date.now(), transcript: transcriptText || null, peaks }
              })
              .run();
            return 0;
          });
        });
        setRecorder(null);
      };
      mediaRecorder.start();
      setRecordSeconds(0);
      setRecorder(mediaRecorder);
    } catch {
      alert('Microphone is not available. Grant microphone access and try again.');
    }
  };

  const currentAlign = ['left', 'center', 'right', 'justify'].find((a) => editor.isActive({ textAlign: a })) || 'left';
  const currentLevel = ([1, 2, 3] as const).find((level) => editor.isActive('heading', { level }));

  // --- Every tool as data. `extra` tools live in ••• until placed in the bar. -
  // Highlight paint mode: while latched, dragging over text applies the mark
  // with the chosen color; the cursor becomes a highlighter pen.
  const toggleHighlightPaint = () => {
    const dom = editor.view.dom;
    const on = dom.classList.toggle('highlight-painting');
    dom.dataset.highlightColor = paintColor;
    setPaintActive(on);
  };

  const entries: ToolbarEntry[] = [
    {
      id: 'heading',
      label: 'Heading',
      icon: <><HIcon />{currentLevel ? <span className="ml-px text-[10px] font-bold">{currentLevel}</span> : null}<CaretDown /></>,
      active: Boolean(currentLevel),
      menu: [
        { label: 'Body text', active: editor.isActive('paragraph'), run: () => editor.chain().focus().setParagraph().run() },
        { label: 'Heading 1', active: editor.isActive('heading', { level: 1 }), run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
        { label: 'Heading 2', active: editor.isActive('heading', { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
        { label: 'Heading 3', active: editor.isActive('heading', { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() }
      ]
    },
    { id: 'bold', label: 'Bold (Ctrl+B)', icon: <BoldIcon />, active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { id: 'italic', label: 'Italic (Ctrl+I)', icon: <ItalicIcon />, active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { id: 'underline', label: 'Underline (Ctrl+U)', icon: <UnderlineIcon />, active: editor.isActive('underline'), run: () => editor.chain().focus().toggleUnderline().run() },
    { id: 'strike', label: 'Strikethrough', icon: <StrikeIcon />, active: editor.isActive('strike'), run: () => editor.chain().focus().toggleStrike().run() },
    { id: 'highlight', label: 'Highlight', icon: <HighlightIcon />, active: paintActive || editor.isActive('highlight'), split: true, run: toggleHighlightPaint, trailing: (
      <button
        type="button"
        aria-label="Highlight color"
        title="Highlight color"
        className="-ml-1 flex h-6 w-4 items-center justify-center rounded-r-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
        onClick={(event) => {
          event.stopPropagation();
          openDropdown('highlight')(event);
        }}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </button>
    ), menu: [
      { label: 'Stop highlighting', run: () => { editor.view.dom.classList.remove('highlight-painting'); setPaintActive(false); editor.chain().focus().unsetHighlight().run(); } },
      { label: '__sep__', run: () => {} },
      ...MARK_COLORS.map((mark) => ({
        label: mark.label,
        swatch: mark.solid,
        active: paintColor === mark.solid,
        run: () => {
          setPaintColor(mark.solid);
          if (paintActive) editor.view.dom.dataset.highlightColor = mark.solid;
          editor.chain().focus().setMark('highlight', { color: mark.solid }).run();
        }
      }))
    ] },
    { id: 'color', label: 'Text color', icon: <TextColorIcon />, active: editor.isActive('textStyle'), menu: [
      { label: 'Default text', active: !editor.getAttributes('textStyle').color, run: () => editor.chain().focus().setColor('').run() },
      { label: '__sep__', run: () => {} },
      ...([
        ['Ink', '#181b1f'],
        ['Red', '#d02c2e'],
        ['Orange', '#dd6400'],
        ['Amber', '#986300'],
        ['Green', '#008039'],
        ['Teal', '#007c77'],
        ['Blue', '#3761e1'],
        ['Violet', '#8c46c3'],
        ['Pink', '#c72b76'],
        ['Graphite', '#4a5666']
      ] as Array<[string, string]>).map(([name, hex]) => ({
        label: name,
        swatch: hex,
        active: editor.getAttributes('textStyle').color === hex,
        run: () => editor.chain().focus().setColor(hex).run()
      }))
    ] },
    { id: 'bullet', label: 'Bullet List', icon: <BulletListIcon />, active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { id: 'ordered', label: 'Numbered List', icon: <OrderedListIcon />, active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { id: 'task', label: 'Task List', icon: <TaskListIcon />, active: editor.isActive('taskList'), run: () => editor.chain().focus().toggleTaskList().run() },
    { id: 'undo', label: 'Undo (Ctrl+Z)', icon: <UndoIcon />, disabled: !editor.can().undo(), run: () => editor.chain().focus().undo().run() },
    { id: 'redo', label: 'Redo (Ctrl+Shift+Z)', icon: <RedoIcon />, disabled: !editor.can().redo(), run: () => editor.chain().focus().redo().run() },
    {
      id: 'align',
      label: 'Text alignment',
      icon: currentAlign === 'center' ? <AlignCenterIcon /> : currentAlign === 'right' ? <AlignRightIcon /> : currentAlign === 'justify' ? <AlignJustifyIcon /> : <AlignLeftIcon />,
      menu: [
        { label: 'Align left', active: currentAlign === 'left', run: () => editor.chain().focus().setTextAlign('left').run() },
        { label: 'Align center', active: currentAlign === 'center', run: () => editor.chain().focus().setTextAlign('center').run() },
        { label: 'Align right', active: currentAlign === 'right', run: () => editor.chain().focus().setTextAlign('right').run() },
        { label: 'Justify', active: currentAlign === 'justify', run: () => editor.chain().focus().setTextAlign('justify').run() }
      ]
    },
    { id: 'code', label: 'Inline code', icon: <CodeIcon />, active: editor.isActive('code'), run: () => editor.chain().focus().toggleCode().run() },
    { id: 'codeBlock', label: 'Code Block', icon: <CodeBlockIcon />, active: editor.isActive('codeBlock'), run: () => editor.chain().focus().toggleCodeBlock().run() },
    { id: 'quote', label: 'Quote', icon: <QuoteIcon />, active: editor.isActive('blockquote'), run: () => makeQuote(editor) },
    { id: 'link', label: 'Link (Ctrl+K)', icon: <LinkIcon />, active: editor.isActive('link'), run: handleSetLink },
    { id: 'image', label: 'Insert image', icon: <ImageIcon />, run: () => imageInputRef.current?.click() },
    {
      id: 'mic',
      label: recorder ? `Stop recording (${formatRecordTime(recordSeconds)})` : 'Record voice memo',
      icon: recorder ? <StopIcon /> : <MicIcon />,
      run: () => void toggleRecording(),
      trailing: recorder ? <span className="flex-none pr-1 text-[11px] font-semibold tabular-nums text-red-500">{formatRecordTime(recordSeconds)}</span> : null
    },
    // Extras — in ••• until placed in the bar through Edit toolbar
    { id: 'subscript', label: 'Subscript', icon: <SubscriptIcon />, active: editor.isActive('subscript'), extra: true, run: () => editor.chain().focus().toggleSubscript().run() },
    { id: 'superscript', label: 'Superscript', icon: <SuperscriptIcon />, active: editor.isActive('superscript'), extra: true, run: () => editor.chain().focus().toggleSuperscript().run() },
    { id: 'divider', label: 'Divider', icon: <DividerIcon />, extra: true, run: () => editor.chain().focus().setHorizontalRule().run() },
    { id: 'table', label: 'Insert table', icon: <TableIcon />, extra: true, run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'date', label: 'Insert date', icon: <CalendarIcon />, extra: true, run: () => editor.chain().focus().insertContent(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })).run() },
    { id: 'video', label: 'Embed video', icon: <VideoIcon />, extra: true, run: insertVideo },
    { id: 'tex', label: 'TeX formula', icon: <TexIcon />, extra: true, run: insertTex },
    { id: 'whiteboard', label: 'Whiteboard', icon: <BoardIcon />, extra: true, run: () => setShowBoardModal(true) }
  ];

  // Bar composition: user order first; core tools always present; extras only
  // when the user placed them. Recomputed every render for fresh closures.
  const savedOrder = settings?.toolbarOrder;
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const barEntries: ToolbarEntry[] = [];
  const inBar = new Set<string>();
  for (const id of savedOrder ?? DEFAULT_ORDER) {
    const entry = byId.get(id);
    if (entry && !inBar.has(id)) {
      barEntries.push(entry);
      inBar.add(id);
    }
  }
  for (const entry of entries) {
    if (!entry.extra && !inBar.has(entry.id)) {
      barEntries.push(entry);
      inBar.add(entry.id);
    }
  }
  const unplacedExtras = entries.filter((entry) => entry.extra && !inBar.has(entry.id));

  const setOrder = (ids: string[]) => void update({ toolbarOrder: ids });
  const moveEntry = (from: number, to: number) => {
    if (from === to) return;
    const ids = barEntries.map((entry) => entry.id);
    const moved = ids.splice(from, 1)[0]!;
    ids.splice(to, 0, moved);
    setOrder(ids);
  };
  const insertChip = (id: string, index: number) => {
    const ids = barEntries.map((entry) => entry.id);
    ids.splice(index, 0, id);
    setOrder(ids);
  };
  const removeEntry = (id: string) => setOrder(barEntries.map((entry) => entry.id).filter((entryId) => entryId !== id));

  // --- Adaptive overflow: tools that don't fit move into ••• -----------------
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [layout, setLayout] = useState<{ sig: string; widths: number[] }>({ sig: '', widths: [] });
  const signature = `${barEntries.map((e) => e.id).join(',')}|${recorder ? 'rec' : ''}`;

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setContainerW(el.clientWidth));
    observer.observe(el);
    setContainerW(el.clientWidth);
    const onResize = () => setContainerW(el.clientWidth);
    window.addEventListener('resize', onResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Measure every entry with all of them visible, once per layout change
  const measuring = layout.sig !== signature;
  useLayoutEffect(() => {
    if (customizing || !measuring || !scrollerRef.current) return;
    const kids = Array.from(scrollerRef.current.querySelectorAll<HTMLElement>('[data-entry-id]'));
    if (!kids.length) return;
    setLayout({ sig: signature, widths: kids.map((k) => k.getBoundingClientRect().width) });
  }, [customizing, measuring, signature]);

  const visibleCount = useMemo(() => {
    if (customizing || measuring) return barEntries.length;
    const GAP = 2;
    let acc = 0;
    let count = 0;
    for (let i = 0; i < barEntries.length; i++) {
      const w = layout.widths[i];
      if (w === undefined) break;
      if (acc + w > containerW) break;
      acc += w + GAP;
      count++;
    }
    return Math.max(1, count);
  }, [customizing, measuring, layout, containerW, barEntries.length]);

  const visibleEntries = barEntries.slice(0, visibleCount);
  const overflowEntries = barEntries.slice(visibleCount);

  // ••• = overflowed bar tools + unplaced extras (menus flatten in) + Edit toolbar
  const moreItems: MoreMenuItem[] = [];
  if (!customizing && overflowEntries.length) {
    for (const entry of overflowEntries) {
      if (entry.menu) moreItems.push(...entry.menu);
      else if (entry.run) moreItems.push({ label: entry.label, active: entry.active, run: entry.run });
    }
    moreItems.push('separator');
  }
  for (const entry of unplacedExtras) {
    if (entry.menu) moreItems.push(...entry.menu);
    else if (entry.run) moreItems.push({ label: entry.label, active: entry.active, run: entry.run });
  }
  if (moreItems.length) moreItems.push('separator');
  moreItems.push({ label: customizing ? 'Done editing toolbar' : 'Edit toolbar', run: () => { setOpenMenuId(null); setCustomizing(!customizing); } });

  const openDropdown = (entryId: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.top, left: rect.left });
    setOpenMenuId(openMenuId === entryId ? null : entryId);
  };

  const renderMenu = (items: MoreMenuItem[]) => {
    // Anchor from the right edge when the opener sits near it (••• always does).
    // The un-used side must be explicitly `auto` — the base .toolbar-menu rule
    // sets left: 0, and leaving it in place stretches the menu across the window.
    const nearRight = menuPos.left > window.innerWidth - 280;
    return createPortal(
      <div
        tabIndex={-1}
        onKeyDown={(event) => {
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
          if (!buttons.length) return;
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          if (event.key === 'ArrowDown') { event.preventDefault(); buttons[(index + 1 + buttons.length) % buttons.length]?.focus(); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); buttons[(index - 1 + buttons.length) % buttons.length]?.focus(); }
          else if (event.key === 'Home') { event.preventDefault(); buttons[0]?.focus(); }
          else if (event.key === 'End') { event.preventDefault(); buttons[buttons.length - 1]?.focus(); }
        }}
        className="toolbar-menu outline-none"
        style={{
          position: 'fixed',
          top: 'auto',
          bottom: window.innerHeight - menuPos.top + 6,
          left: nearRight ? 'auto' : Math.max(8, menuPos.left),
          right: nearRight ? Math.max(8, window.innerWidth - menuPos.left - 20) : 'auto',
          zIndex: 70
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {items.map((item, index) =>
          item === 'separator' || item.label === '__sep__' ? (
            <div key={`sep-${index}`} className="menu-separator" />
          ) : (
            <button
              key={item.label}
              type="button"
              className={item.active ? 'is-active' : ''}
              onMouseDown={(event) => { if (event.button === 0) event.preventDefault(); }}
              onClick={() => {
                item.run();
                setOpenMenuId(null);
              }}
            >
              {item.swatch && <span className="h-3.5 w-3.5 flex-none rounded-full border border-black/15" style={{ background: item.swatch }} />}
              {item.label}
            </button>
          )
        )}
      </div>,
      document.body
    );
  };

  const openEntry = barEntries.find((entry) => entry.id === openMenuId && entry.menu);

  // FLIP: when the order changes, animate tools from their previous spot
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const kids = Array.from(el.querySelectorAll<HTMLElement>('[data-entry-id]'));
    const now = new Map<string, number>();
    kids.forEach((k) => now.set(k.getAttribute('data-entry-id')!, k.getBoundingClientRect().left));
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      kids.forEach((k) => {
        const id = k.getAttribute('data-entry-id')!;
        const prev = prevPositions.current.get(id);
        const cur = now.get(id)!;
        if (prev !== undefined && Math.abs(prev - cur) > 1) {
          k.style.transition = 'none';
          k.style.transform = `translateX(${prev - cur}px)`;
          requestAnimationFrame(() => {
            k.style.transition = 'transform 180ms ease';
            k.style.transform = '';
          });
        }
      });
    }
    prevPositions.current = now;
  });

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
      <div className="relative flex items-center">
        <div ref={scrollerRef} className="flex min-w-0 flex-1 flex-nowrap items-center gap-0.5 overflow-hidden">
          {visibleEntries.map((entry, index) => (
            <div
              key={entry.id}
              data-entry-id={entry.id}
              className={`relative flex flex-none items-center ${customizing ? 'cursor-grab rounded-lg outline-dashed outline-1 outline-[var(--line)] active:cursor-grabbing' : ''}`}
              draggable={customizing}
              onDragStart={(event) => {
                if (!customizing) return;
                dragSource.current = { type: 'bar', index };
                event.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(event) => {
                if (customizing) event.preventDefault();
              }}
              onDrop={(event) => {
                if (!customizing) return;
                event.preventDefault();
                const source = dragSource.current;
                dragSource.current = null;
                if (!source) return;
                if (source.type === 'bar') moveEntry(source.index, index);
                else insertChip(source.id, index);
              }}
            >
              <IconButton
                size="md"
                icon={entry.icon}
                label={entry.label}
                variant={entry.active ? 'primary' : 'ghost'}
                disabled={entry.disabled}
                skipMouseDownPrevent={customizing}
                onClick={(event) => {
                  if (entry.menu && !entry.split) {
                    openDropdown(entry.id)(event);
                    return;
                  }
                  if (customizing) return; // rearranging, not editing
                  entry.run?.();
                }}
              />
              {entry.trailing}
              {customizing && entry.extra && (
                <button
                  type="button"
                  title="Move back to More options"
                  aria-label={`Move ${entry.label} back to More options`}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeEntry(entry.id);
                  }}
                  className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel)] text-[9px] leading-none text-[var(--muted)] hover:text-red-600"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Edit toolbar — always reachable, bottom right */}
        <IconButton
          size="md"
          icon={<EditToolbarIcon />}
          label={customizing ? 'Done editing toolbar' : 'Edit toolbar'}
          variant={customizing ? 'primary' : 'ghost'}
          onClick={(event) => {
            event.stopPropagation();
            setOpenMenuId(null);
            setCustomizing(!customizing);
          }}
        />

        {/* Pinned ••• : hosts overflowed + unplaced tools */}
        {!customizing && (
          <div className="relative flex-none">
            <IconButton
              size="md"
              icon={<MoreToolbarIcon />}
              label="More options"
              variant={openMenuId === 'more' ? 'primary' : 'ghost'}
              onClick={openDropdown('more')}
            />
          </div>
        )}

        {customizing && (
          <div className="pointer-events-none absolute -top-8 right-0 z-20">
            <span className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-[11.5px] text-[var(--muted)] shadow-sm">
              Drag tools to rearrange — × returns a tool to More options
            </span>
          </div>
        )}
      </div>

      {/* Edit mode: tools living in ••• — click or drag into the bar above */}
      {customizing && unplacedExtras.length > 0 && (
        <div className="mt-1 flex flex-none items-center gap-1 overflow-x-auto border-t border-[var(--line)] pt-1.5 pb-0.5">
          <span className="flex-none pr-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted)]">Add:</span>
          {unplacedExtras.map((entry) => (
            <button
              key={entry.id}
              type="button"
              title={`Add ${entry.label} to the toolbar`}
                    draggable
                    onDragStart={(event) => {
                      dragSource.current = { type: 'chip', id: entry.id };
                      event.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => insertChip(entry.id, barEntries.length)}
              className="pressable flex h-7 flex-none items-center gap-1 rounded-md border border-dashed border-[var(--line)] px-2 text-[11.5px] font-medium text-[var(--muted)] hover:border-primary-300 hover:text-[var(--ink)] [&>svg]:h-3.5 [&>svg]:w-3.5"
            >
              {entry.icon}
              <span className="whitespace-nowrap">{entry.label}</span>
              <PlusIcon />
            </button>
          ))}
        </div>
      )}
      </div>

      {openEntry?.menu && renderMenu(openEntry.menu)}
      {openMenuId === 'more' && renderMenu(moreItems)}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void insertImage(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {/* Link Modal */}
      <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Insert Link" size="sm">
        <div className="space-y-4">
          <Input
            label="URL"
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
              Cancel
            </Button>
            <Button onClick={applyLink}>
              {linkUrl ? 'Insert Link' : 'Remove Link'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showBoardModal} onClose={() => setShowBoardModal(false)} title="Insert whiteboard" size="md">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => void createAndInsertBoard()}
            className="flex w-full items-center gap-3 rounded-md border border-dashed border-primary-300 p-3 text-left hover:bg-[var(--panel-soft)]"
          >
            <span className="flex h-14 w-20 flex-none items-center justify-center rounded bg-primary-50 text-primary-600"><PlusIcon /></span>
            <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">New whiteboard — create and embed here</span>
          </button>
          {boards.length ? (
            <div className="space-y-2">
              {boards.map(board => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => insertBoard(board.id)}
                  className="flex w-full items-center gap-3 rounded-md border border-[var(--line)] p-3 text-left hover:bg-[var(--panel-soft)]"
                >
                  {board.previewDataUrl ? <img src={board.previewDataUrl} alt="" className="h-14 w-20 rounded bg-white object-contain" /> : <span className="flex h-14 w-20 items-center justify-center rounded bg-[var(--panel-soft)]"><BoardIcon /></span>}
                  <span className="truncate text-sm font-medium text-[var(--ink)]">{board.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No whiteboards yet — create your first one above.</p>
          )}
        </div>
      </Modal>
    </>
  );
});

// Minimal 16px stroke icons
const CaretDown = () => <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="currentColor"><path d="M2.5 4.5 6 8l3.5-3.5H2.5Z" /></svg>;
const HIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M6 5v14M16 5v14M6 12h10" /></svg>;
const BoldIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7V5Zm0 7h7.5a3.5 3.5 0 0 1 0 7H7v-7Z" /></svg>;
const ItalicIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M10 5h8M6 19h8m2-14-4 14" /></svg>;
const UnderlineIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M7 4.5v6.5a5 5 0 0 0 10 0V4.5M5.5 20h13" /></svg>;
const StrikeIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 12h16M16.5 6.5C15.5 5.4 13.9 5 12 5c-2.6 0-4.5 1.2-4.5 3.1 0 1.3.8 2.2 2.2 2.9m4.8 5.9c1.6-.6 2.9-1.6 2.9-3.2 0-.5-.1-1-.4-1.4" /></svg>;
const HighlightIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m9 15-4 4m1.5-6.5 7-7a2.1 2.1 0 0 1 3 0l2 2a2.1 2.1 0 0 1 0 3l-7 7h-4l-1-1v-4Z" /><path d="M5 21h14" /></svg>;
const TextColorIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="m6 15 6-12 6 12M8.2 11h7.6M5 20h14" /></svg>;
const BulletListIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.7" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.7" cy="17.5" r="1" fill="currentColor" stroke="none" /></svg>;
const OrderedListIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M10 6.5h10M10 12h10M10 17.5h10M4 5.5 5.2 5v3.2M3.9 10.6c.2-.6 1.7-.8 2 .1.2.7-.8 1.1-2 2.1h2.3M4 15.5h1.6c.6 0 1 .3 1 .8s-.4.8-1 .8H4m0 0h1.8c.6 0 1 .3 1 .8s-.4.9-1 .9H4" /></svg>;
const TaskListIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><path d="m5.5 7 1.2 1.2L9 5.9" /><path d="M13.5 7h7M13.5 17h7M4 17h5" /></svg>;
const UndoIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M8 6 4 10l4 4" /><path d="M4 10h9a6 6 0 0 1 6 6v1" /></svg>;
const RedoIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="m16 6 4 4-4 4" /><path d="M20 10h-9a6 6 0 0 0-6 6v1" /></svg>;
const AlignLeftIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M4 10.5h10M4 15h16M4 19.5h10" /></svg>;
const AlignCenterIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M7 10.5h10M4 15h16M7 19.5h10" /></svg>;
const AlignRightIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M10 10.5h10M4 15h16M10 19.5h10" /></svg>;
const AlignJustifyIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 6h16M4 10.5h16M4 15h16M4 19.5h16" /></svg>;
const CodeIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m8.5 8-4.5 4 4.5 4m7-8 4.5 4-4.5 4" /></svg>;
const CodeBlockIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="m9 10-2.2 2L9 14m6-4 2.2 2L15 14" /></svg>;
const MoreToolbarIcon = () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg>;
const QuoteIcon = () => <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 7H6.5C5.1 7 4 8.1 4 9.5v2C4 12.9 5.1 14 6.5 14H8c0 1.7-1.3 3-3 3v2c2.8 0 5-2.2 5-5V7Zm10 0h-3.5C15.1 7 14 8.1 14 9.5v2c0 1.4 1.1 2.5 2.5 2.5H18c0 1.7-1.3 3-3 3v2c2.8 0 5-2.2 5-5V7Z"/></svg>;
const LinkIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M13.8 10.2a4 4 0 0 0-5.6 0l-4 4a4 4 0 1 0 5.6 5.6l1.1-1.1m-.7-4.9a4 4 0 0 0 5.6 0l4-4a4 4 0 0 0-5.6-5.6l-1.1 1.1" /></svg>;
const ImageIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.4" /><path d="m3.5 16.5 4.5-4 3.5 3 3.5-3 5.5 4.5" /></svg>;
const MicIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5m-3 0h6" /></svg>;
const StopIcon = () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" /></svg>;
const BoardIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="4" y="4.5" width="16" height="15" rx="1.5" /><path d="m8 15 2.5-3.2 1.7 1.4L15 9.5" /></svg>;
const PlusIcon = () => <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2.2" d="M12 5v14M5 12h14" /></svg>;
const EditToolbarIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Zm9.5-12.5 3 3" /><path d="M4 5.5h8" opacity=".55" /></svg>;
const SubscriptIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 5l8 10m0-10-8 10" /><path d="M17.5 15.5c1-.4 2.5-.2 2.5 1s-2.5 1.6-2.5 3h3" /></svg>;
const SuperscriptIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 9l8 10m0-10-8 10" /><path d="M17.5 9.5c1-.4 2.5-.2 2.5 1s-2.5 1.6-2.5 3h3" /></svg>;
const DividerIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M4 12h16M7 6h10M7 18h10" opacity=".5" /></svg>;
const TableIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M9.5 9.5v10" /></svg>;
const CalendarIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="1.5" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></svg>;
const VideoIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="5.5" width="13" height="13" rx="2" /><path d="m16 10.5 5-3v9l-5-3" /></svg>;
const TexIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 7h7M8.5 7v10M13 12.5c2-2 4-1.4 4 .5V17M13.2 15.2c2.4 0 3.2.9 3.8 1.8" /></svg>;

export default EditorToolbar;
