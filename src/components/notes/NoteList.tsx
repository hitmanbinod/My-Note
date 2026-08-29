import { Note } from '@/types';
import NoteCard from './NoteCard';
import Spinner from '@/components/ui/Spinner';

interface NoteListProps {
  notes: Note[];
  loading?: boolean;
  view?: 'list' | 'grid';
  emptyMessage?: string;
}

function NoteList({ notes, loading, view = 'list', emptyMessage = 'No notes yet' }: NoteListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <svg
          className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-gray-500 dark:text-gray-400 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  if (view === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} view="grid" />
        ))}
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} view="list" />
      ))}
    </div>
  );
}

export default NoteList;
