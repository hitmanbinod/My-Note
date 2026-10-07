import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';

function WhiteboardPreview({ boardId, selected = false }: { boardId: string; selected?: boolean }) {
  const board = useLiveQuery(() => whiteboardsRepository.get(boardId), [boardId], null);

  // data-whiteboard-id keeps the board identity in the DOM for right-click
  // menus even when the board itself is gone. Removal lives in the ·· menu /
  // right-click (handled by the editor pane).
  return (
    <div className="group relative" data-whiteboard-id={boardId}>
      {board === null ? (
        <div className="my-4 h-40 animate-pulse rounded-xl bg-[var(--panel-soft)]" />
      ) : !board ? (
        <div className="my-4 flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-[var(--line)] px-5 text-center text-sm text-[var(--muted)]">
          <span>
            Whiteboard unavailable
            <span className="mt-1 block text-[11px]">Use the ·· menu to remove it</span>
          </span>
        </div>
      ) : (
        <Link
          to={`/whiteboards/${board.id}`}
          onClick={(event) => event.preventDefault()}
          aria-label={`Open ${board.title}`}
          className={`my-4 block overflow-hidden rounded-xl border bg-[var(--panel)] no-underline ${selected ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-[var(--line)]'}`}
        >
          {board.previewDataUrl ? (
            <img src={board.previewDataUrl} alt="" className="aspect-[16/9] w-full bg-white object-contain" />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center bg-[radial-gradient(circle,var(--line)_1px,transparent_1px)] [background-size:18px_18px] text-sm text-[var(--muted)]">
              Preview appears after drawing
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
            <span className="truncate">{board.title}</span>
            {board.scope === 'note' && <span className="flex-none rounded border border-[var(--line)] px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">Note board</span>}
          </div>
        </Link>
      )}
    </div>
  );
}

export default WhiteboardPreview;
