import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import { useEffect } from 'react';
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

  // Update editor content when prop changes (for loading saved notes)
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

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
