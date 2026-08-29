import { useMemo, useState } from 'react';
import { Link, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import { useFolder } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import { useSearch } from '@/hooks/useSearch';
import { NoteFilter, NoteSortField } from '@/types';
import Layout from '@/components/layout/Layout';
import NoteList from '@/components/notes/NoteList';
import NoteEditor from '@/components/notes/NoteEditor';

function NotesPage() {
  return <Layout><Routes><Route index element={<NotesListView />} /><Route path="starred" element={<NotesListView filter={{ isDeleted: false, isStarred: true }} title="Starred" description="Notes you want close at hand." />} /><Route path="archived" element={<NotesListView filter={{ isDeleted: false, isArchived: true }} title="Archive" description="Finished notes, kept for later." />} /><Route path="trash" element={<NotesListView filter={{ isDeleted: true }} title="Trash" description="Notes here can be restored or permanently removed." trash />} /><Route path="folder/:folderId" element={<FolderView />} /><Route path="new" element={<NoteEditor />} /><Route path=":noteId" element={<NoteEditor />} /></Routes></Layout>;
}

function NotesListView({ filter = { isDeleted: false, isArchived: false }, title = 'All notes', description = 'Everything you’re thinking, planning, and keeping.', trash = false }: { filter?: NoteFilter; title?: string; description?: string; trash?: boolean }) {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('search') || '';
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<NoteSortField>('updatedAt');
  const { notes, loading } = useNotes(filter, sortBy, sortBy === 'title' ? 'asc' : 'desc');
  const { results, isSearching } = useSearch(query);
  const displayNotes = useMemo(() => {
    const source = query ? results.filter(note => !note.isDeleted) : notes;
    return [...source].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [notes, query, results]);
  const pageTitle = query ? `Results for “${query}”` : title;
  const pageDescription = query ? `${displayNotes.length} matching ${displayNotes.length === 1 ? 'note' : 'notes'}.` : description;

  return (
    <section className="mx-auto max-w-[1180px]">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow mb-2">Your workspace</p><h1 className="text-3xl font-bold tracking-[-.035em] text-[var(--ink)] sm:text-[34px]">{pageTitle}</h1><p className="mt-2 text-sm text-[var(--muted)]">{pageDescription}</p></div>
        <div className="flex items-center gap-2">
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as NoteSortField)} className="h-9 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 text-xs font-semibold text-[var(--muted)] outline-none"><option value="updatedAt">Last edited</option><option value="createdAt">Newest</option><option value="title">Title</option></select>
          <div className="flex rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1">
            <ViewButton active={view === 'grid'} label="Grid view" onClick={() => setView('grid')}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinejoin="round" strokeWidth="1.8" d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" /></svg></ViewButton>
            <ViewButton active={view === 'list'} label="List view" onClick={() => setView('list')}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></svg></ViewButton>
          </div>
          {!trash && <Link to="/notes/new" className="pressable hidden h-9 items-center gap-2 rounded-lg bg-primary-600 px-3.5 text-xs font-semibold text-white hover:bg-primary-700 sm:flex"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>New note</Link>}
        </div>
      </div>
      <NoteList notes={displayNotes} loading={query ? isSearching : loading} view={view} trash={trash} emptyTitle={query ? 'No matches found' : trash ? 'Trash is empty' : 'A quiet space, ready for ideas'} emptyMessage={query ? 'Try a broader word or search a tag.' : trash ? 'Deleted notes will appear here for recovery.' : 'Create your first note, then save it locally when you are ready.'} />
    </section>
  );
}

function FolderView() {
  const { folderId } = useParams();
  const { folder } = useFolder(folderId);
  return <NotesListView filter={{ folderId: folderId || null, isDeleted: false, isArchived: false }} title={folder?.name || 'Folder'} description="Notes collected in this folder." />;
}

function ViewButton({ active, label, onClick, children }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`pressable rounded-md p-1.5 ${active ? 'bg-[var(--panel-soft)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--ink)]'}`} aria-label={label}>{children}</button>;
}

export default NotesPage;
