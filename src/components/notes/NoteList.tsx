import { Link } from 'react-router-dom';
import { Note } from '@/types';
import NoteCard from './NoteCard';
import Spinner from '@/components/ui/Spinner';

function NoteList({ notes, loading, view, trash, emptyTitle, emptyMessage }: { notes: Note[]; loading?: boolean; view: 'list' | 'grid'; trash?: boolean; emptyTitle: string; emptyMessage: string }) {
  if (loading) return <div className="app-panel flex min-h-[360px] items-center justify-center rounded-2xl"><Spinner size="lg" /></div>;
  if (!notes.length) return (
    <div className="app-panel flex min-h-[390px] flex-col items-center justify-center rounded-2xl px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 dark:bg-primary-900/25 dark:text-primary-300 dark:ring-primary-900"><svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M7 4.5h8.5A2.5 2.5 0 0 1 18 7v10a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeWidth="1.7" d="M9 9h5M9 12.5h5" /></svg></div>
      <h2 className="text-lg font-bold tracking-tight text-[var(--ink)]">{emptyTitle}</h2><p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{emptyMessage}</p>
      {!trash && <Link to="/notes/new" className="pressable mt-6 flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>Write a note</Link>}
    </div>
  );
  return <div className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'app-panel overflow-hidden rounded-2xl'}>{notes.map(note => <NoteCard key={note.id} note={note} view={view} trash={trash} />)}</div>;
}
export default NoteList;
