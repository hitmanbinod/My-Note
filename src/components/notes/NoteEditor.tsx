import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useNote } from '@/hooks/useNotes';
import { useSettings } from '@/hooks/useSettings';
import { noteService } from '@/services/NoteService';
import TiptapEditor from '@/components/editor/TiptapEditor';
import EditorToolbar from '@/components/editor/EditorToolbar';
import IconButton from '@/components/ui/IconButton';
import Spinner from '@/components/ui/Spinner';
import { PinPrompt } from '@/components/security/PinPrompt';
import { ExportModal } from '@/components/notes/ExportModal';
import { VersionHistoryModal } from '@/components/notes/VersionHistoryModal';
import { NoteFoldersDialog } from '@/components/folders/NoteFoldersDialog';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { clipboardMenuItems, editCommands } from '@/components/ui/clipboard-menu';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';
import { SlashIcons } from '@/components/editor/SlashIcons';
import { SlashItem, useSlashMenu } from '@/components/editor/useSlashMenu';
import { Editor } from '@tiptap/react';
import { JSONContent } from '@tiptap/react';
import { debounce } from '@/lib/utils/debounce';
import { makeQuote } from '@/lib/editor/quote';

/** Set when a brand-new note is created; the remounted editor focuses the body. */
let pendingBodyFocus = false;

/** Last scroll position per note id (session-only) — see NoteEditor. */
const noteScrollMemory = new Map<string, number>();
if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).__scrollMem = noteScrollMemory;
import { extractPlainText, countWords } from '@/lib/utils/text';
import { isUnlocked, subscribeLock } from '@/lib/lock';

function NoteEditor({ noteId: noteIdProp }: { noteId?: string } = {}) {
  const { noteId: routeNoteId, folderId: routeFolderId } = useParams();
  const noteId = noteIdProp ?? routeNoteId;
  const navigate = useNavigate();
  const isNewNote = noteId === undefined;
  const inSplitPane = noteIdProp !== undefined;

  const { note: loadedNote, loading } = useNote(noteId);
  const { settings, update: updateSettings } = useSettings();
  const focusMode = settings?.focusMode === true;
  const [unlocked, setUnlocked] = useState(isUnlocked());
  useEffect(() => subscribeLock(setUnlocked), []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent>({ type: 'doc', content: [] });
  const [tags, setTags] = useState<string[]>([]);
  const [localNoteId, setLocalNoteId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const suppressInitRef = useRef(false);

  // Popover menus
  const [openMenu, setOpenMenu] = useState<'share' | 'more' | null>(null);
  const [foldersDialogOpen, setFoldersDialogOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  // Right-click menu (editor / tables / whiteboard embeds / inputs)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);

  const editorAreaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScrollMemory = () => {
    const id = stateRef.current.localNoteId;
    if (id && scrollRef.current) noteScrollMemory.set(id, scrollRef.current.scrollTop);
  };

  // Per-note scroll memory — the onScroll handler keeps the last position in
  // `noteScrollMemory`; coming back restores it. The restore retries a few
  // frames because the content applies a beat after the container mounts.
  // Session-only.
  useEffect(() => {
    if (!localNoteId) return;
    const saved = noteScrollMemory.get(localNoteId);
    if (saved === undefined) return;
    let tries = 0;
    const restore = () => {
      const pane = scrollRef.current;
      if (!pane) return;
      pane.scrollTop = saved;
      // The document may still be growing — keep nudging until the position sticks
      if (pane.scrollTop < saved - 2 && tries++ < 12) requestAnimationFrame(restore);
    };
    requestAnimationFrame(restore);
  }, [localNoteId]);
  const slashImageRef = useRef<HTMLInputElement>(null);

  const typewriter = settings?.typewriterMode === true;

  // Use ref to track if initial load happened to prevent overwriting user input
  const initialized = useRef(false);

  // Use refs for latest state to avoid dependency cycles in debounce
  const stateRef = useRef({ title, content, tags, localNoteId, loadedNote });
  useEffect(() => {
    stateRef.current = { title, content, tags, localNoteId, loadedNote };
  }, [title, content, tags, localNoteId, loadedNote]);

  // In the two-pane layout the editor stays mounted while the route param changes.
  // Mark the switch, but keep the previous content on screen until the new note's
  // data arrives — switching stays smooth instead of blanking to a spinner.
  useEffect(() => {
    if (noteId && noteId === stateRef.current.localNoteId) return;
    initialized.current = false;
  }, [noteId]);

  // New-note button pressed while a blank editor is already open: reset to a
  // fresh one (the location carries a `fresh` stamp from the header).
  const location = useLocation();
  const freshStamp = (location.state as { fresh?: number } | null)?.fresh;
  useEffect(() => {
    if (!freshStamp) return;
    setTitle('');
    setContent({ type: 'doc', content: [] });
    setTags([]);
    setLocalNoteId(null);
    initialized.current = false;
    suppressInitRef.current = true; // the init effect must not re-apply the previous note
    requestAnimationFrame(() => {
      (document.querySelector('.ProseMirror') as HTMLElement | null)?.focus();
    });
  }, [freshStamp]);

  // Load note data ONLY when loadedNote changes and not initialized yet
  useEffect(() => {
    if (suppressInitRef.current) { suppressInitRef.current = false; return; }
    if (loadedNote && !initialized.current) {
      setTitle(loadedNote.title);
      setContent(loadedNote.content);
      setTags(loadedNote.tags);
      setLocalNoteId(loadedNote.id);
      initialized.current = true;
      if (pendingBodyFocus) {
        pendingBodyFocus = false;
        requestAnimationFrame(() => {
          (document.querySelector('.ProseMirror') as HTMLElement | null)?.focus();
        });
      }
    }
  }, [loadedNote]);

  // Close popover menus when clicking elsewhere
  useEffect(() => {
    if (!openMenu) return undefined;
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenu]);

  // Core save routine shared by autosave and the manual Save button
  const saveNow = useCallback(async () => {
    const { localNoteId: currentId, title: currentTitle, content: currentContent, tags: currentTags, loadedNote: currentLoaded } = stateRef.current;
    const hasContent = currentContent.content?.some(node => node.type !== 'paragraph' || Boolean(node.content?.length));

    if (!currentId && !currentTitle.trim() && !hasContent) {
      return;
    }

    // Opening an untouched note is not an edit — skip the save entirely
    const isUntouched =
      !!currentId &&
      !!currentLoaded &&
      currentLoaded.id === currentId &&
      currentTitle === currentLoaded.title &&
      currentTags.join('\u0000') === currentLoaded.tags.join('\u0000') &&
      JSON.stringify(currentContent) === JSON.stringify(currentLoaded.content);

    if (isUntouched) return;

    try {
      if (currentId) {
        await noteService.updateNote(currentId, { title: currentTitle, content: currentContent, tags: currentTags });
      } else {
        // New notes created from inside a folder view stay in that folder
        const newNote = await noteService.createNote({ title: currentTitle, content: currentContent, tags: currentTags, folderId: routeFolderId ?? null });
        setLocalNoteId(newNote.id);
        pendingBodyFocus = true;
        initialized.current = true; // Mark as initialized so we don't overwrite with incoming data
        if (!inSplitPane) navigate(routeFolderId ? `/notes/folder/${routeFolderId}` : `/notes/${newNote.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, [navigate, inSplitPane, routeFolderId]);

  const autoSave = useMemo(() => debounce(saveNow, 1000), [saveNow]);


  // Autosave on every change — realtime, no manual state needed
  useEffect(() => {
    if (loading || !(isNewNote || initialized.current)) return;
    autoSave();
  }, [title, content, tags, autoSave, loading, isNewNote]);

  const handleToggleStar = async () => {
    if (localNoteId) {
      await noteService.toggleStar(localNoteId);
    }
  };

  const handleTogglePin = async () => {
    if (localNoteId) {
      await noteService.togglePin(localNoteId);
    }
  };

  const handleTrash = async () => {
    if (!localNoteId) return;
    if (confirm('Move this note to trash?')) {
      await noteService.deleteNote(localNoteId);
      if (!inSplitPane) navigate('/notes');
    }
  };

  const handleDuplicate = async () => {
    if (!localNoteId) return;
    setOpenMenu(null);
    try {
      const copy = await noteService.duplicateNote(localNoteId);
      if (!inSplitPane) navigate(`/notes/${copy.id}`, { replace: true });
    } catch {
      alert('Could not duplicate the note.');
    }
  };

  const saveFolders = async (folderIds: string[]) => {
    if (!localNoteId) return;
    await noteService.setNoteFolders(localNoteId, folderIds);
  };

  // ---- Right-click menu (UpNote-style): clipboard, formatting, inserts,
  // table management and whiteboard actions — all renderer-drawn. ----
  const removeEmbedNode = (boardId: string) => {
    if (!editor) return;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'whiteboardPreview' && node.attrs.boardId === boardId) {
        editor.view.dispatch(editor.view.state.tr.delete(pos, pos + node.nodeSize));
        return false;
      }
      return true;
    });
  };

  const createAndEmbedBoard = () => {
    void whiteboardsRepository.create({ scope: 'note' }).then((board) => {
      editor?.chain().focus().insertContent({ type: 'whiteboardPreview', attrs: { boardId: board.id } }).run();
    });
  };

  const promptLink = () => {
    const url = prompt('Link URL', 'https://');
    if (url && editor) editor.chain().focus().setLink({ href: url }).run();
  };

  const promptVideo = () => {
    const url = prompt('YouTube video URL', 'https://www.youtube.com/watch?v=');
    if (!url) return;
    const match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
    const id = match?.[1];
    if (!id) {
      alert('That does not look like a YouTube URL.');
      return;
    }
    editor?.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: `https://www.youtube.com/embed/${id}` } }).run();
  };

  const promptTex = () => {
    const tex = prompt('TeX formula', 'e^{i\\pi} + 1 = 0');
    if (tex && editor) editor.chain().focus().insertContent({ type: 'inlineMath', attrs: { tex } }).run();
  };

  const handlePaneContextMenu = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // Plain inputs (title, tags): standard clipboard menu
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      event.preventDefault();
      event.stopPropagation();
      setCtxMenu({ x: event.clientX, y: event.clientY, items: clipboardMenuItems() });
      return;
    }
    if (!editor) return;

    // Whiteboard embed — available or unavailable ("Whiteboard unavailable")
    const embedEl = target.closest('.node-whiteboardPreview');
    if (embedEl) {
      const boardId = embedEl.querySelector('[data-whiteboard-id]')?.getAttribute('data-whiteboard-id') ?? '';
      if (boardId) {
        const openLink = embedEl.querySelector('a[href*="/whiteboards/"]');
        event.preventDefault();
        event.stopPropagation();
        setCtxMenu({
          x: event.clientX,
          y: event.clientY,
          items: openLink
            ? [
                { label: 'Open whiteboard', run: () => navigate(`/whiteboards/${boardId}`) },
                { label: 'Remove from note', run: () => removeEmbedNode(boardId) }
              ]
            : [
                { label: 'Remove from note', run: () => removeEmbedNode(boardId) }
              ]
        });
        return;
      }
    }

    // Table cell
    if (target.closest('td, th')) {
      const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      const at = pos ? pos.pos : undefined;
      const table = target.closest('table');
      const chainAt = () => {
        const chain = editor.chain().focus();
        return at !== undefined ? chain.setTextSelection(at) : chain;
      };
      event.preventDefault();
      event.stopPropagation();
      setCtxMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          { label: 'Copy table', run: () => { if (table) editCommands.copyRich(table.outerHTML, table.textContent ?? ''); } },
          { label: 'Delete table', danger: true, run: () => chainAt().deleteTable().run() },
          { separator: true, label: '' },
          {
            label: 'Insert column',
            children: [
              { label: 'Insert column left', run: () => chainAt().addColumnBefore().run() },
              { label: 'Insert column right', run: () => chainAt().addColumnAfter().run() }
            ]
          },
          {
            label: 'Insert row',
            children: [
              { label: 'Insert row above', run: () => chainAt().addRowBefore().run() },
              { label: 'Insert row below', run: () => chainAt().addRowAfter().run() }
            ]
          },
          { label: 'Delete column', run: () => chainAt().deleteColumn().run() },
          { label: 'Delete row', run: () => chainAt().deleteRow().run() },
          { separator: true, label: '' },
          { label: 'Toggle header row', run: () => chainAt().toggleHeaderRow().run() },
          {
            label: 'Merge / split',
            children: [
              { label: 'Merge cells', run: () => chainAt().mergeCells().run() },
              { label: 'Split cell', run: () => chainAt().splitCell().run() }
            ]
          }
        ]
      });
      return;
    }

    // Editor text
    if (target.closest('.ProseMirror')) {
      event.preventDefault();
      event.stopPropagation();
      setCtxMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          ...clipboardMenuItems(),
          { separator: true, label: '' },
          { label: 'Bold', shortcut: 'Ctrl+B', run: () => editor.chain().focus().toggleBold().run() },
          { label: 'Italic', shortcut: 'Ctrl+I', run: () => editor.chain().focus().toggleItalic().run() },
          { label: 'Underline', shortcut: 'Ctrl+U', run: () => editor.chain().focus().toggleUnderline().run() },
          { label: 'Strikethrough', run: () => editor.chain().focus().toggleStrike().run() },
          { label: 'Highlight', run: () => editor.chain().focus().toggleHighlight().run() },
          { label: 'Inline code', run: () => editor.chain().focus().toggleCode().run() },
          { separator: true, label: '' },
          { label: 'Add a link', shortcut: 'Ctrl+K', run: promptLink },
          { label: 'Insert image', run: () => slashImageRef.current?.click() },
          { label: 'Embed video', run: promptVideo },
          { label: 'TeX formula', run: promptTex },
          { label: 'Whiteboard', run: createAndEmbedBoard }
        ]
      });
    }
  };

  // Share helpers
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    }
  };

  const flashFeedback = (message: string) => {
    setShareFeedback(message);
    window.setTimeout(() => setShareFeedback(''), 2000);
  };

  const shareText = async () => {
    if (!localNoteId) return;
    const text = `${stateRef.current.title}\n\n${extractPlainText(stateRef.current.content)}`;
    const ok = await copyToClipboard(text);
    flashFeedback(ok ? 'Copied as text ✓' : 'Copy failed');
    setOpenMenu(null);
  };

  const shareLink = async () => {
    if (!localNoteId) return;
    const base = window.location.href.split('#')[0]?.split('?')[0] ?? '';
    const link = window.location.protocol === 'file:'
      ? `${base}#/notes/${localNoteId}`
      : `${base}notes/${localNoteId}`;
    const ok = await copyToClipboard(link);
    flashFeedback(ok ? 'Link copied ✓' : 'Copy failed');
    setOpenMenu(null);
  };

  const shareImage = async () => {
    if (!localNoteId || !editorAreaRef.current) return;
    setOpenMenu(null);
    try {
      const { toPng } = await import('html-to-image');
      const node = editorAreaRef.current.querySelector('.ProseMirror') || editorAreaRef.current;
      const background = getComputedStyle(document.body).backgroundColor || '#ffffff';
      const dataUrl = await toPng(node as HTMLElement, { backgroundColor: background, pixelRatio: 2 });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${(stateRef.current.title || 'note').replace(/[^\w\- ]+/g, '').trim() || 'note'}.png`, { type: blob.type });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: stateRef.current.title || 'My Note' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
      flashFeedback('Image saved ✓');
    } catch (error) {
      console.error('Share as image failed:', error);
      flashFeedback('Could not export image');
    }
  };

  // Word count recomputes off the render path — extracting text from the
  // whole document per keystroke shows up as lag on long notes.
  const [wordCount, setWordCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setWordCount(countWords(extractPlainText(content))), 400);
    return () => clearTimeout(timer);
  }, [content]);

  // "/" formatting menu
  const slashItems = useMemo<SlashItem[]>(() => [
    { label: 'Heading 1', icon: SlashIcons.h1, command: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: SlashIcons.h2, command: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: SlashIcons.h3, command: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bullet list', icon: SlashIcons.bullet, command: (ed) => ed.chain().focus().toggleBulletList().run() },
    { label: 'Numbered list', icon: SlashIcons.ordered, command: (ed) => ed.chain().focus().toggleOrderedList().run() },
    { label: 'Task list', icon: SlashIcons.task, command: (ed) => ed.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: SlashIcons.quote, command: (ed) => makeQuote(ed) },
    { label: 'Code block', icon: SlashIcons.codeBlock, command: (ed) => ed.chain().focus().toggleCodeBlock().run() },
    { label: 'Divider', icon: SlashIcons.divider, command: (ed) => ed.chain().focus().setHorizontalRule().run() },
    { label: 'Table', icon: SlashIcons.table, command: (ed) => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { label: 'Insert date', icon: SlashIcons.date, command: (ed) => ed.chain().focus().insertContent(new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })).run() },
    {
      label: 'Embed video',
      icon: SlashIcons.video,
      command: (ed) => {
        const url = prompt('YouTube video URL', 'https://www.youtube.com/watch?v=');
        if (!url) return;
        const match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/.exec(url);
        const id = match?.[1];
        if (!id) { alert('That does not look like a YouTube URL.'); return; }
        ed.chain().focus().insertContent({ type: 'videoEmbed', attrs: { src: `https://www.youtube.com/embed/${id}` } }).run();
      }
    },
    {
      label: 'TeX formula',
      icon: SlashIcons.tex,
      command: (ed) => {
        const tex = prompt('TeX formula', 'e^{i\\pi} + 1 = 0');
        if (tex) ed.chain().focus().insertContent({ type: 'inlineMath', attrs: { tex } }).run();
      }
    },
    {
      label: 'Insert image',
      icon: SlashIcons.image,
      command: () => slashImageRef.current?.click()
    },
    {
      label: 'Add a link',
      icon: SlashIcons.link,
      command: (ed) => {
        const url = prompt('Link URL', 'https://');
        if (url) ed.chain().focus().setLink({ href: url }).run();
      }
    }
  ], []);

  const slash = useSlashMenu(editor, slashItems);

  // Typewriter mode: glide the caret back to center only when it leaves the middle band
  useEffect(() => {
    if (!editor || !typewriter) return undefined;
    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!transaction.docChanged || !scrollRef.current) return;
      const container = scrollRef.current;
      const rect = container.getBoundingClientRect();
      const coords = editor.view.coordsAtPos(editor.state.selection.head);
      const caretOffset = coords.top - rect.top;
      const target = container.scrollTop + caretOffset - rect.height / 2 + 10;
      container.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
    };
    editor.on('transaction', onTransaction);
    return () => { editor.off('transaction', onTransaction); };
  }, [editor, typewriter]);

  // Entering typewriter mode puts the caret straight into the writing area
  useEffect(() => {
    if (typewriter && editor) editor.commands.focus('end');
  }, [typewriter, editor]);

  // Closing/leaving the note while in focus mode ends focus mode too
  const focusModeRef = useRef(focusMode);
  focusModeRef.current = focusMode;
  useEffect(() => () => {
    if (focusModeRef.current) void updateSettings({ focusMode: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note info + table of contents popover (bottom-right, next to word count)
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [toc, setToc] = useState<Array<{ level: number; text: string; pos: number }>>([]);
  useEffect(() => {
    if (!editor) return undefined;
    const update = () => {
      const items: Array<{ level: number; text: string; pos: number }> = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.childCount > 0) {
          items.push({ level: Number(node.attrs.level), text: node.textContent, pos });
        }
        return true;
      });
      setToc(items);
    };
    editor.on('transaction', update);
    update();
    return () => { editor.off('transaction', update); };
  }, [editor]);

  useEffect(() => {
    if (!infoOpen) return undefined;
    const close = () => setInfoOpen(false);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInfoOpen(false);
    };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [infoOpen]);

  const jumpToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).scrollIntoView().run();
    const domAt = editor.view.domAtPos(pos + 1);
    const el = domAt.node instanceof Element ? domAt.node : domAt.node.parentElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const pinGate = !loading && !isNewNote && loadedNote?.locked && !unlocked;

  if (!loading && !isNewNote && !loadedNote) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <svg className="mb-4 h-14 w-14 text-[var(--line)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 className="font-serif text-xl font-bold text-[var(--ink)]">Note not found</h2>
        <p className="mt-1 max-w-[36ch] text-center text-[13px] text-[var(--muted)]">The note you are looking for does not exist or has been deleted.</p>
        <button onClick={() => navigate('/notes')} className="pressable mt-5 rounded-md bg-primary-600 py-2 px-4 text-[13px] font-medium text-[var(--on-brand)] hover:bg-primary-700">Back to notes</button>
      </div>
    );
  }

  // Spinner only on first load — when the editor is already mounted, note
  // switches swap content in place instead of buffering.
  if (!isNewNote && (loading || !initialized.current) && !editor && !pinGate) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (pinGate) {
    return (
      <div className="flex h-full items-start justify-center px-6 pt-14">
        <div className="app-panel w-full max-w-sm rounded-lg px-6 py-2">
          <PinPrompt onUnlocked={() => setUnlocked(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col" onContextMenu={handlePaneContextMenu}>
      {/* Note actions — in focus mode this row IS the top bar; everything else yields to the writing area */}
      <div className={`flex flex-none items-center gap-1 px-2 py-1.5 sm:px-3 ${focusMode ? 'border-b border-[var(--line)] bg-[var(--panel)]' : ''}`}>
        {/* Focus mode: minimal top bar (nav + ••• on the left, duplicate + pin on the right) — everything else lives in the menu */}
        {focusMode && (
          <>
            <IconButton icon={<BackIcon />} label="Back" onClick={() => navigate(-1)} />
            <IconButton icon={<ForwardIcon />} label="Forward" onClick={() => navigate(1)} />
            <div className="relative">
              <IconButton icon={<MoreIcon />} label="More actions" onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === 'more' ? null : 'more'); }} />
              {openMenu === 'more' && (
                <div className="toolbar-menu left-0" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => { setOpenMenu(null); void updateSettings({ focusMode: false }); }}>
                    <FocusIcon /> Exit focus mode (Esc)
                  </button>
                  <div className="my-1 border-t border-[var(--line)]" />
                  {!isNewNote && !loadedNote?.isDeleted ? (
                    <>
                      <button type="button" onClick={() => { setOpenMenu(null); setFoldersDialogOpen(true); }}>
                        <FolderMoveIcon /> Add to notebooks
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); setExportOpen(true); }}>
                        <ExportIcon /> Export…
                      </button>
                      <button type="button" onClick={() => void shareText()}>
                        <TextIcon /> Copy as text
                      </button>
                      <button type="button" onClick={() => void shareLink()}>
                        <LinkIcon /> Copy link
                      </button>
                      <button type="button" onClick={() => void shareImage()}>
                        <ImageIcon /> Save as image
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); setHistoryOpen(true); }}>
                        <HistoryIcon /> Version history
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); void handleToggleStar(); }}>
                        <StarIcon /> {loadedNote?.isStarred ? 'Remove from favourites' : 'Add to favourites'}
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); void updateSettings({ typewriterMode: !typewriter }); }}>
                        <TypewriterIcon /> {typewriter ? 'Turn off typewriter mode' : 'Typewriter mode'}
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => { setOpenMenu(null); navigate('/notes'); }}>
                      <BackIcon /> Back to notes
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1" />
            {!isNewNote && !loadedNote?.isDeleted && (
              <>
                <IconButton icon={<DuplicateIcon />} label="Duplicate note" onClick={() => void handleDuplicate()} />
                <IconButton
                  icon={loadedNote?.isPinned ? <PinFilledIcon /> : <PinIcon />}
                  label={loadedNote?.isPinned ? 'Unpin' : 'Pin'}
                  variant={loadedNote?.isPinned ? 'primary' : 'ghost'}
                  onClick={handleTogglePin}
                />
              </>
            )}
          </>
        )}
        {!focusMode && (
          <>
        <IconButton
          icon={<BackIcon />}
          label="Back to notes"
          onClick={() => navigate('/notes')}
          className="lg:hidden"
        />
        <div className="flex-1" />

        {!isNewNote && loadedNote?.isDeleted ? (
          <>
            <span className="mr-1 text-[11px] font-medium text-[var(--warm)]">In trash</span>
            <IconButton
              icon={<RestoreIcon />}
              label="Restore Note"
              variant="primary"
              onClick={async () => {
                if (localNoteId) {
                  await noteService.restoreNote(localNoteId);
                  navigate('/notes');
                }
              }}
            />
            <IconButton
              icon={<TrashIcon />}
              label="Delete Permanently"
              variant="danger"
              onClick={async () => {
                if (localNoteId && confirm('Delete this note permanently? This cannot be undone.')) {
                  await noteService.permanentlyDeleteNote(localNoteId);
                  navigate('/notes/trash');
                }
              }}
            />
          </>
        ) : (
          <>
            {/* Share */}
            <div className="relative">
              <IconButton icon={<ShareIcon />} label="Share note" disabled={!localNoteId} onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === 'share' ? null : 'share'); }} />
              {openMenu === 'share' && (
                <div className="toolbar-menu menu-right" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => void shareText()}><TextIcon /> Copy as text</button>
                  <button type="button" onClick={() => void shareLink()}><LinkIcon /> Copy link</button>
                  <button type="button" onClick={() => void shareImage()}><ImageIcon /> Save as image</button>
                </div>
              )}
            </div>

            {!isNewNote && (
              <>
                <IconButton
                  icon={loadedNote?.isPinned ? <PinFilledIcon /> : <PinIcon />}
                  label={loadedNote?.isPinned ? 'Unpin' : 'Pin'}
                  variant={loadedNote?.isPinned ? 'primary' : 'ghost'}
                  onClick={handleTogglePin}
                />
                <IconButton
                  icon={loadedNote?.isStarred ? <StarFilledIcon /> : <StarIcon />}
                  label={loadedNote?.isStarred ? 'Remove from favourites' : 'Add to favourites'}
                  variant={loadedNote?.isStarred ? 'primary' : 'ghost'}
                  onClick={handleToggleStar}
                />
                {/* Overflow menu — the rest of the actions live here (guide Task 6) */}
                <div className="relative">
                  <IconButton icon={<MoreIcon />} label="More actions" onClick={(event) => { event.stopPropagation(); setOpenMenu(openMenu === 'more' ? null : 'more'); }} />
                  {openMenu === 'more' && (
                    <div className="toolbar-menu menu-right" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={() => { setOpenMenu(null); void updateSettings({ focusMode: !focusMode }); }}>
                        <FocusIcon /> {focusMode ? 'Exit focus mode' : 'Focus mode'}
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); setFoldersDialogOpen(true); }}>
                        <FolderMoveIcon /> Add to notebooks
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); setHistoryOpen(true); }}>
                        <HistoryIcon /> Version history…
                      </button>
                      <div className="my-1 border-t border-[var(--line)]" />
                      <button type="button" onClick={() => void handleDuplicate()}>
                        <DuplicateIcon /> Duplicate
                      </button>
                      <button type="button" onClick={() => { setOpenMenu(null); setExportOpen(true); }}>
                        <ExportIcon /> Export…
                      </button>
                      <div className="my-1 border-t border-[var(--line)]" />
                      <button type="button" className="text-red-600 dark:text-red-400" onClick={() => { setOpenMenu(null); void handleTrash(); }}>
                        <TrashIcon /> Move to trash
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
          </>
        )}

        {shareFeedback && <span className="ml-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{shareFeedback}</span>}
      </div>

      {/* Multi-folder membership sheet */}
      <NoteFoldersDialog
        open={foldersDialogOpen}
        currentFolderIds={loadedNote?.folderIds ?? (loadedNote?.folderId ? [loadedNote.folderId] : [])}
        onClose={() => setFoldersDialogOpen(false)}
        onSave={saveFolders}
      />

      {/* Export sheet (Text / HTML / PDF / Markdown) */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={title || 'Untitled'}
        getHtml={() => editor?.getHTML() ?? ''}
        getText={() => editor?.getText({ blockSeparator: '\n\n' }) ?? extractPlainText(content)}
        createdAt={loadedNote?.createdAt}
        updatedAt={loadedNote?.updatedAt}
      />

      {/* Scrollable content */}
      <div ref={scrollRef} onScroll={handleScrollMemory} className={`relative min-h-0 flex-1 overflow-y-auto ${typewriter ? 'typewriter-content' : ''}`}>
        {typewriter && (
          <div className="sticky top-2 z-10 mx-auto w-fit">
            <span className="flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1 text-[11.5px] text-[var(--muted)] shadow-sm">
              Typewriter mode
              <button type="button" onClick={() => void updateSettings({ typewriterMode: false })} aria-label="Exit typewriter mode" className="text-[var(--muted)] hover:text-[var(--ink)]">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
              </button>
            </span>
          </div>
        )}
        {/* Reading column — capped for readability but anchored to the left edge */}
        <div className="w-full max-w-[720px] px-5 sm:px-10">
          {/* Title + tags */}
          <div>
          <div className="pt-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full border-none bg-transparent font-serif text-[30px] font-bold leading-tight text-[var(--ink)] outline-none placeholder:text-[var(--muted)]/35"
              autoFocus={isNewNote}
            />
          </div>

          {/* Tags */}
          <div className="mb-1 mt-2.5 flex flex-wrap items-center gap-1.5">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="cursor-pointer rounded border border-[var(--line)] bg-[var(--panel-soft)] px-1.5 py-px text-[11px] font-medium leading-4 hover:border-[var(--muted)]/50"
                onClick={() => setTags(tags.filter((_, i) => i !== index))}
              >
                {tag}
                <span className="ml-1 opacity-60">×</span>
              </span>
            ))}
            <input
              type="text"
              placeholder="+ Tag"
              className="w-24 border-none bg-transparent px-1 py-0.5 text-xs text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.preventDefault();
                  const newTag = e.currentTarget.value.trim();
                  if (!tags.includes(newTag)) {
                    setTags([...tags, newTag]);
                  }
                  e.currentTarget.value = '';
                } else if (e.key === 'Escape') {
                  e.currentTarget.value = '';
                  e.currentTarget.blur();
                }
              }}
              onBlur={(e) => {
                e.currentTarget.value = '';
              }}
            />
          </div>
          </div>
        </div>

        {/* Editor content */}
        <div ref={editorAreaRef} className="w-full px-5 sm:px-8">
          <TiptapEditor
            noteId={localNoteId || undefined}
            content={content}
            onChange={setContent}
            placeholder="Type / for menu..."
            showToolbar={false}
            onEditorReady={setEditor}
          />
        </div>
      </div>

      {/* Formatting toolbar — docked at the bottom, full width (UpNote-style) */}
      <div className="relative flex flex-none items-center border-t border-[var(--line)] bg-[var(--panel)]">
        <div className="min-w-0 flex-1 px-2 py-1.5 sm:px-3">
          {editor ? <EditorToolbar editor={editor} /> : <div className="h-8" />}
        </div>
        <IconButton
          icon={<InfoIcon />}
          label="Table of contents & note info"
          variant={infoOpen ? 'primary' : 'ghost'}
          onClick={(event) => {
            event.stopPropagation();
            setInfoOpen(!infoOpen);
          }}
        />
        <IconButton
          icon={<TypewriterIcon />}
          label={typewriter ? 'Turn off typewriter mode' : 'Typewriter mode — keep typing centered'}
          variant={typewriter ? 'primary' : 'ghost'}
          onClick={() => void updateSettings({ typewriterMode: !typewriter })}
        />
        <span className="flex-none px-3 text-[11px] tabular-nums text-[var(--muted)]">{wordCount} words</span>

        {/* Table of contents + note info (collapsible: chevron hides the info rows) */}
        {infoOpen && (
          <div
            className="app-panel absolute bottom-full right-2 z-40 mb-2 w-80 rounded-lg p-3 shadow-xl shadow-black/10"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[10.5px] font-semibold uppercase tracking-[.11em] text-[var(--muted)]">Contents</p>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setInfoCollapsed(!infoCollapsed)}
                  className="pressable rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
                  aria-label={infoCollapsed ? 'Show note info' : 'Show table of contents only'}
                  title={infoCollapsed ? 'Expand — show note info' : 'Collapse — table of contents only'}
                >
                  {infoCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </button>
                <button
                  type="button"
                  onClick={() => setInfoOpen(false)}
                  className="pressable rounded p-1 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
                  aria-label="Close"
                  title="Close"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {toc.length ? (
                toc.map((item) => (
                  <button
                    key={`${item.pos}-${item.text}`}
                    type="button"
                    onClick={() => jumpToHeading(item.pos)}
                    className="pressable flex w-full items-center rounded-md py-1 pr-1.5 text-left text-[12.5px] text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
                    style={{ paddingLeft: 8 + (item.level - 1) * 14 }}
                    title={`Jump to "${item.text}"`}
                  >
                    <span className="min-w-0 flex-1 truncate">{item.text || 'Untitled'}</span>
                  </button>
                ))
              ) : (
                <p className="px-2 py-2 text-[12px] text-[var(--muted)]">No headings yet — add one with / or the H button and it will show up here.</p>
              )}
            </div>

            {!infoCollapsed && (
              <div className="mt-2 space-y-1 border-t border-[var(--line)] pt-2 text-[11.5px] text-[var(--muted)]">
                <p className="flex items-center justify-between gap-3">
                  <span>Created</span>
                  <span className="text-[var(--ink)]">{loadedNote?.createdAt ? new Date(loadedNote.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>Last updated</span>
                  <span className="text-[var(--ink)]">{loadedNote?.updatedAt ? new Date(loadedNote.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span>Characters</span>
                  <span className="tabular-nums text-[var(--ink)]">{extractPlainText(content).length}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* "/" formatting menu */}
      {slash.state.open && (
        <div
          className="slash-menu"
          style={{ top: slash.state.top, left: slash.state.left }}
          onMouseDown={(event) => event.preventDefault()}
        >
          {slash.state.filtered.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={index === slash.state.activeIndex ? 'is-active' : ''}
              onMouseEnter={() => slash.setActive(index)}
              onClick={() => slash.applyAt(index)}
            >
              <span className="text-[var(--muted)]">{item.icon}</span>
              {item.label}
            </button>
          ))}
          {!slash.state.filtered.length && <p className="px-3 py-2 text-xs text-[var(--muted)]">No matches</p>}
        </div>
      )}
      <input
        ref={slashImageRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file || !editor) return;
          void import('@/lib/utils/image').then(async ({ fileToDataUrl }) => {
            const dataUrl = await fileToDataUrl(file);
            editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
          });
        }}
      />

      {/* Right-click menu */}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {/* Version history */}
      {localNoteId && (
        <VersionHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          noteId={localNoteId}
          currentTitle={title || 'Untitled'}
          currentHtml={editor?.getHTML() ?? ''}
          onRestore={async ({ title: restoreTitle, content: restoreContent }) => {
            await noteService.updateNote(localNoteId, { title: restoreTitle, content: restoreContent });
          }}
        />
      )}
    </div>
  );
}

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const ForwardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7-7 7m7-7H3" />
  </svg>
);

const InfoIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5" />
    <circle cx="12" cy="7.8" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m6 14 6-6 6 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m6 10 6 6 6-6" />
  </svg>
);

const PinIcon = () => (
  <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} viewBox="0 0 24 24">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

const PinFilledIcon = () => (
  <svg className="w-[17px] h-[17px]" fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} viewBox="0 0 24 24">
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
  </svg>
);

const StarIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z" />
  </svg>
);

const StarFilledIcon = () => (
  <svg className="w-[17px] h-[17px]" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const RestoreIcon = () => (
  <svg className="w-[17px] h-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const MoreIcon = () => (
  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
    <circle cx="5.5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="18.5" cy="12" r="1.6" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4.5 6.5v4h4" />
    <path d="M4.9 10.5a8 8 0 1 1-.9 3" />
    <path d="M12 8.5V12l2.6 1.8" />
  </svg>
);

const FocusIcon = () => (
  <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M4 9V6.5A2.5 2.5 0 0 1 6.5 4H9m6 0h2.5A2.5 2.5 0 0 1 20 6.5V9m0 6v2.5a2.5 2.5 0 0 1-2.5 2.5H15M9 20H6.5A2.5 2.5 0 0 1 4 17.5V15" /><circle cx="12" cy="12" r="2.6" /></svg>
);

const TypewriterIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 5.5h16M4 18.5h16" />
    <path d="M12 9v6" />
    <path d="m9.4 12.4 2.6 2.6 2.6-2.6" opacity=".55" />
  </svg>
);

const DuplicateIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
);

const ExportIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 15V4m0 0L8 8m4-4 4 4" />
    <path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14" />
  </svg>
);


const FolderMoveIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3.75 7.25A2.25 2.25 0 0 1 6 5h4l2 2h6A2.25 2.25 0 0 1 20.25 9.25v8A2.75 2.75 0 0 1 17.5 20h-11a2.75 2.75 0 0 1-2.75-2.75v-10Z" />
    <path d="M9.5 13.5h5m0 0-1.8-1.8m1.8 1.8-1.8 1.8" />
  </svg>
);

const ShareIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="6" cy="12" r="2.5" /><circle cx="17.5" cy="5.5" r="2.5" /><circle cx="17.5" cy="18.5" r="2.5" />
    <path d="m8.3 10.7 7-4m-7 6.6 7 4" />
  </svg>
);

const TextIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24">
    <path d="M5 6.5h14M9.5 6.5V18m5-6.5V18" />
  </svg>
);

const LinkIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M13.8 10.2a4 4 0 0 0-5.6 0l-4 4a4 4 0 1 0 5.6 5.6l1.1-1.1m-.7-4.9a4 4 0 0 0 5.6 0l4-4a4 4 0 0 0-5.6-5.6l-1.1 1.1" />
  </svg>
);

const ImageIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.4" /><path d="m3.5 16.5 4.5-4 3.5 3 3.5-3 5.5 4.5" />
  </svg>
);

export default NoteEditor;
