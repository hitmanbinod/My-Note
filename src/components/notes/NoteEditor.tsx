import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNote } from '@/hooks/useNotes';
import { noteService } from '@/services/NoteService';
import TiptapEditor from '@/components/editor/TiptapEditor';
import IconButton from '@/components/ui/IconButton';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { JSONContent } from '@tiptap/react';
import { debounce } from '@/lib/utils/debounce';
import { extractPlainText, countWords } from '@/lib/utils/text';

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

  // Use ref to track if initial load happened to prevent overwriting user input
  const initialized = useRef(false);

  // Use refs for latest state to avoid dependency cycles in debounce
  const stateRef = useRef({ title, content, tags, localNoteId });
  useEffect(() => {
    stateRef.current = { title, content, tags, localNoteId };
  }, [title, content, tags, localNoteId]);

  // Load note data ONLY when loadedNote changes and not initialized yet
  useEffect(() => {
    if (loadedNote && !initialized.current) {
      setTitle(loadedNote.title);
      setContent(loadedNote.content);
      setTags(loadedNote.tags);
      setLocalNoteId(loadedNote.id);
      initialized.current = true;
    }
  }, [loadedNote]);

  // Auto-save function reference that doesn't change
  const autoSave = useCallback(
    debounce(async () => {
      const { localNoteId: currentId, title: currentTitle, content: currentContent, tags: currentTags } = stateRef.current;
      
      if (!currentId && !currentTitle.trim() && (!currentContent.content || currentContent.content.length === 0 || (currentContent.content.length === 1 && !currentContent.content[0]?.content))) {
        return;
      }

      try {
        setIsSaving(true);
        
        if (currentId) {
          // Update existing note
          await noteService.updateNote(currentId, { title: currentTitle, content: currentContent, tags: currentTags });
        } else {
          // Create new note
          const newNote = await noteService.createNote({ title: currentTitle, content: currentContent, tags: currentTags });
          setLocalNoteId(newNote.id);
          initialized.current = true; // Mark as initialized so we don't overwrite with incoming data
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

  // Trigger auto-save when content changes (but wait for initial load if editing)
  useEffect(() => {
    if (!loading && (isNewNote || initialized.current)) {
      autoSave();
    }
  }, [title, content, tags, autoSave, loading, isNewNote]);

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

  // Correct word count using plain text extraction
  const plainText = extractPlainText(content);
  const wordCount = countWords(plainText);

  if (loading && !isNewNote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // Note not found
  if (!loading && !isNewNote && !loadedNote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Note not found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">The note you are looking for does not exist or has been deleted.</p>
        <button 
          onClick={() => navigate('/notes')}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          Go back to Notes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 lg:p-8">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <IconButton
          icon={<BackIcon />}
          label="Back to notes"
          onClick={() => navigate('/notes')}
        />
        
        <div className="flex-1" />

        {!isNewNote && loadedNote?.isDeleted ? (
          <>
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
          </>
        )}

        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 ml-2">
            <Spinner size="sm" />
            <span className="hidden sm:inline">Saving...</span>
          </div>
        )}
        {!isSaving && localNoteId && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 ml-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Saved</span>
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

      {/* Editor */}
      <TiptapEditor
        noteId={localNoteId || undefined}
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

const RestoreIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export default NoteEditor;
