import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';
import { formatRelativeTime } from '@/lib/utils/date';
import IconButton from '@/components/ui/IconButton';

function WhiteboardsPage() {
  const navigate = useNavigate();
  const boards = useLiveQuery(() => whiteboardsRepository.list(), [], []);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const createBoard = async () => {
    try {
      setCreating(true);
      setError('');
      const board = await whiteboardsRepository.create();
      navigate(`/whiteboards/${board.id}`);
    } catch {
      setError('Could not create a whiteboard.');
      setCreating(false);
    }
  };

  const renameBoard = async (id: string, currentTitle: string) => {
    const title = prompt('Rename whiteboard', currentTitle)?.trim();
    if (title && title !== currentTitle) {
      try {
        setError('');
        await whiteboardsRepository.update(id, { title });
      } catch {
        setError('Could not rename the whiteboard.');
      }
    }
  };

  const deleteBoard = async (id: string) => {
    if (confirm('Delete this whiteboard? Notes linking to it will show it as unavailable.')) {
      try {
        setError('');
        await whiteboardsRepository.delete(id);
      } catch {
        setError('Could not delete the whiteboard.');
      }
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Canvas</p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--ink)]">Whiteboards</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{boards.length} {boards.length === 1 ? 'board' : 'boards'} · Sketch ideas, map flows, and link boards from your notes.</p>
        </div>
        <button
          type="button"
          onClick={createBoard}
          disabled={creating}
          className="pressable inline-flex h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white shadow-sm shadow-primary-600/20 hover:bg-primary-700 disabled:cursor-wait disabled:opacity-60"
        >
          <PlusIcon /> {creating ? 'Creating…' : 'New whiteboard'}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {boards.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map(board => (
            <article key={board.id} className="app-panel group overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() => navigate(`/whiteboards/${board.id}`)}
                className="block w-full text-left"
                aria-label={`Open ${board.title}`}
              >
                {board.previewDataUrl ? (
                  <img src={board.previewDataUrl} alt="" className="aspect-[16/10] w-full bg-white object-contain" />
                ) : (
                  <div className="flex aspect-[16/10] items-center justify-center bg-[radial-gradient(circle,var(--line)_1px,transparent_1px)] [background-size:18px_18px] text-[var(--muted)]">
                    <BoardIcon className="h-10 w-10" />
                  </div>
                )}
              </button>
              <div className="flex items-center gap-3 border-t border-[var(--line)] px-4 py-3">
                <button type="button" onClick={() => navigate(`/whiteboards/${board.id}`)} className="min-w-0 flex-1 text-left">
                  <h2 className="truncate text-sm font-semibold text-[var(--ink)]">{board.title}</h2>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Edited {formatRelativeTime(board.updatedAt)}</p>
                </button>
                <IconButton icon={<RenameIcon />} label={`Rename ${board.title}`} onClick={() => renameBoard(board.id, board.title)} />
                <IconButton icon={<TrashIcon />} label={`Delete ${board.title}`} variant="danger" onClick={() => deleteBoard(board.id)} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="app-panel flex min-h-[360px] flex-col items-center justify-center rounded-2xl px-6 text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-900/25 dark:text-primary-300"><BoardIcon className="h-7 w-7" /></span>
          <h2 className="text-lg font-semibold text-[var(--ink)]">No whiteboards yet</h2>
          <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">Start with a blank canvas, then connect it to any note.</p>
          <button type="button" onClick={createBoard} className="pressable mt-5 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">New whiteboard</button>
        </div>
      )}
    </div>
  );
}

const PlusIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>;
const BoardIcon = ({ className = 'h-[18px] w-[18px]' }: { className?: string }) => <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 4.5h15v15h-15zM8 15l3-4 2 2 3-4" /></svg>;
const RenameIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Zm9.5-12.5 3 3" /></svg>;
const TrashIcon = () => <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 7h15M9 7V4.5h6V7m2.75 0-.6 11.05a2 2 0 0 1-2 1.9h-6.3a2 2 0 0 1-2-1.9L6.25 7M10 11v5M14 11v5" /></svg>;

export default WhiteboardsPage;
