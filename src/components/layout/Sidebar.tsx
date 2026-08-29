import { FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import { folderService } from '@/services/FolderService';

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useLocation();
  const { folders } = useFolders();
  const { notes: allNotes } = useNotes({ isDeleted: false, isArchived: false });
  const { notes: starred } = useNotes({ isDeleted: false, isStarred: true });
  const { notes: archived } = useNotes({ isDeleted: false, isArchived: true });
  const { notes: trashed } = useNotes({ isDeleted: true });
  const [addingFolder, setAddingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');

  const createFolder = async (event: FormEvent) => {
    event.preventDefault();
    const name = folderName.trim();
    if (!name) return;
    await folderService.createFolder({ name, color: '#776df1' });
    setFolderName('');
    setAddingFolder(false);
  };

  return (
    <>
      {isOpen && <button className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px] lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[var(--line)] bg-[var(--panel)] px-4 pb-4 pt-5 transition-transform duration-200 [transition-timing-function:var(--ease-out)] lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-7 flex items-center justify-between px-2">
          <Link to="/notes" onClick={onClose} className="pressable flex items-center gap-2.5">
            <div className="flex h-9 w-9 rotate-[-3deg] items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm shadow-primary-600/25"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M7 4.75h8.5A2.5 2.5 0 0 1 18 7.25v9.5a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2V6.75a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeWidth="1.8" d="M9 9h5M9 12.5h5M9 16h3" /></svg></div>
            <div><p className="text-[15px] font-bold tracking-tight text-[var(--ink)]">My Notes</p><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[var(--muted)]">Private workspace</p></div>
          </Link>
          <button onClick={onClose} className="pressable rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel-soft)] lg:hidden" aria-label="Close navigation"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="m6 6 12 12M18 6 6 18" /></svg></button>
        </div>

        <Link to="/notes/new" onClick={onClose} className="pressable mb-6 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>New note <span className="ml-auto rounded-md bg-white/15 px-1.5 py-0.5 text-[10px]">⌘N</span>
        </Link>

        <nav className="flex-1 overflow-y-auto">
          <p className="eyebrow mb-2 px-3 text-[var(--muted)]">Workspace</p>
          <div className="space-y-1">
            <NavItem to="/notes" label="All notes" count={allNotes.length} active={location.pathname === '/notes'} onClick={onClose} icon={<NotesIcon />} />
            <NavItem to="/notes/starred" label="Starred" count={starred.length} active={location.pathname === '/notes/starred'} onClick={onClose} icon={<StarIcon />} />
            <NavItem to="/notes/archived" label="Archive" count={archived.length} active={location.pathname === '/notes/archived'} onClick={onClose} icon={<ArchiveIcon />} />
            <NavItem to="/notes/trash" label="Trash" count={trashed.length} active={location.pathname === '/notes/trash'} onClick={onClose} icon={<TrashIcon />} />
          </div>

          <div className="mb-2 mt-7 flex items-center justify-between px-3">
            <p className="eyebrow text-[var(--muted)]">Folders</p>
            <button className="pressable -mr-1 rounded-md p-1 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" onClick={() => setAddingFolder(true)} aria-label="Create folder"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg></button>
          </div>
          {addingFolder && <form onSubmit={createFolder} className="relative mb-2 px-2"><input autoFocus value={folderName} onChange={(event) => setFolderName(event.target.value)} onBlur={(event) => { if (!event.currentTarget.form?.contains(event.relatedTarget as Node) && !folderName.trim()) setAddingFolder(false); }} onKeyDown={(event) => { if (event.key === 'Escape') setAddingFolder(false); }} placeholder="Folder name" className="h-9 w-full rounded-lg border border-primary-300 bg-[var(--panel)] pl-3 pr-9 text-sm text-[var(--ink)] outline-none ring-4 ring-primary-500/10" /><button type="submit" className="pressable absolute right-3 top-1 flex h-7 w-7 items-center justify-center rounded-md text-primary-600 hover:bg-primary-50" aria-label="Save folder"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="m5 12 4 4L19 6" /></svg></button></form>}
          <div className="space-y-1">
            {folders.map((folder) => <NavItem key={folder.id} to={`/notes/folder/${folder.id}`} label={folder.name} active={location.pathname === `/notes/folder/${folder.id}`} onClick={onClose} icon={<FolderIcon color={folder.color || '#776df1'} />} />)}
            {!folders.length && !addingFolder && <button onClick={() => setAddingFolder(true)} className="pressable mx-2 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-left text-xs text-[var(--muted)] hover:border-primary-300 hover:text-primary-600"><FolderIcon color="currentColor" /> Organize with a folder</button>}
          </div>
        </nav>

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="m5 12 4 4L19 6" /></svg></span>Saved locally</div>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">Your notes remain available without an internet connection.</p>
        </div>
      </aside>
    </>
  );
}

function NavItem({ to, label, count, active, onClick, icon }: { to: string; label: string; count?: number; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return <Link to={to} onClick={onClick} className={`pressable flex h-10 items-center gap-3 rounded-lg px-3 text-sm ${active ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/25 dark:text-primary-200' : 'font-medium text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`}><span className={active ? 'text-primary-600 dark:text-primary-300' : ''}>{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span>{count !== undefined && count > 0 && <span className="text-[11px] tabular-nums opacity-70">{count}</span>}</Link>;
}

const NotesIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.5 3.75h9A2.75 2.75 0 0 1 18.25 6.5v11A2.75 2.75 0 0 1 15.5 20.25h-9a2.75 2.75 0 0 1-2.75-2.75v-11A2.75 2.75 0 0 1 6.5 3.75Z" /><path strokeLinecap="round" strokeWidth="1.8" d="M8 8h6M8 12h8M8 16h5" /></svg>;
const StarIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinejoin="round" strokeWidth="1.8" d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z" /></svg>;
const ArchiveIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7.5h16M5.5 7.5v10.75A1.75 1.75 0 0 0 7.25 20h9.5a1.75 1.75 0 0 0 1.75-1.75V7.5M9.5 11h5M5 4h14a1 1 0 0 1 1 1v2.5H4V5a1 1 0 0 1 1-1Z" /></svg>;
const TrashIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 7h15M9 7V4.5h6V7m2.75 0-.6 11.05a2 2 0 0 1-2 1.9h-6.3a2 2 0 0 1-2-1.9L6.25 7M10 11v5M14 11v5" /></svg>;
const FolderIcon = ({ color }: { color: string }) => <svg className="h-[18px] w-[18px]" style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3.75 7.25A2.25 2.25 0 0 1 6 5h4l2 2h6A2.25 2.25 0 0 1 20.25 9.25v8A2.75 2.75 0 0 1 17.5 20h-11a2.75 2.75 0 0 1-2.75-2.75v-10Z" /></svg>;

export default Sidebar;
