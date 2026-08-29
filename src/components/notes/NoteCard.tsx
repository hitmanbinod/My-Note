import { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Note } from '@/types';
import { noteService } from '@/services/NoteService';
import { formatRelativeTime } from '@/lib/utils/date';
import { generateExcerpt } from '@/lib/utils/text';

function NoteCard({ note, view, trash }: { note: Note; view: 'list' | 'grid'; trash?: boolean }) {
  const preview = generateExcerpt(note.plainTextContent || 'No additional text yet.', view === 'grid' ? 150 : 220);
  const restore = async (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); await noteService.restoreNote(note.id); };
  const remove = async (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); if (confirm('Permanently delete this note? This cannot be undone.')) await noteService.permanentlyDeleteNote(note.id); };
  const star = async (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); await noteService.toggleStar(note.id); };

  if (view === 'list') return (
    <article className="group relative flex items-center border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--panel-soft)]">
      <Link to={`/notes/${note.id}`} className="min-w-0 flex-1 px-5 py-4 sm:flex sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2">{note.isPinned && <PinIcon />}<h2 className="truncate text-sm font-bold text-[var(--ink)]">{note.title || 'Untitled'}</h2>{note.isStarred && <StarFilled />}</div><p className="mt-1 truncate text-xs text-[var(--muted)]">{preview}</p></div>
        <div className="mt-2 flex items-center gap-3 sm:mt-0"><Tags tags={note.tags} limit={2} /><time className="min-w-[70px] text-right text-[11px] text-[var(--muted)]">{formatRelativeTime(note.updatedAt)}</time></div>
      </Link>
      <CardActions trash={trash} onRestore={restore} onRemove={remove} onStar={star} starred={note.isStarred} />
    </article>
  );

  return (
    <article className="app-panel group relative min-h-[230px] overflow-hidden rounded-2xl transition-[transform,box-shadow,border-color] duration-200 [transition-timing-function:var(--ease-out)] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-[0_14px_38px_rgb(0_0_0/.07)] dark:hover:border-primary-800">
      {note.color && <div className="absolute inset-x-0 top-0 h-1" style={{ background: note.color }} />}
      <Link to={`/notes/${note.id}`} className="block h-full p-5">
        <div className="flex min-h-[28px] items-start gap-2 pr-16">{note.isPinned && <PinIcon />}<h2 className="line-clamp-2 flex-1 text-base font-bold leading-snug tracking-tight text-[var(--ink)]">{note.title || 'Untitled'}</h2>{note.isStarred && <StarFilled />}</div>
        <p className="mt-3 line-clamp-4 text-[13px] leading-6 text-[var(--muted)]">{preview}</p>
        <div className="absolute inset-x-5 bottom-4 flex items-center justify-between gap-3"><Tags tags={note.tags} limit={2} /><time className="ml-auto whitespace-nowrap text-[11px] font-medium text-[var(--muted)]">{formatRelativeTime(note.updatedAt)}</time></div>
      </Link>
      <CardActions trash={trash} onRestore={restore} onRemove={remove} onStar={star} starred={note.isStarred} />
    </article>
  );
}

function CardActions({ trash, onRestore, onRemove, onStar, starred }: { trash?: boolean; onRestore: (event: MouseEvent) => void; onRemove: (event: MouseEvent) => void; onStar: (event: MouseEvent) => void; starred: boolean }) {
  return <div className="absolute right-3 top-3 flex translate-y-[-2px] gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 opacity-100 shadow-sm transition-[opacity,transform] duration-150 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">{trash ? <><Action label="Restore note" onClick={onRestore}><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M4 4v6h6M5.2 15a7 7 0 1 0 .8-7.8L4 10" /></svg></Action><Action label="Delete permanently" onClick={onRemove} danger><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.9" d="M5 7h14M9 7V4h6v3m2 0-.6 12H7.6L7 7m3 4v5m4-5v5" /></svg></Action></> : <Action label={starred ? 'Remove from starred' : 'Add to starred'} onClick={onStar}><svg className="h-3.5 w-3.5" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinejoin="round" strokeWidth="1.9" d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z" /></svg></Action>}</div>;
}
function Action({ label, onClick, danger, children }: { label: string; onClick: (event: MouseEvent) => void; danger?: boolean; children: React.ReactNode }) { return <button onClick={onClick} className={`pressable rounded-md p-1.5 ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`} aria-label={label} title={label}>{children}</button>; }
function Tags({ tags, limit }: { tags: string[]; limit: number }) { return <div className="flex min-w-0 gap-1.5 overflow-hidden">{tags.slice(0, limit).map(tag => <span key={tag} className="max-w-[90px] truncate rounded-md bg-[var(--panel-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--muted)]">#{tag}</span>)}</div>; }
const PinIcon = () => <svg className="mt-0.5 h-3.5 w-3.5 flex-none text-primary-500" fill="currentColor" viewBox="0 0 24 24"><path d="M16 3a1 1 0 0 1 .8 1.6L15 7v4l2.7 2.7a1 1 0 0 1-.7 1.7h-4v5.1a1 1 0 0 1-2 0v-5.1H7a1 1 0 0 1-.7-1.7L9 11V7L7.2 4.6A1 1 0 0 1 8 3h8Z" /></svg>;
const StarFilled = () => <svg className="h-3.5 w-3.5 flex-none text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="m12 2.5 2.9 5.88 6.5.95-4.7 4.58 1.11 6.47L12 17.33l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5Z" /></svg>;
export default NoteCard;
