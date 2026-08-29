import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { getEditorExtensions } from '@/lib/editor/extensions';
import EditorToolbar from './EditorToolbar';

interface TiptapEditorProps {
  noteId?: string;
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

function TiptapEditor({
  noteId,
  content,
  onChange,
  placeholder = 'Start writing...',
  editable = true,
  className = ''
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-3'
      }
    }
  });

  // Keep track of the currently loaded note ID to prevent content reset on auto-save
  const currentNoteIdRef = useRef<string | undefined>(noteId);

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

  if (!editor) {
    return <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded h-64" />;
  }

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 ${className}`}>
      {editable && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

export default TiptapEditor;
