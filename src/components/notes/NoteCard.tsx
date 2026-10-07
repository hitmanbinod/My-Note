import { MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Note } from '@/types';
import { noteService } from '@/services/NoteService';
import { formatNoteTimestamp } from '@/lib/utils/date';
import { generateExcerpt } from '@/lib/utils/text';

function NoteCard({ note, view, trash, active, onContextMenu }: { note: Note; view: 'list' | 'grid'; trash?: boolean; active?: boolean; onContextMenu?: (event: MouseEvent) => void }) {
  // No title? Use the first body line as the title (Apple-Notes style) and
  // preview whatever follows it.
  const body = (note.plainTextContent || '').trim();
  const bodyLines = body.split('\n').filter((line) => line.trim());
  const hasTitle = Boolean(note.title?.trim());
  const displayTitle = hasTitle ? note.title!.trim() : bodyLines[0]?.slice(0, 60) || 'Untitled';
  const previewSource = hasTitle ? body : bodyLines.slice(1).join('\n');
  const preview = previewSource.trim() ? generateExcerpt(previewSource, 96) : '';
  const restore = async (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); await noteService.restoreNote(note.id); };
  const remove = async (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); if (confirm('Permanently delete this note? This cannot be undone.')) await noteService.permanentlyDeleteNote(note.id); };

  // Starring lives in the editor's top action bar (UpNote-style) — note rows stay clean.
  // Trash rows keep their hover restore/delete actions since no other path exists.
  if (view === 'list') return (
    <article onContextMenu={onContextMenu} className={`group relative border-b border-[var(--line)] transition-colors before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--brand)] ${active ? 'bg-[var(--brand-soft)] before:opacity-100' : 'before:opacity-0 hover:bg-[var(--panel-soft)]/60'}`}>
      <Link to={`/notes/${note.id}`} className="block px-4 py-2.5">
        <h3 className={`truncate text-[13.5px] font-medium text-[var(--ink)]`}>{displayTitle}</h3>
        {preview ? <p className="mt-0.5 truncate text-[12px] leading-5 text-[var(--muted)]">{preview}</p> : null}
        <div className="mt-1.5 flex min-w-0 items-center gap-2">
          <time className="flex-none text-[11px] tabular-nums text-[var(--muted)]">{formatNoteTimestamp(note.updatedAt)}</time>
          {note.isPinned && <PinIcon />}
          {note.isStarred && <StarFilled />}
          <Tags tags={note.tags} />
        </div>
      </Link>
      {trash && <CardActions trash onRestore={restore} onRemove={remove} />}
    </article>
  );

  return (
    <article onContextMenu={onContextMenu} className={`app-panel group relative overflow-hidden rounded-lg transition-colors ${active ? 'border-[var(--brand)]/50' : 'hover:border-[var(--muted)]/40'}`}>
      {note.color && <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: note.color }} />}
      <Link to={`/notes/${note.id}`} className="block p-4">
        <div className="flex min-h-[24px] items-start gap-2 pr-14">{note.isPinned && <PinIcon />}<h2 className="line-clamp-2 flex-1 text-[13.5px] font-semibold leading-snug text-[var(--ink)]">{displayTitle}</h2>{note.isStarred && <StarFilled />}</div>
        <p className="mt-2 line-clamp-4 text-[12px] leading-5 text-[var(--muted)]">{preview}</p>
        <div className="mt-3 flex items-center gap-2">
          <time className="text-[11px] tabular-nums text-[var(--muted)]">{formatNoteTimestamp(note.updatedAt)}</time>
          <Tags tags={note.tags} />
        </div>
      </Link>
      {trash && <CardActions trash onRestore={restore} onRemove={remove} />}
    </article>
  );
}

function CardActions({ trash, onRestore, onRemove }: { trash?: boolean; onRestore: (event: MouseEvent) => void; onRemove: (event: MouseEvent) => void }) {
  if (!trash) return null;
  return <div className="absolute right-2 top-2 flex gap-0.5 rounded-md border border-[var(--line)] bg-[var(--panel)] p-0.5 opacity-100 shadow-sm sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"><Action label="Restore note" onClick={onRestore}><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M4 4v6h6M5.2 15a7 7 0 1 0 .8-7.8L4 10" /></svg></Action><Action label="Delete permanently" onClick={onRemove} danger><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.9" d="M5 7h14M9 7V4h6v3m2 0-.6 12H7.6L7 7m3 4v5m4-5v5" /></svg></Action></div>;
}
function Action({ label, onClick, danger, children }: { label: string; onClick: (event: MouseEvent) => void; danger?: boolean; children: React.ReactNode }) { return <button onClick={onClick} className={`pressable rounded p-1 ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`} aria-label={label} title={label}>{children}</button>; }
function Tags({ tags }: { tags: string[] }) { return <div className="flex min-w-0 gap-1 overflow-hidden">{tags.slice(0, 2).map(tag => <span key={tag} className="max-w-[80px] truncate text-[10.5px] text-[var(--muted)]">#{tag}</span>)}</div>; }
const PinIcon = () => <svg className="h-3 w-3 flex-none text-[var(--muted)]" fill="currentColor" viewBox="0 0 24 24"><path d="M16 3a1 1 0 0 1 .8 1.6L15 7v4l2.7 2.7a1 1 0 0 1-.7 1.7h-4v5.1a1 1 0 0 1-2 0v-5.1H7a1 1 0 0 1-.7-1.7L9 11V7L7.2 4.6A1 1 0 0 1 8 3h8Z" /></svg>;
const StarFilled = () => <svg className="h-3 w-3 flex-none text-[var(--warm)]" fill="currentColor" viewBox="0 0 24 24"><path d="m12 2.5 2.9 5.88 6.5.95-4.7 4.58 1.11 6.47L12 17.33l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.5Z" /></svg>;
export default NoteCard;
