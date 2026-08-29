import { useCallback, useEffect, useState } from 'react';
import { JSONContent } from '@tiptap/react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFolders } from '@/hooks/useFolders';
import { useNote } from '@/hooks/useNotes';
import { noteService } from '@/services/NoteService';
import { countWords, extractPlainText } from '@/lib/utils/text';
import TiptapEditor from '@/components/editor/TiptapEditor';
import Spinner from '@/components/ui/Spinner';

const EMPTY_CONTENT: JSONContent = { type: 'doc', content: [] };

function NoteEditor() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { note: loadedNote, loading } = useNote(noteId);
  const { folders } = useFolders();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<JSONContent>(EMPTY_CONTENT);
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [localNoteId, setLocalNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!loadedNote || loadedNote.id === localNoteId) return;
    const displayTitle = loadedNote.title === 'Untitled' ? '' : loadedNote.title;
    setTitle(displayTitle);
    setContent(loadedNote.content);
    setTags(loadedNote.tags);
    setFolderId(loadedNote.folderId);
    setLocalNoteId(loadedNote.id);
    setSavedAt(loadedNote.updatedAt);
    setHasUnsavedChanges(false);
  }, [loadedNote, localNoteId]);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const saveNote = async () => {
    setSaving(true);
    try {
      if (localNoteId) {
        const updated = await noteService.updateNote(localNoteId, { title: title.trim() || 'Untitled', content, tags, folderId });
        setSavedAt(updated?.updatedAt || Date.now());
      } else {
        const note = await noteService.createNote({ title: title.trim() || 'Untitled', content, tags, folderId });
        setLocalNoteId(note.id);
        setSavedAt(note.updatedAt);
        navigate(`/notes/${note.id}`, { replace: true });
      }
      setHasUnsavedChanges(false);
    } finally { setSaving(false); }
  };

  const addTag = useCallback((value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag)) {
      setTags(current => [...current, tag]);
      setHasUnsavedChanges(true);
    }
  }, [tags]);

  const moveToTrash = async () => { if (localNoteId && confirm('Move this note to trash?')) { await noteService.deleteNote(localNoteId); navigate('/notes'); } };
  const restore = async () => { if (localNoteId) { await noteService.restoreNote(localNoteId); navigate(`/notes/${localNoteId}`); } };
  const removeForever = async () => { if (localNoteId && confirm('Permanently delete this note? This cannot be undone.')) { await noteService.permanentlyDeleteNote(localNoteId); navigate('/notes/trash'); } };
  const toggleStar = async () => { if (localNoteId) await noteService.toggleStar(localNoteId); };
  const togglePin = async () => { if (localNoteId) await noteService.togglePin(localNoteId); };
  const toggleArchive = async () => { if (localNoteId) { await noteService.toggleArchive(localNoteId); navigate(loadedNote?.isArchived ? '/notes' : '/notes/archived'); } };

  if (loading && noteId) return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <article className="mx-auto max-w-[980px]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => navigate(-1)} className="pressable mr-1 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="Back to notes"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="M19 12H5m6-6-6 6 6 6" /></svg></button>
        <select value={folderId || ''} onChange={(event) => { setFolderId(event.target.value || null); setHasUnsavedChanges(true); }} className="h-9 max-w-[180px] rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--muted)] outline-none" aria-label="Note folder"><option value="">No folder</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
        <div className="ml-auto flex items-center gap-1">
          {!loadedNote?.isDeleted && <button onClick={saveNote} disabled={saving || (!hasUnsavedChanges && Boolean(noteId || localNoteId))} className="pressable mr-1 flex h-9 items-center gap-2 rounded-lg bg-primary-600 px-3.5 text-xs font-semibold text-white shadow-sm shadow-primary-600/15 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Save note"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 4h11l3 3v13H5V4Zm3 0v6h8V4M8 20v-6h8v6" /></svg>{saving ? 'Saving…' : 'Save'}</button>}
          {loadedNote?.isDeleted ? <><ToolbarButton label="Restore" onClick={restore}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 4v6h6M5.2 15a7 7 0 1 0 .8-7.8L4 10" /></svg></ToolbarButton><ToolbarButton label="Delete forever" onClick={removeForever} danger><TrashIcon /></ToolbarButton></> : <><ToolbarButton label={loadedNote?.isPinned ? 'Unpin note' : 'Pin note'} active={loadedNote?.isPinned} onClick={togglePin}><PinIcon filled={loadedNote?.isPinned} /></ToolbarButton><ToolbarButton label={loadedNote?.isStarred ? 'Remove from starred' : 'Add to starred'} active={loadedNote?.isStarred} onClick={toggleStar}><StarIcon filled={loadedNote?.isStarred} /></ToolbarButton><ToolbarButton label={loadedNote?.isArchived ? 'Unarchive note' : 'Archive note'} onClick={toggleArchive}><ArchiveIcon /></ToolbarButton><ToolbarButton label="Move to trash" onClick={moveToTrash} danger><TrashIcon /></ToolbarButton></>}
          <div className="ml-2 flex min-w-[62px] items-center gap-1.5 text-[11px] font-semibold sm:min-w-[96px]"><span className={`h-1.5 w-1.5 rounded-full ${saving || hasUnsavedChanges ? 'bg-amber-400' : 'bg-emerald-500'}`} /><span className="text-[var(--muted)]">{saving ? 'Saving…' : hasUnsavedChanges ? 'Unsaved' : 'Saved'}</span></div>
        </div>
      </div>

      {loadedNote?.isDeleted && <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"><span>This note is in the trash. Restore it to continue editing.</span><button onClick={restore} className="font-semibold underline underline-offset-2">Restore</button></div>}

      <div className="app-panel overflow-hidden rounded-2xl">
        <div className="border-b border-[var(--line)] px-[clamp(1.25rem,5vw,4.5rem)] pb-5 pt-8">
          <input value={title} onChange={(event) => { setTitle(event.target.value); setHasUnsavedChanges(true); }} disabled={loadedNote?.isDeleted} placeholder="Untitled note" aria-label="Note title" className="w-full border-none bg-transparent text-[clamp(2rem,4vw,3rem)] font-bold tracking-[-.045em] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]/45 disabled:cursor-not-allowed" autoFocus={!noteId} />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {tags.map(tag => <button key={tag} onClick={() => { setTags(tags.filter(item => item !== tag)); setHasUnsavedChanges(true); }} className="pressable rounded-lg bg-primary-50 px-2.5 py-1.5 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-900/25 dark:text-primary-200">#{tag} <span className="ml-1 opacity-60">×</span></button>)}
            {!loadedNote?.isDeleted && <input onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ',') && event.currentTarget.value.trim()) { event.preventDefault(); addTag(event.currentTarget.value); event.currentTarget.value = ''; } }} onBlur={(event) => { if (event.currentTarget.value.trim()) { addTag(event.currentTarget.value); event.currentTarget.value = ''; } }} placeholder="Add tag" aria-label="Add tag" className="h-7 w-24 rounded-md border-none bg-transparent px-1 text-xs text-[var(--muted)] outline-none placeholder:text-[var(--muted)]/70" />}
          </div>
        </div>
        <TiptapEditor content={content} onChange={(nextContent) => { setContent(nextContent); setHasUnsavedChanges(true); }} editable={!loadedNote?.isDeleted} placeholder="Start writing. Type / for ideas, or just let the words come…" />
      </div>
      <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 text-[11px] font-medium text-[var(--muted)]"><span>{countWords(extractPlainText(content))} words</span><span>{extractPlainText(content).length} characters</span>{savedAt && <span className="ml-auto">Last saved {new Date(savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}</footer>
    </article>
  );
}

function ToolbarButton({ label, onClick, active, danger, children }: { label: string; onClick: () => void; active?: boolean; danger?: boolean; children: React.ReactNode }) { return <button onClick={onClick} disabled={!onClick} className={`pressable rounded-lg p-2 ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30' : active ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`} aria-label={label} title={label}>{children}</button>; }
const PinIcon = ({ filled }: { filled?: boolean }) => <svg className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m8 3 8 .02-1 7 3 3-5 .5V21l-2-2v-5.48l-5-.5 3-3-1-7Z" /></svg>;
const StarIcon = ({ filled }: { filled?: boolean }) => <svg className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinejoin="round" strokeWidth="1.8" d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z" /></svg>;
const ArchiveIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7.5h16M5.5 7.5v10.75A1.75 1.75 0 0 0 7.25 20h9.5a1.75 1.75 0 0 0 1.75-1.75V7.5M9.5 11h5M5 4h14a1 1 0 0 1 1 1v2.5H4V5a1 1 0 0 1 1-1Z" /></svg>;
const TrashIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="M5 7h14M9 7V4h6v3m2 0-.6 12H7.6L7 7m3 4v5m4-5v5" /></svg>;
export default NoteEditor;
