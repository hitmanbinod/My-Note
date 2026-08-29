import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNote } from '@/hooks/useNotes';
import { noteService } from '@/services/NoteService';
import TiptapEditor from '@/components/editor/TiptapEditor';
import Input from '@/components/ui/Input';
import IconButton from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { JSONContent } from '@tiptap/react';
import { debounce } from '@/lib/utils/debounce';
import { countWords } from '@/lib/utils/text';

function NoteEditor() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const isNewNote = noteId === undefined;

  const { note: loadedNote, loading } = useNote(noteId);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent>({ type: 'doc', content: [] });
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [localNoteId, setLocalNoteId] = useState<string | null>(null);

  // Load note data
  useEffect(() => {
    if (loadedNote) {
      setTitle(loadedNote.title);
      setContent(loadedNote.content);
      setTags(loadedNote.tags);
      setLocalNoteId(loadedNote.id);
    }
  }, [loadedNote]);

  // Auto-save function
  const autoSave = useCallback(
    debounce(async (noteId: string | null, title: string, content: JSONContent, tags: string[]) => {
      try {
        setIsSaving(true);
        
        if (noteId) {
          // Update existing note
          await noteService.updateNote(noteId, { title, content, tags });
        } else {
          // Create new note
          const newNote = await noteService.createNote({ title, content, tags });
          setLocalNoteId(newNote.id);
          navigate(`/notes/${newNote.id}`, { replace: true });
        }
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [navigate]
  );

  // Trigger auto-save when content changes
  useEffect(() => {
    if (title || content.content?.length) {
      autoSave(localNoteId, title, content, tags);
    }
  }, [title, content, tags, localNoteId, autoSave]);

  const handleDelete = async () => {
    if (!localNoteId) return;
    
    if (confirm('Move this note to trash?')) {
      await noteService.deleteNote(localNoteId);
      navigate('/notes');
    }
  };

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

  const wordCount = countWords(content.content?.map(n => JSON.stringify(n)).join('') || '');

  if (loading && !isNewNote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <IconButton
          icon={<BackIcon />}
          label="Back to notes"
          onClick={() => navigate('/notes')}
        />
        
        <div className="flex-1" />

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
              label={loadedNote?.isStarred ? 'Unstar' : 'Star'}
              variant={loadedNote?.isStarred ? 'primary' : 'ghost'}
              onClick={handleToggleStar}
            />
          </>
        )}

        <IconButton
          icon={<TrashIcon />}
          label="Delete"
          variant="danger"
          onClick={handleDelete}
          disabled={!localNoteId}
        />

        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Spinner size="sm" />
            <span>Saving...</span>
          </div>
        )}
        {!isSaving && localNoteId && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full text-3xl font-bold border-none outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
          autoFocus={isNewNote}
        />
      </div>

      {/* Tags */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="default"
            className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
            onClick={() => setTags(tags.filter((_, i) => i !== index))}
          >
            {tag}
            <span className="ml-1">×</span>
          </Badge>
        ))}
        <input
          type="text"
          placeholder="Add tag..."
          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
              e.preventDefault();
              const newTag = e.currentTarget.value.trim();
              if (!tags.includes(newTag)) {
                setTags([...tags, newTag]);
              }
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      {/* Editor */}
      <TiptapEditor
        content={content}
        onChange={setContent}
        placeholder="Start writing..."
        className="mb-4"
      />

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <span>{wordCount} words</span>
        {loadedNote && (
          <span>Last edited {new Date(loadedNote.updatedAt).toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

// Icons
const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const PinIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

const PinFilledIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const StarFilledIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default NoteEditor;
