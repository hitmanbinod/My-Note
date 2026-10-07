import { useEffect, useState } from 'react';
import { Outlet, Route, Routes, Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useNotes } from '@/hooks/useNotes';
import { useSearch } from '@/hooks/useSearch';
import { useSettings } from '@/hooks/useSettings';
import { useFolder } from '@/hooks/useFolders';
import { useUiWidths } from '@/hooks/useUiWidths';
import { verifyVaultAccess } from '@/lib/utils/pin';
import { isUnlocked, isVaultUnlocked, lockVault, unlockVault } from '@/lib/lock';
import { noteService } from '@/services/NoteService';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import NoteList from '@/components/notes/NoteList';
import NoteEditor from '@/components/notes/NoteEditor';
import ReaderView from '@/components/reader/ReaderView';
import { PinPrompt } from '@/components/security/PinPrompt';
import { VaultManager } from '@/components/security/VaultManager';
import { Note, NoteFilter, NoteSortField, NoteSortOrder } from '@/types';

/**
 * Two-pane notes workspace, classic layout: persistent list on the left,
 * editor on the right. Each view (all/starred/archive/trash/folder) mounts
 * this shell with its own filter; the editor renders into the Outlet.
 */
function NotesWorkspace({ title, filter, viewPath, trash }: { title: string; filter?: NoteFilter; viewPath: string; trash?: boolean }) {
  const location = useLocation();
  const { noteId } = useParams();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const { beginListResize, resetList } = useUiWidths();

  const [sort, setSort] = useState<{ by: NoteSortField; order: NoteSortOrder }>({ by: 'updatedAt', order: 'desc' });
  const [sortMenu, setSortMenu] = useState<{ x: number; y: number } | null>(null);

  const { notes, loading } = useNotes(filter, sort.by, sort.order);
  const { results: searchResults } = useSearch(searchQuery || '', filter);
  const displayNotes = searchQuery ? searchResults : notes;
  const hasSelection = location.pathname !== viewPath;
  // Reader mode: the folder's notes become chapters of a focused reading view
  const [readerMode, setReaderMode] = useState(false);

  // Right-click menu on notes in the list (UpNote-style actions)
  const [noteMenu, setNoteMenu] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null);
  const handleNoteContextMenu = (event: React.MouseEvent, note: Note) => {
    event.preventDefault();
    const items: ContextMenuItem[] = note.isDeleted
      ? [
          { label: 'Restore note', run: () => void noteService.restoreNote(note.id) },
          { label: 'Delete permanently', danger: true, run: () => { if (confirm('Delete this note permanently? This cannot be undone.')) void noteService.permanentlyDeleteNote(note.id); } }
        ]
      : [
          { label: note.isPinned ? 'Unpin' : 'Pin', run: () => void noteService.togglePin(note.id) },
          { label: note.isStarred ? 'Remove from favourites' : 'Add to favourites', run: () => void noteService.toggleStar(note.id) },
          { label: 'Duplicate', run: () => void noteService.duplicateNote(note.id).catch(() => alert('Could not duplicate the note.')) },
          { separator: true, label: '' },
          { label: 'Move to trash', danger: true, run: () => { if (confirm('Move this note to trash?')) void noteService.deleteNote(note.id); } }
        ];
    setNoteMenu({ x: event.clientX, y: event.clientY, items });
  };

  // The password manager entry is revealed only after the 4-digit PIN is typed
  // into the search bar AND confirmed with Enter — a matching query alone
  // never opens it (extra security against shoulder-surfing while typing).
  const { settings, update: updateSettings } = useSettings();
  const splitView = settings?.splitView === true;
  const focusMode = settings?.focusMode === true;
  const [pinMatches, setPinMatches] = useState(false);
  useEffect(() => {
    if (!/^\d{4}$/.test(searchQuery) || (settings && !settings.pinHash && !settings.vaultPinHash)) {
      setPinMatches(false);
      return undefined;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      const active = document.activeElement as HTMLElement | null;
      if (!active || active.tagName !== 'INPUT') return;
      // The password manager opens with its own PIN when one is set,
      // otherwise it falls back to the app PIN. Success unlocks the vault
      // session, so the manager doesn't ask for the PIN a second time.
      void verifyVaultAccess(searchQuery).then((ok) => {
        if (ok) unlockVault();
        setPinMatches(ok);
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchQuery, settings]);
  const lockedRevealed = pinMatches || location.pathname.startsWith('/notes/locked');

  const heading = searchQuery ? `Search: "${searchQuery}"` : title;
  const emptyTitle = searchQuery
    ? 'No matching notes'
    : trash
      ? 'Trash is empty'
      : 'No notes yet';
  const emptyMessage = searchQuery
    ? 'No notes found matching your search'
    : trash
      ? 'Notes you delete will appear here for recovery'
      : 'Create your first note to get started!';

  return (
    <div className="flex h-full min-h-0">
      <section
        className={`${focusMode ? 'lg:hidden' : hasSelection ? 'hidden lg:flex' : 'flex'} w-[var(--list-w,320px)] max-lg:!w-full flex-none flex-col border-r border-[var(--line)] bg-[var(--panel)]`}
      >
        <header className="flex-none border-b border-[var(--line)] px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate font-serif text-[15px] font-semibold leading-tight text-[var(--ink)]">{heading}</h1>
              <p className="text-xs text-[var(--muted)]">{displayNotes.length} {displayNotes.length === 1 ? 'note' : 'notes'}</p>
            </div>
            <div className="flex flex-none items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReaderMode(!readerMode)}
                className={`pressable flex h-8 w-8 items-center justify-center rounded-full ${readerMode ? 'bg-primary-600 text-[var(--on-brand)]' : 'bg-[var(--panel-soft)] text-[var(--muted)] hover:text-[var(--ink)]'}`}
                aria-label="Reader mode"
                title="Reader mode — read this notebook as a book"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 6.5C10.5 5 8.5 4.5 6.5 4.5c-1 0-2 .15-3 .5v13c1-.35 2-.5 3-.5 2 0 4 .5 5.5 2 1.5-1.5 3.5-2 5.5-2 1 0 2 .15 3 .5v-13c-1-.35-2-.5-3-.5-2 0-4 .5-5.5 2Z" /><path d="M12 6.5v13" /></svg>
              </button>
              <button
                type="button"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setSortMenu({ x: rect.right - 160, y: rect.bottom + 6 });
                }}
                className="pressable flex h-8 w-8 items-center justify-center rounded-full bg-[var(--panel-soft)] text-[var(--muted)] hover:text-[var(--ink)]"
                aria-label="Sort notes"
                title="Sort"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M7 5v14m0 0-3-3m3 3 3-3M17 19V5m0 0-3 3m3-3 3 3" /></svg>
              </button>
            </div>
          </div>
        </header>

      {/* WhatsApp-style: password manager reveal after the PIN is typed into search */}
        {lockedRevealed && (
          <Link
            to="/notes/locked"
            className={`flex flex-none items-center gap-2.5 border-b border-[var(--line)] px-4 py-2.5 text-[13px] font-medium transition-colors ${location.pathname.startsWith('/notes/locked') ? 'bg-[var(--panel-soft)] text-[var(--brand)]' : 'text-[var(--ink)] hover:bg-[var(--panel-soft)]/60'}`}
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${location.pathname.startsWith('/notes/locked') ? 'bg-[var(--brand-soft)]' : 'bg-[var(--panel-soft)]'}`}>
              <KeyIcon />
            </span>
            Password manager
          </Link>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <NoteList notes={displayNotes} loading={loading} view="list" trash={trash} activeId={noteId} emptyTitle={emptyTitle} emptyMessage={emptyMessage} onNoteContextMenu={handleNoteContextMenu} />
        </div>
        {noteMenu && <ContextMenu x={noteMenu.x} y={noteMenu.y} items={noteMenu.items} onClose={() => setNoteMenu(null)} />}
        {sortMenu && (
          <ContextMenu
            x={sortMenu.x}
            y={sortMenu.y}
            items={[
              { label: 'Date modified', active: sort.by === 'updatedAt', run: () => setSort({ by: 'updatedAt', order: 'desc' }) },
              { label: 'Date created', active: sort.by === 'createdAt', run: () => setSort({ by: 'createdAt', order: 'desc' }) },
              { label: 'Title', active: sort.by === 'title', run: () => setSort({ by: 'title', order: 'asc' }) },
              ...(sort.by === 'accessedAt' ? [{ label: 'Last opened', active: true, run: () => setSort({ by: 'accessedAt', order: 'desc' }) }] : [])
            ]}
            onClose={() => setSortMenu(null)}
          />
        )}
      </section>

      {/* Resizable divider between list and editor (desktop) */}
      {!hasSelection && <div className="hidden flex-none lg:block lg:w-0" aria-hidden="true" />}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize note list"
        data-resize="list"
        onPointerDown={beginListResize}
        onDoubleClick={resetList}
        className="col-resize-handle hidden flex-none lg:block"
      />

      <section className={`${hasSelection ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col overflow-hidden bg-[var(--app-bg)]`}>
        {readerMode ? (
          <ReaderView
            notes={displayNotes}
            startNoteId={noteId}
            variant={viewPath.startsWith('/notes/folder') ? 'collection' : 'single'}
            folderId={filter?.folderId ?? null}
            onCreateNote={async () => {
              const created = await noteService.createNote({ title: '', content: { type: 'doc', content: [] }, tags: [], folderId: filter?.folderId ?? null });
              return created.id;
            }}
            onClose={() => setReaderMode(false)}
          />
        ) : splitView && hasSelection ? (
          <div className="flex min-h-0 flex-1">
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <Outlet />
              <button
                type="button"
                onClick={() => void updateSettings({ splitView: false })}
                className="pressable absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--panel)] text-[var(--muted)] shadow-sm hover:text-[var(--ink)]"
                aria-label="Close split view"
                title="Close split view"
              >
                <CloseGlyph />
              </button>
            </div>
            <div className="w-px flex-none bg-[var(--line)]" aria-hidden="true" />
            <div className="relative hidden min-w-0 flex-1 overflow-hidden lg:block">
              <SplitPane />
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </section>
    </div>
  );
}

/** Right half of split view: pick a second note, then edit it side by side. */
function SplitPane() {
  const { settings, update } = useSettings();
  const splitNoteId = settings?.splitNoteId ?? null;
  const { notes } = useNotes({ isDeleted: false });
  const [query, setQuery] = useState('');

  const candidates = notes.filter((note) =>
    !query.trim() || note.title.toLowerCase().includes(query.trim().toLowerCase())
  );

  if (!splitNoteId) {
    return (
      <div className="flex h-full flex-col bg-[var(--app-bg)]">
        <div className="flex flex-none items-center justify-between border-b border-[var(--line)] px-4 py-2.5">
          <p className="text-[13px] font-medium text-[var(--ink)]">Choose a note to view side by side</p>
          <button
            type="button"
            onClick={() => void update({ splitView: false })}
            className="pressable rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
            aria-label="Close split view"
          >
            <CloseGlyph />
          </button>
        </div>
        <div className="px-4 pt-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes"
            className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-2">
          {candidates.slice(0, 40).map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => void update({ splitNoteId: note.id })}
              className="block w-full px-4 py-2 text-left hover:bg-[var(--panel-soft)]/60"
            >
              <p className="truncate text-[13px] font-medium text-[var(--ink)]">{note.title || 'Untitled'}</p>
              {note.plainTextContent?.slice(0, 80) && <p className="truncate text-[11.5px] text-[var(--muted)]">{note.plainTextContent.slice(0, 80)}</p>}
            </button>
          ))}
          {!candidates.length && <p className="px-4 py-3 text-[13px] text-[var(--muted)]">No matching notes.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-0">
      <button
        type="button"
        onClick={() => void update({ splitNoteId: null })}
        className="pressable absolute left-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-md bg-[var(--panel)] text-[var(--muted)] shadow-sm hover:text-[var(--ink)]"
        aria-label="Change split note"
        title="Change note"
      >
        <CloseGlyph />
      </button>
      <NoteEditor noteId={splitNoteId} />
    </div>
  );
}

function FolderWorkspace() {
  const { folderId } = useParams();
  const { folder } = useFolder(folderId);
  const [unlocked, setUnlocked] = useState(isUnlocked());

  if (folder?.locked && !unlocked) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="app-panel w-full max-w-sm rounded-lg px-6 py-2">
          <PinPrompt onUnlocked={() => setUnlocked(true)} />
        </div>
      </div>
    );
  }
  return <NotesWorkspace title={folder?.name || 'Folder'} filter={{ folderId }} viewPath={`/notes/folder/${folderId}`} />;
}

/**
 * Password manager: reachable only by typing its PIN (or the app PIN) into the
 * notes search bar. Locks itself again as soon as the section is closed.
 */
function PasswordsWorkspace() {
  const [unlocked, setUnlocked] = useState(isVaultUnlocked());

  // Re-lock when the section is closed
  useEffect(() => () => lockVault(), []);

  if (!unlocked) {
    return (
      <div className="flex h-full items-start justify-center px-6 pt-14">
        <div className="app-panel w-full max-w-sm rounded-lg px-6 py-2">
          <PinPrompt scope="vault" onUnlocked={() => setUnlocked(true)} />
        </div>
      </div>
    );
  }
  return <VaultManager full />;
}

function EmptyEditor() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <svg className="mb-1 h-8 w-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" d="M7 4.5h8.5A2.5 2.5 0 0 1 18 7v10a2.5 2.5 0 0 1-2.5 2.5H7a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" /><path strokeLinecap="round" strokeWidth="1.4" d="M9 9h5M9 12.5h5" /></svg>
      <p className="text-base font-semibold text-[var(--ink)]">Select a note</p>
      <p className="text-[13px] text-[var(--muted)]">Pick a note from the list, or press Ctrl+N to start a new one.</p>
    </div>
  );
}

function NotesPage() {
  return (
    <Routes>
      <Route path="" element={<NotesWorkspace title="All notes" viewPath="/notes" />}>
        <Route index element={<EmptyEditor />} />
        <Route path="new" element={<NoteEditor />} />
        <Route path=":noteId" element={<NoteEditor />} />
      </Route>
      <Route path="favourites" element={<NotesWorkspace title="Favourites" filter={{ isStarred: true }} viewPath="/notes/favourites" />}>
        <Route index element={<EmptyEditor />} />
        <Route path=":noteId" element={<NoteEditor />} />
      </Route>
      <Route path="archived" element={<NotesWorkspace title="Archive" filter={{ isArchived: true }} viewPath="/notes/archived" />}>
        <Route index element={<EmptyEditor />} />
        <Route path=":noteId" element={<NoteEditor />} />
      </Route>
      <Route path="trash" element={<NotesWorkspace title="Trash" filter={{ isDeleted: true }} viewPath="/notes/trash" trash />}>
        <Route index element={<EmptyEditor />} />
        <Route path=":noteId" element={<NoteEditor />} />
      </Route>
      <Route path="locked" element={<PasswordsWorkspace />} />
      <Route path="folder/:folderId" element={<FolderWorkspace />}>
        <Route index element={<EmptyEditor />} />
        <Route path="new" element={<NoteEditor />} />
        <Route path=":noteId" element={<NoteEditor />} />
      </Route>
    </Routes>
  );
}

const CloseGlyph = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
);

const KeyIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8-8m-3 3 2.5 2.5m-5 -0.5 2.5 2.5" />
  </svg>
);


export default NotesPage;
