import { useLiveQuery } from 'dexie-react-hooks';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';

function WhiteboardPreview({ boardId, selected = false }: { boardId: string; selected?: boolean }) {
  const board = useLiveQuery(() => whiteboardsRepository.get(boardId), [boardId], null);

  if (board === null) {
    return <div className="my-4 h-40 animate-pulse rounded-xl bg-[var(--panel-soft)]" />;
  }

  if (!board) {
    return (
      <div className="my-4 rounded-xl border border-dashed border-[var(--line)] px-5 py-8 text-center text-sm text-[var(--muted)]">
        Whiteboard unavailable
      </div>
    );
  }

  return (
    <a
      href={`/whiteboards/${board.id}`}
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
      <div className="border-t border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">{board.title}</div>
    </a>
  );
}

export default WhiteboardPreview;
