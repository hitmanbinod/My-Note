import { useEditor, EditorContent, JSONContent, Editor, BubbleMenu } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { getEditorExtensions } from '@/lib/editor/extensions';
import { resolvePaste } from '@/lib/editor/paste';
import EditorToolbar from './EditorToolbar';

interface TiptapEditorProps {
  noteId?: string;
  content: JSONContent;
  onChange?: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  /** Render the formatting toolbar inside this component (default true). */
  showToolbar?: boolean;
  /** Receives the editor instance once created (for externally-docked toolbars). */
  onEditorReady?: (editor: Editor | null) => void;
  /** Reader mode: no bubble menu, no paste pipeline — purely for reading. */
  reader?: boolean;
}

function BubbleButton({ active, label, run, children }: { active?: boolean; label: string; run: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => { if (event.button === 0) event.preventDefault(); }}
      onClick={run}
      className={`flex h-7 w-7 items-center justify-center rounded-md text-[13px] leading-none hover:bg-[var(--panel-soft)] ${active ? 'text-[var(--brand)]' : 'text-[var(--ink)]'} [&>svg]:h-3.5 [&>svg]:w-3.5`}
    >
      {children}
    </button>
  );
}

function TiptapEditor({
  noteId,
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  className = '',
  showToolbar = true,
  onEditorReady,
  reader = false
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert prose-blockquote:font-normal prose-blockquote:not-italic max-w-none focus:outline-none min-h-[200px]'
      },
      // Highlight paint mode (toolbar latches it): releasing a drag applies
      // the highlight mark with the chosen color.
      handleDOMEvents: {
        mouseup: (view) => {
          if (!view.dom.classList.contains('highlight-painting')) return false;
          const { empty, from, to } = view.state.selection;
          if (empty || from === to) return false;
          const color = view.dom.dataset.highlightColor || '#ec6aa8';
          const mark = view.state.schema.marks.highlight!.create({ color });
          view.dispatch(view.state.tr.addMark(from, to, mark));
          return false;
        }
      }
    }
  });

  // Keep track of the currently loaded note ID to prevent content reset on auto-save
  const currentNoteIdRef = useRef<string | undefined>();

  // Update editor content when note ID changes (for loading a different note)
  useEffect(() => {
    if (editor && noteId !== currentNoteIdRef.current) {
      editor.commands.setContent(content);
      currentNoteIdRef.current = noteId;
    }
  }, [editor, noteId, content]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // AI-chat / Markdown paste pipeline: copy-button Markdown becomes real
  // formatting; rich HTML from ChatGPT/Claude/… is cleaned (code blocks keep
  // their language, tables keep their shape, UI chrome is dropped).
  // The listener runs in the CAPTURE phase on the wrapper (an ancestor of the
  // editor DOM) so a handled paste never reaches ProseMirror's own paste
  // handler — otherwise the content is inserted twice.
  const pasteContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!editor || reader) return undefined;
    const container = pasteContainerRef.current;
    if (!container) return undefined;
    const onPaste = (event: ClipboardEvent) => {
      if (!event.clipboardData || editor.isActive('codeBlock') || editor.isActive('code')) return;
      const text = event.clipboardData.getData('text/plain') ?? '';
      const html = event.clipboardData.getData('text/html') ?? '';
      const decision = resolvePaste(text, html);
      if (decision.html) {
        event.preventDefault();
        event.stopPropagation();
        editor.chain().focus().insertContent(decision.html).run();
      }
    };
    container.addEventListener('paste', onPaste, true);
    return () => container.removeEventListener('paste', onPaste, true);
  }, [editor, reader]);

  // Expose the editor instance upward for docked toolbars
  useEffect(() => {
    onEditorReady?.(editor ?? null);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  if (!editor) {
    return <div className={`min-h-[280px] animate-pulse rounded-md bg-[var(--panel-soft)] ${className}`} />;
  }

  return (
    <div className={className} ref={pasteContainerRef}>
      {showToolbar && (
        <div className="sticky top-0 z-[5] -mx-5 mb-2 border-b border-[var(--line)] bg-[var(--app-bg)]/95 px-2 py-1 backdrop-blur sm:-mx-8 sm:px-3">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />

      {/* Selection bubble — formatting applies to the selected text, like every mainstream editor */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ placement: 'top', offset: [0, 8] }}
        shouldShow={({ editor: current }) => {
          if (reader) return false;
          const { state } = current;
          const { selection } = state;
          const selectionEmpty = selection.empty;
          // Stay out of the way for atom nodes and table cell selections
          const isAtom = Boolean(selection.$from.parent.type.spec.atom || selection.$to.parent.type.spec.atom);
          const inTable = state.selection.$from.node(1)?.type.name === 'table';
          return current.isFocused && !selectionEmpty && !isAtom && !inTable;
        }}
      >
        <div className="flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1 shadow-lg shadow-black/10">
          <BubbleButton label="Bold" active={editor.isActive('bold')} run={() => editor.chain().focus().toggleBold().run()}><BIcon /></BubbleButton>
          <BubbleButton label="Italic" active={editor.isActive('italic')} run={() => editor.chain().focus().toggleItalic().run()}><IIcon /></BubbleButton>
          <BubbleButton label="Underline" active={editor.isActive('underline')} run={() => editor.chain().focus().toggleUnderline().run()}><UIcon /></BubbleButton>
          <BubbleButton label="Strikethrough" active={editor.isActive('strike')} run={() => editor.chain().focus().toggleStrike().run()}><SIcon /></BubbleButton>
          <BubbleButton label="Highlight" active={editor.isActive('highlight')} run={() => editor.chain().focus().toggleHighlight().run()}><HighlightBubbleIcon /></BubbleButton>
          <BubbleButton label="Code" active={editor.isActive('code')} run={() => editor.chain().focus().toggleCode().run()}><CodeBubbleIcon /></BubbleButton>
        </div>
      </BubbleMenu>
    </div>
  );
}

const BIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7V5Zm0 7h7.5a3.5 3.5 0 0 1 0 7H7v-7Z" /></svg>;
const IIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 5h8M6 19h8m2-14-4 14" /></svg>;
const UIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 4.5v6.5a5 5 0 0 0 10 0V4.5M5.5 20h13" /></svg>;
const SIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12h16" /></svg>;
const HighlightBubbleIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 15-4 4m1.5-6.5 7-7a2.1 2.1 0 0 1 3 0l2 2a2.1 2.1 0 0 1 0 3l-7 7h-4l-1-1v-4Z" /></svg>;
const CodeBubbleIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8.5 8-4.5 4 4.5 4m7-8 4.5 4-4.5 4" /></svg>;

export default TiptapEditor;
