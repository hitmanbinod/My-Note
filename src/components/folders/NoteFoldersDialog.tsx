import { useEffect, useMemo, useState } from 'react';
import { useFolders } from '@/hooks/useFolders';
import { folderService } from '@/services/FolderService';
import { coverGradient } from '@/components/folders/folder-covers';
import Modal from '@/components/ui/Modal';
import IconButton from '@/components/ui/IconButton';

interface NoteFoldersDialogProps {
  open: boolean;
  currentFolderIds: string[];
  onClose: () => void;
  onSave: (folderIds: string[]) => Promise<void>;
}

/**
 * UpNote-style "Add to notebooks" sheet: search + checkbox list so a note
 * can live in multiple folders at once, with quick-create for new folders.
 */
export function NoteFoldersDialog({ open, currentFolderIds, onClose, onSave }: NoteFoldersDialogProps) {
  const { folders } = useFolders();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(currentFolderIds));
      setQuery('');
      setCreating(false);
      setNewName('');
    }
  }, [open, currentFolderIds]);

  const filtered = useMemo(() => {
    const lower = query.trim().toLowerCase();
    if (!lower) return folders;
    return folders.filter((folder) => folder.name.toLowerCase().includes(lower));
  }, [folders, query]);

  const toggle = (folderId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const quickCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const folder = await folderService.createFolder({ name, color: '#0e8fc4' });
      setSelected((prev) => new Set(prev).add(folder.id));
      setNewName('');
      setCreating(false);
    } catch {
      /* ignore */
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add to notebooks" size="sm">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search folders"
              className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] pl-8 pr-3 text-[13px] outline-none focus:border-[var(--brand)]"
            />
          </div>
          <IconButton icon={<PlusIcon />} label="New folder" onClick={() => setCreating(!creating)} />
        </div>

        {creating && (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') void quickCreate(); }}
              placeholder="New folder name"
              className="h-9 w-full rounded-md border border-[var(--brand)] bg-[var(--panel)] px-3 text-[13px] outline-none"
            />
            <button type="button" onClick={() => void quickCreate()} className="pressable flex-none rounded-md bg-primary-600 px-3 py-2 text-xs font-semibold text-[var(--on-brand)] hover:bg-primary-700">Add</button>
          </div>
        )}

        <div className="max-h-64 divide-y divide-[var(--line)] overflow-y-auto rounded-md border border-[var(--line)]">
          {folders === undefined ? null : filtered.length ? (
            filtered.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => toggle(folder.id)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-[var(--panel-soft)]/60"
              >
                <span className="h-5 w-7 flex-none rounded-[5px] border border-black/10" style={{ background: coverGradient(folder.color) }} />
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink)]">{folder.name}</span>
                {folder.locked && <span className="text-[10px] text-[var(--warm)]">locked</span>}
                <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded border ${selected.has(folder.id) ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--muted)]/50'}`}>
                  {selected.has(folder.id) && (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                  )}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3.5 py-3 text-[13px] text-[var(--muted)]">No folders{query ? ' match your search' : ' yet'}.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="pressable rounded-md px-3 py-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">Cancel</button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="pressable rounded-md bg-primary-600 px-4 py-1.5 text-[13px] font-semibold text-[var(--on-brand)] hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : `Done${selected.size ? ` · ${selected.size}` : ''}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
);
