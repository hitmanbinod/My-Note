import { Editor } from '@tiptap/react';
import { useCallback, useState } from 'react';
import IconButton from '@/components/ui/IconButton';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useLiveQuery } from 'dexie-react-hooks';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';

interface EditorToolbarProps {
  editor: Editor;
}

function EditorToolbar({ editor }: EditorToolbarProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const boards = useLiveQuery(() => whiteboardsRepository.list(), [], []);

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

  return (
    <>
      <div className="flex flex-nowrap gap-1 overflow-x-auto border-b border-[var(--line)] bg-[color:var(--panel)]/95 px-3 py-2 backdrop-blur-lg sm:px-5">
        {/* Text formatting */}
        <div className="flex gap-0.5 border-r border-[var(--line)] pr-2">
          <IconButton
            icon={<BoldIcon />}
            label="Bold (Ctrl+B)"
            variant={editor.isActive('bold') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <IconButton
            icon={<ItalicIcon />}
            label="Italic (Ctrl+I)"
            variant={editor.isActive('italic') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <IconButton
            icon={<UnderlineIcon />}
            label="Underline (Ctrl+U)"
            variant={editor.isActive('underline') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <IconButton
            icon={<StrikeIcon />}
            label="Strikethrough"
            variant={editor.isActive('strike') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
        </div>

        {/* Headings */}
        <div className="flex gap-0.5 border-r border-[var(--line)] px-2">
          <IconButton
            icon={<H1Icon />}
            label="Heading 1"
            variant={editor.isActive('heading', { level: 1 }) ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <IconButton
            icon={<H2Icon />}
            label="Heading 2"
            variant={editor.isActive('heading', { level: 2 }) ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <IconButton
            icon={<H3Icon />}
            label="Heading 3"
            variant={editor.isActive('heading', { level: 3 }) ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
        </div>

        {/* Lists */}
        <div className="flex gap-0.5 border-r border-[var(--line)] px-2">
          <IconButton
            icon={<BulletListIcon />}
            label="Bullet List"
            variant={editor.isActive('bulletList') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <IconButton
            icon={<OrderedListIcon />}
            label="Numbered List"
            variant={editor.isActive('orderedList') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <IconButton
            icon={<TaskListIcon />}
            label="Task List"
            variant={editor.isActive('taskList') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          />
        </div>

        {/* Other */}
        <div className="flex gap-0.5 pl-1">
          <IconButton
            icon={<LinkIcon />}
            label="Link (Ctrl+K)"
            variant={editor.isActive('link') ? 'primary' : 'ghost'}
            onClick={handleSetLink}
          />
          <IconButton
            icon={<CodeIcon />}
            label="Code Block"
            variant={editor.isActive('codeBlock') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
          <IconButton
            icon={<QuoteIcon />}
            label="Quote"
            variant={editor.isActive('blockquote') ? 'primary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <IconButton
            icon={<BoardIcon />}
            label="Insert whiteboard"
            onClick={() => setShowBoardModal(true)}
          />
        </div>
      </div>

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
        {boards.length ? (
          <div className="space-y-2">
            {boards.map(board => (
              <button
                key={board.id}
                type="button"
                onClick={() => insertBoard(board.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] p-3 text-left hover:bg-[var(--panel-soft)]"
              >
                {board.previewDataUrl ? <img src={board.previewDataUrl} alt="" className="h-14 w-20 rounded bg-white object-contain" /> : <span className="flex h-14 w-20 items-center justify-center rounded bg-[var(--panel-soft)]"><BoardIcon /></span>}
                <span className="truncate text-sm font-semibold text-[var(--ink)]">{board.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">No whiteboards yet. <a href="/whiteboards" className="font-semibold text-primary-600 hover:underline">Create whiteboard</a></p>
        )}
      </Modal>
    </>
  );
}

// Icon components
const BoldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6V4zm0 8h9a4 4 0 014 4 4 4 0 01-4 4H6v-8z" />
  </svg>
);

const ItalicIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4l-4 16h-4" />
  </svg>
);

const UnderlineIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 19h12M8 5v7a4 4 0 008 0V5" />
  </svg>
);

const StrikeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18M9 5c2-1 4-1 6 0M9 19c2 1 4 1 6 0" />
  </svg>
);

const H1Icon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h3v12H4m3-6h6m3 6V6h3m-3 0v12" />
  </svg>
);

const H2Icon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h3v12H3m3-6h5m3 6V6h3m-3 0v12m4 0h3a2 2 0 002-2v-2a2 2 0 00-2-2h-3v-4h5" />
  </svg>
);

const H3Icon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h3v12H3m3-6h5m3 6V6h3m-3 0v12m4 0h3a2 2 0 002-2v-2a2 2 0 00-2-2h-3m3-2a2 2 0 00-2-2h-1v-4h4" />
  </svg>
);

const BulletListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const OrderedListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01" />
  </svg>
);

const TaskListIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const QuoteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
);

const BoardIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 4.5h15v15h-15zM8 15l3-4 2 2 3-4" />
  </svg>
);

export default EditorToolbar;
