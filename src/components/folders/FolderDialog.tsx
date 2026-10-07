import { useEffect, useRef, useState } from 'react';
import { Folder } from '@/types';
import { folderService } from '@/services/FolderService';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Toggle from '@/components/ui/Toggle';
import { FOLDER_COVERS, coverGradient } from '@/components/folders/folder-covers';

interface FolderDialogProps {
  open: boolean;
  folder: Folder | null; // null = create
  onClose: () => void;
}

export function FolderDialog({ open, folder, onClose }: FolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(FOLDER_COVERS[0]!);
  const [locked, setLocked] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(folder?.name ?? '');
      setColor(folder?.color ?? FOLDER_COVERS[0]!);
      setLocked(folder?.locked ?? false);
      setCoverImage(folder?.icon ?? null);
    }
  }, [folder, open]);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { fileToDataUrl } = await import('@/lib/utils/image');
      setCoverImage(await fileToDataUrl(file, 480));
    } catch {
      alert('Could not load that image.');
    }
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (folder) {
      await folderService.updateFolder(folder.id, { name: trimmed, color, locked, icon: coverImage });
    } else {
      await folderService.createFolder({ name: trimmed, color, locked, icon: coverImage });
    }
    onClose();
  };

  const coverStyle = (base: string) =>
    coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: coverGradient(base) };

  return (
    <Modal isOpen={open} onClose={onClose} title={folder ? 'Edit folder' : 'New folder'} size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 flex-none items-center justify-center rounded-lg text-white"
            style={coverStyle(color)}
          >
            {!coverImage && <FolderGlyph />}
          </span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) void save(); }}
            placeholder="Folder name"
            className="h-10 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-medium text-[var(--ink)]">Cover</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="pressable flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.4" /><path d="m3.5 16.5 4.5-4 3.5 3 3.5-3 5.5 4.5" /></svg>
                Image
              </button>
              {coverImage && (
                <button type="button" onClick={() => setCoverImage(null)} className="pressable rounded-md px-2 py-1 text-[11px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40">
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {FOLDER_COVERS.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => { setColor(swatch); setCoverImage(null); }}
                aria-label={`Cover ${swatch}`}
                className={`pressable relative flex h-12 items-center justify-center rounded-lg transition-transform ${!coverImage && color === swatch ? 'scale-[1.04] ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--panel)]' : ''}`}
                style={{ background: coverGradient(swatch) }}
              >
                {!coverImage && color === swatch && (
                  <svg className="h-4 w-4 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                )}
              </button>
            ))}
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void pickImage(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--warm)]/15 text-[var(--warm)]"><LockGlyph /></span>
            <div>
              <p className="text-[13px] font-medium text-[var(--ink)]">Lock folder</p>
              <p className="text-[11px] text-[var(--muted)]">Contents need your PIN; hidden elsewhere</p>
            </div>
          </div>
          <Toggle checked={locked} onChange={setLocked} aria-label="Lock folder" />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => void save()} disabled={!name.trim()}>
            {folder ? 'Save changes' : 'Create folder'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const FolderGlyph = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3.75 7.25A2.25 2.25 0 0 1 6 5h4l2 2h6A2.25 2.25 0 0 1 20.25 9.25v8A2.75 2.75 0 0 1 17.5 20h-11a2.75 2.75 0 0 1-2.75-2.75v-10Z" />
  </svg>
);
const LockGlyph = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </svg>
);
