import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateHTML } from '@tiptap/html';
import { noteVersionsRepository } from '@/lib/db/note-versions.repository';
import { getEditorExtensions } from '@/lib/editor/extensions';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';

interface VersionHistoryModalProps {
  open: boolean;
  onClose: () => void;
  noteId: string;
  currentTitle: string;
  /** Live HTML of the note body, for the "Current version" preview. */
  currentHtml: string;
  onRestore: (version: { title: string; content: import('@tiptap/react').JSONContent }) => Promise<void>;
}

/**
 * UpNote-style version history: snapshot list on the left, live preview on the
 * right, with Restore and Delete. Snapshots are stored locally on this device.
 */
export function VersionHistoryModal({ open, onClose, noteId, currentTitle, currentHtml, onRestore }: VersionHistoryModalProps) {
  const liveVersions = useLiveQuery(
    () => (open && noteId ? noteVersionsRepository.listByNote(noteId) : Promise.resolve([])),
    [open, noteId],
    []
  );
  // Defensive: some test harnesses mock useLiveQuery with non-array values
  const versions = Array.isArray(liveVersions) ? liveVersions : [];
  const [selectedId, setSelectedId] = useState<string | 'current' | null>(null);
  const [restoring, setRestoring] = useState(false);

  const selected = versions.find((version) => version.id === selectedId) || null;
  const showCurrent = selectedId === 'current' || (!versions.length && selectedId === null);

  const previewHtml = useMemo(() => {
    if (showCurrent) return currentHtml;
    if (!selected) return '';
    try {
      return generateHTML(selected.content, getEditorExtensions());
    } catch {
      return `<p>${escapeHtml(selected.plainTextContent).replace(/\n/g, '<br>')}</p>`;
    }
  }, [showCurrent, selected, currentHtml]);

  const restore = async () => {
    if (!selected) return;
    setRestoring(true);
    try {
      await onRestore({ title: selected.title, content: selected.content });
      onClose();
    } finally {
      setRestoring(false);
    }
  };

  const remove = async () => {
    if (!selected) return;
    await noteVersionsRepository.remove(selected.id);
    setSelectedId(null);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Version History" size="xl">
      <div className="flex h-[62vh] min-h-[380px] gap-4">
        {/* Version list */}
        <div className="flex w-64 flex-none flex-col border-r border-[var(--line)] pr-4">
          <p className="pb-2 text-[11.5px] leading-relaxed text-[var(--muted)]">Version history is saved locally on this device.</p>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Row label="Current version" active={showCurrent} onClick={() => setSelectedId('current')} />
            {versions.map((version) => (
              <Row
                key={version.id}
                label={new Date(version.createdAt).toLocaleString()}
                active={selectedId === version.id}
                onClick={() => setSelectedId(version.id)}
                onDelete={selectedId === version.id ? () => void remove() : undefined}
              />
            ))}
            {!versions.length && (
              <p className="px-2 py-3 text-[11.5px] leading-relaxed text-[var(--muted)]">
                Snapshots appear here as you edit — one at most every 30 seconds.
              </p>
            )}
          </div>
          {selected && (
            <div className="flex flex-none flex-col gap-2 pt-3">
              <Button onClick={() => void restore()} disabled={restoring}>
                {restoring ? 'Restoring…' : 'Restore'}
              </Button>
              <Button variant="danger" onClick={() => void remove()}>
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="min-w-0 flex-1 overflow-y-auto rounded-md border border-[var(--line)] bg-[var(--panel)] px-5 py-4">
          <h1 className="mb-3 font-serif text-xl font-bold text-[var(--ink)]">
            {showCurrent ? currentTitle : selected?.title || currentTitle}
          </h1>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-[var(--ink)]"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, active, onClick, onDelete }: { label: string; active: boolean; onClick: () => void; onDelete?: () => void }) {
  return (
    <div
      className={`group flex cursor-pointer items-center justify-between border-b border-[var(--line)] px-2 py-2.5 text-[12.5px] last:border-b-0 ${active ? 'bg-[var(--panel-soft)] font-medium text-[var(--ink)]' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)]/50'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter') onClick(); }}
    >
      <span className="truncate">{label}</span>
      {onDelete && (
        <span onClick={(event) => event.stopPropagation()}>
          <IconButton icon={<TrashGlyph />} label="Delete version" variant="danger" onClick={onDelete} />
        </span>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TrashGlyph = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4.5 7h15M9 7V4.5h6V7m2.75 0-.6 11.05a2 2 0 0 1-2 1.9h-6.3a2 2 0 0 1-2-1.9L6.25 7" />
  </svg>
);
