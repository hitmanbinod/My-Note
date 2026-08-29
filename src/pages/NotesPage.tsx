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
    if (filter?.isStarred) return 'Star your favorite notes to find them here';
    if (filter?.isArchived) return 'Archived notes are kept here';
    if (filter?.isDeleted) return 'Notes you delete will appear here for recovery';
    return 'Create your first note to get started!';
  };

  const isLoading = searchQuery ? isSearching : loading;
  const emptyTitle = filter?.isStarred
    ? 'No starred notes'
    : filter?.isArchived
      ? 'No archived notes'
      : filter?.isDeleted
        ? 'Trash is empty'
        : searchQuery
          ? 'No matching notes'
          : 'No notes yet';

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">{getTitle()}</h1>
        <span className="text-sm text-[var(--muted)]">
          {displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      <NoteList
        notes={displayNotes}
        loading={isLoading}
        view="list"
        trash={filter?.isDeleted}
        emptyTitle={emptyTitle}
        emptyMessage={getEmptyMessage()}
      />
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
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-[var(--ink)]">
          {folder?.color && (
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: folder.color }}>
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          )}
          {folder?.name || 'Loading Folder...'}
        </h1>
        <span className="text-sm text-[var(--muted)]">
          {displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      <NoteList
        notes={displayNotes}
        loading={isLoading}
        view="list"
        emptyTitle="This folder is empty"
        emptyMessage={getEmptyMessage()}
      />
    </div>
  );
}

export default NotesPage;
