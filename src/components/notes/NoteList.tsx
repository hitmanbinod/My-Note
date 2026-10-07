import { Note } from '@/types';
import NoteCard from './NoteCard';
import Spinner from '@/components/ui/Spinner';

function NoteList({ notes, loading, view = 'list', trash, activeId, emptyTitle = 'Nothing here yet', emptyMessage, onNoteContextMenu }: { notes: Note[]; loading?: boolean; view?: 'list' | 'grid'; trash?: boolean; activeId?: string; emptyTitle?: string; emptyMessage: string; onNoteContextMenu?: (event: React.MouseEvent, note: Note) => void }) {
  if (loading) return <div className="flex min-h-[360px] items-center justify-center"><Spinner size="lg" /></div>;
  if (!notes.length) return (
    <div className="flex min-h-[390px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--panel-soft)] text-[var(--muted)]"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M7 4.5h8.5A2.5 2.5 0 0 1 18 7v10a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeWidth="1.6" d="M9 9h5M9 12.5h5" /></svg></div>
      <h2 className="font-serif text-base font-semibold text-[var(--ink)]">{emptyTitle}</h2>
      <p className="mt-1.5 max-w-[26ch] text-[13px] leading-relaxed text-[var(--muted)]">{emptyMessage}</p>
      {!trash && <p className="mt-2 text-xs text-[var(--muted)]">Press Ctrl+N to start a new one.</p>}
    </div>
  );
  if (view === 'grid') return <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">{notes.map(note => <NoteCard key={note.id} note={note} view={view} trash={trash} active={note.id === activeId} onContextMenu={onNoteContextMenu ? (event) => onNoteContextMenu(event, note) : undefined} />)}</div>;
  return <div>{notes.map(note => <NoteCard key={note.id} note={note} view={view} trash={trash} active={note.id === activeId} onContextMenu={onNoteContextMenu ? (event) => onNoteContextMenu(event, note) : undefined} />)}</div>;
}
export default NoteList;
