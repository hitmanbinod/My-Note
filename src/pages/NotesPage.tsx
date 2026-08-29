import { Routes, Route, useSearchParams, useParams } from 'react-router-dom';
import { useNotes } from '@/hooks/useNotes';
import { useSearch } from '@/hooks/useSearch';
import { useFolder } from '@/hooks/useFolders';
import NoteList from '@/components/notes/NoteList';
import NoteEditor from '@/components/notes/NoteEditor';

function NotesPage() {
  return (
    <Routes>
      <Route index element={<NotesListView />} />
      <Route path="starred" element={<NotesListView filter={{ isStarred: true }} />} />
      <Route path="archived" element={<NotesListView filter={{ isArchived: true }} />} />
      <Route path="trash" element={<NotesListView filter={{ isDeleted: true }} />} />
      <Route path="folder/:folderId" element={<NotesFolderView />} />
      <Route path="new" element={<NoteEditor />} />
      <Route path=":noteId" element={<NoteEditor />} />
    </Routes>
  );
}

function NotesListView({ filter }: { filter?: any }) {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  const { notes, loading } = useNotes(filter);
  const { results: searchResults, isSearching } = useSearch(searchQuery || '', filter);

  // Use search results if searching, otherwise use filtered notes
  const displayNotes = searchQuery ? searchResults : notes;

  const getTitle = () => {
    if (filter?.isStarred) return 'Starred Notes';
    if (filter?.isArchived) return 'Archived Notes';
    if (filter?.isDeleted) return 'Trash';
    if (searchQuery) return `Search: "${searchQuery}"`;
    return 'All Notes';
  };

  const getEmptyMessage = () => {
    if (searchQuery) return 'No notes found matching your search';
    if (filter?.isStarred) return 'No starred notes yet';
    if (filter?.isArchived) return 'No archived notes';
    if (filter?.isDeleted) return 'Trash is empty';
    return 'No notes yet. Create your first note!';
  };

  const isLoading = searchQuery ? isSearching : loading;

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {getTitle()}
          </h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 min-h-[500px]">
        <NoteList
          notes={displayNotes}
          loading={isLoading}
          emptyMessage={getEmptyMessage()}
        />
      </div>
    </div>
  );
}

function NotesFolderView() {
  const { folderId } = useParams();
  const { folder } = useFolder(folderId);
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search');

  const { notes, loading } = useNotes({ folderId });
  const { results: searchResults, isSearching } = useSearch(searchQuery || '', { folderId });

  const displayNotes = searchQuery ? searchResults : notes;
  const isLoading = searchQuery ? isSearching : loading;

  const getEmptyMessage = () => {
    if (searchQuery) return 'No notes found in this folder matching your search';
    return 'This folder is empty. Create a note here!';
  };

  return (
    <div className="max-w-7xl mx-auto min-h-screen">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          {folder?.color && (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: folder.color }}>
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          )}
          {folder?.name || 'Loading Folder...'}
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      <div className="bg-white dark:bg-gray-800 min-h-[500px]">
        <NoteList
          notes={displayNotes}
          loading={isLoading}
          emptyMessage={getEmptyMessage()}
        />
      </div>
    </div>
  );
}

export default NotesPage;
