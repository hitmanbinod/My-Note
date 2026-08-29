import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { getEditorExtensions } from '@/lib/editor/extensions';
import EditorToolbar from './EditorToolbar';

interface TiptapEditorProps {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  className = ''
}: TiptapEditorProps) {
  const isUserInteraction = useRef(false);
  const markUserInteraction = () => {
    isUserInteraction.current = true;
    window.setTimeout(() => {
      isUserInteraction.current = false;
    }, 0);
  };
  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content,
    editable,
    // Tiptap also emits updates for internal document setup. Only forward an
    // update that follows a real keyboard, pointer, paste, or toolbar action.
    onUpdate: ({ editor }) => {
      if (isUserInteraction.current) onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none'
      }
    }
  });

  // Update editor content when prop changes (for loading saved notes)
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content, false);
    }
  }, [editor, content]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  if (!editor) {
    return <div className="h-64 animate-pulse bg-[var(--panel-soft)]" />;
  }

  return (
    <div className={`bg-[var(--panel)] ${className}`}>
      {editable && <div onPointerDownCapture={markUserInteraction}><EditorToolbar editor={editor} /></div>}
      <div
        onBeforeInputCapture={markUserInteraction}
        onKeyDownCapture={markUserInteraction}
        onPointerDownCapture={markUserInteraction}
        onPasteCapture={markUserInteraction}
        onCutCapture={markUserInteraction}
        onDropCapture={markUserInteraction}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default TiptapEditor;
