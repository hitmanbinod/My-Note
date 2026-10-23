import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import { folderService } from '@/services/FolderService';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { FolderDialog } from '@/components/folders/FolderDialog';
import { BrandMark } from '@/components/brand/BrandMark';
import type { Folder } from '@/types';

function Sidebar({ isOpen, onClose, collapsed, savedWidth }: { isOpen: boolean; onClose: () => void; collapsed: boolean; savedWidth?: number }) {
  const location = useLocation();
  const { folders } = useFolders();
  const { notes: allNotes } = useNotes({ isDeleted: false, isArchived: false });
  const { notes: starred } = useNotes({ isDeleted: false, isStarred: true });
  const { notes: archived } = useNotes({ isDeleted: false, isArchived: true });
  const { notes: trashed } = useNotes({ isDeleted: true });
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const asideRef = useRef<HTMLElement | null>(null);
  const [railObserved, setRailObserved] = useState(false);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [folderMenu, setFolderMenu] = useState<{ x: number; y: number; folder: Folder } | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  // Update-ready prompt (electron-updater): minimal card at the sidebar's base
  useEffect(() => {
    return window.electronAPI?.onAppUpdateStatus?.((payload) => {
      if (payload.state === 'ready') setUpdateReady(true);
    });
  }, []);

  // Icon-rail mode when the sidebar is narrow (desktop only). The ResizeObserver
  // tracks real resizes; the live drag width keeps the layout in step mid-drag;
  // the committed settings width is the steady-state fallback.
  useEffect(() => {
    const el = asideRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      setRailObserved(window.innerWidth >= 1024 && el.offsetWidth < 140);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMove = () => {
      if (document.body.dataset.resizing !== 'sidebar') return;
      const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w'));
      if (Number.isFinite(w)) setLiveWidth(w);
    };
    const onEnd = () => setLiveWidth(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, []);
  const rail = railObserved || (liveWidth ?? (typeof savedWidth === 'number' ? savedWidth : 260)) < 140;

  const openCreateDialog = () => {
    setEditingFolder(null);
    setFolderDialogOpen(true);
  };

  const openEditDialog = (folder: Folder) => {
    setEditingFolder(folder);
    setFolderDialogOpen(true);
  };

  return (
    <>
      {isOpen && <button className="fixed inset-0 z-30 bg-black/35 backdrop-blur-[2px] lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside ref={asideRef} className={`sidebar-pane fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col overflow-hidden border-r border-[var(--line)] bg-[var(--panel)] px-4 pb-4 pt-5 transition-[transform,width] duration-200 [transition-timing-function:var(--ease-out)] lg:static lg:w-[var(--sidebar-w,260px)] lg:translate-x-0 ${rail ? 'lg:px-2.5' : 'lg:px-4'} ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:hidden' : ''}`}>
        {/* Laid out at natural width and clipped while resizing — text never squishes mid-drag */}
        <div className={`no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${rail ? '' : 'lg:min-w-[228px]'}`}>
        {/* Brand header — 48px row, solid logo tile, wordmark (guide Task 3) */}
        <div className={`mb-2 flex items-center ${rail ? 'lg:justify-center' : ''}`}>
          <Link
            to="/notes"
            onClick={onClose}
            title="Tipot"
            className={`pressable flex items-center gap-2.5 rounded-lg hover:bg-[var(--panel-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${rail ? 'lg:h-7 lg:w-7 lg:justify-center' : 'h-12 w-full px-2'}`}
          >
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[var(--brand-logo)]"><BrandMark size={16} className="text-white" /></span>
            <span className={`text-[15px] font-semibold leading-none tracking-[-0.01em] text-[var(--ink)] ${rail ? 'lg:hidden' : ''}`}>Tipot</span>
          </Link>
          <button onClick={onClose} className="pressable ml-auto rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--panel-soft)] lg:hidden" aria-label="Close navigation"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="m6 6 12 12M18 6 6 18" /></svg></button>
        </div>

        <nav className={`flex-1 overflow-y-auto ${rail ? 'no-scrollbar' : ''}`}>
          <div className="space-y-1">
            <NavItem to="/notes" label="All notes" count={allNotes.length} active={location.pathname === '/notes'} onClick={onClose} rail={rail} icon={<NotesIcon />} />
            <NavItem to="/whiteboards" label="Whiteboards" active={location.pathname.startsWith('/whiteboards')} onClick={onClose} rail={rail} icon={<BoardIcon />} />
            {/* Separator before secondary destinations (guide §7.2) */}
            <div className={`my-1.5 border-t border-[var(--line)] ${rail ? 'lg:mx-3' : 'mx-3'}`} />
            <NavItem to="/notes/starred" label="Starred" count={starred.length} active={location.pathname === '/notes/starred'} onClick={onClose} rail={rail} icon={<StarIcon />} />
            <NavItem to="/notes/archived" label="Archive" count={archived.length} active={location.pathname === '/notes/archived'} onClick={onClose} rail={rail} icon={<ArchiveIcon />} />
            <NavItem to="/notes/trash" label="Trash" count={trashed.length} active={location.pathname === '/notes/trash'} onClick={onClose} rail={rail} icon={<TrashIcon />} />
          </div>

          <div className={`group mb-2 mt-7 flex items-center justify-between px-3 ${rail ? 'lg:hidden' : ''}`}>
            <p className="eyebrow text-[var(--muted)]">Notebooks</p>
            <button className="pressable -mr-1 rounded-md p-1 text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] focus-visible:opacity-100 group-hover:opacity-100" onClick={openCreateDialog} aria-label="Create notebook"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg></button>
          </div>
          <div className="space-y-1">
            {folders.map((folder) => (
              <div key={folder.id} onContextMenu={(event) => { event.preventDefault(); setFolderMenu({ x: event.clientX, y: event.clientY, folder }); }}>
                <NavItem to={`/notes/folder/${folder.id}`} label={folder.name} active={location.pathname === `/notes/folder/${folder.id}`} onClick={onClose} rail={rail} icon={folder.icon ? <img src={folder.icon} alt="" className="h-[18px] w-[18px] flex-none rounded-[5px] object-cover" /> : <FolderIcon color={folder.color || '#776df1'} />} trailing={folder.locked ? <LockGlyph /> : undefined} />
              </div>
            ))}
            {!folders.length && <button onClick={openCreateDialog} className={`pressable mx-2 flex h-8 w-[calc(100%-1rem)] items-center gap-2 rounded-md px-3 text-left text-xs text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] ${rail ? 'lg:hidden' : ''}`}><FolderIcon color="currentColor" /> New notebook</button>}
          </div>
          {/* Rail mode: minimal + to add a notebook (guide Task 4) */}
          {rail && (
            <button onClick={openCreateDialog} className="pressable mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="Create notebook" title="New notebook">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>
            </button>
          )}
        </nav>
        </div>

        {/* Update-ready prompt — minimal card at the sidebar base (expanded view) */}
        {updateReady && !rail && (
          <div className="mt-2 flex-none">
            <div className="app-panel flex items-center gap-2 rounded-lg p-2.5">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--brand-soft)] text-[var(--brand)]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9" /><path d="M21 4v5h-5" /></svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-semibold text-[var(--ink)]">Update ready</p>
                <p className="text-[10.5px] text-[var(--muted)]">Installs when you close the app</p>
              </div>
              <button
                type="button"
                onClick={() => void window.electronAPI?.installAppUpdate?.()}
                className="pressable flex-none rounded-md bg-primary-600 px-2.5 py-1.5 text-[11.5px] font-semibold text-[var(--on-brand)] hover:bg-primary-700"
              >
                Restart
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Folder right-click menu: rename, lock, color, delete */}
      {folderMenu && (
        <ContextMenu
          x={folderMenu.x}
          y={folderMenu.y}
          items={[
            { label: 'Edit notebook…', run: () => { const f = folderMenu.folder; setFolderMenu(null); openEditDialog(f); } },
            { label: folderMenu.folder.locked ? 'Unlock notebook' : 'Lock notebook', run: () => void folderService.updateFolder(folderMenu.folder.id, { locked: !folderMenu.folder.locked }) },
            {
              label: 'Color',
              swatches: ['#776df1', '#e03e3e', '#e6ad00', '#1f8f4f', '#3b5bf5', '#c72b76'].map((color) => ({
                color,
                run: () => void folderService.updateFolder(folderMenu.folder.id, { color })
              }))
            },
            { separator: true, label: '' },
            { label: 'Delete notebook', danger: true, run: () => { if (confirm(`Delete "${folderMenu.folder.name}"? Notes inside stay in All notes.`)) void folderService.deleteFolder(folderMenu.folder.id); } }
          ]}
          onClose={() => setFolderMenu(null)}
        />
      )}

      {/* Create / edit notebook — name, cover image or gradient, lock */}
      <FolderDialog
        open={folderDialogOpen}
        folder={editingFolder}
        onClose={() => setFolderDialogOpen(false)}
      />
    </>
  );
}

const LockGlyph = () => <svg className="h-3 w-3 flex-none text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></svg>;


function NavItem({ to, label, count, active, onClick, icon, rail, trailing }: { to: string; label: string; count?: number; active: boolean; onClick: () => void; icon: React.ReactNode; rail?: boolean; trailing?: React.ReactNode }) {
  return <Link to={to} onClick={onClick} title={label} className={`pressable flex h-8 items-center gap-2 rounded-md px-3 text-sm ${rail ? 'lg:mx-auto lg:w-9 lg:justify-center lg:px-0' : ''} ${active ? 'bg-[var(--brand-soft)] font-medium text-[var(--brand-text)]' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`}><span className={active ? 'text-[var(--brand-text)]' : ''}>{icon}</span><span className={`min-w-0 flex-1 truncate text-[14px] ${rail ? 'lg:hidden' : ''}`}>{label}</span>{count !== undefined && count > 0 && <span className={`text-xs tabular-nums opacity-70 ${rail ? 'lg:hidden' : ''}`}>{count}</span>}{trailing && <span className={`flex-none ${rail ? 'lg:hidden' : ''}`}>{trailing}</span>}</Link>;
}

const NotesIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.5 3.75h9A2.75 2.75 0 0 1 18.25 6.5v11A2.75 2.75 0 0 1 15.5 20.25h-9a2.75 2.75 0 0 1-2.75-2.75v-11A2.75 2.75 0 0 1 6.5 3.75Z" /><path strokeLinecap="round" strokeWidth="1.8" d="M8 8h6M8 12h8M8 16h5" /></svg>;
const BoardIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 4.5h15v15h-15zM8 15l3-4 2 2 3-4" /></svg>;
const StarIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinejoin="round" strokeWidth="1.8" d="m12 3 2.65 5.37 5.93.86-4.29 4.18 1.01 5.91L12 16.53l-5.3 2.79 1.01-5.91-4.29-4.18 5.93-.86L12 3Z" /></svg>;
const ArchiveIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 7.5h16M5.5 7.5v10.75A1.75 1.75 0 0 0 7.25 20h9.5a1.75 1.75 0 0 0 1.75-1.75V7.5M9.5 11h5M5 4h14a1 1 0 0 1 1 1v2.5H4V5a1 1 0 0 1 1-1Z" /></svg>;
const TrashIcon = () => <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 7h15M9 7V4.5h6V7m2.75 0-.6 11.05a2 2 0 0 1-2 1.9h-6.3a2 2 0 0 1-2-1.9L6.25 7M10 11v5M14 11v5" /></svg>;
const FolderIcon = ({ color }: { color: string }) => <svg className="h-[18px] w-[18px]" style={{ color: `color-mix(in oklch, ${color} 70%, var(--muted))` }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3.75 7.25A2.25 2.25 0 0 1 6 5h4l2 2h6A2.25 2.25 0 0 1 20.25 9.25v8A2.75 2.75 0 0 1 17.5 20h-11a2.75 2.75 0 0 1-2.75-2.75v-10Z" /></svg>;

export default Sidebar;
