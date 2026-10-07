import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { vaultRepository } from '@/lib/vault/vault-repository';
import { VaultEntry } from '@/types/vault';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import IconButton from '@/components/ui/IconButton';
import Modal from '@/components/ui/Modal';

/**
 * Minimal password manager, shown inside the PIN-locked section.
 * Each row: password (masked, with eye + copy) on the left and
 * username (with copy) on the right, per the requested layout.
 */
export function VaultManager({ compact, full }: { compact?: boolean; full?: boolean }) {
  const entries = useLiveQuery(() => vaultRepository.list(), [], []);
  const [editing, setEditing] = useState<VaultEntry | 'new' | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState('');

  const flash = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 1800);
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${label} copied ✓`);
    } catch {
      flash('Copy failed');
    }
  };

  const remove = async (entry: VaultEntry) => {
    if (confirm(`Delete password for "${entry.title}"? This cannot be undone.`)) {
      await vaultRepository.remove(entry.id);
    }
  };

  const rows = (entries || []).map((entry) => (
    <div key={entry.id} className="border-b border-[var(--line)] px-5 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]">{entry.title}</p>
        {entry.url && <span className="truncate text-[11px] text-[var(--muted)]">{entry.url}</span>}
        <IconButton icon={<PencilIcon />} label={`Edit ${entry.title}`} onClick={() => setEditing(entry)} />
        <IconButton icon={<TrashIcon />} label={`Delete ${entry.title}`} variant="danger" onClick={() => void remove(entry)} />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {/* Username — shown first, with copy */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5">
          <UserGlyph />
          <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--ink)]">{entry.username || '—'}</span>
          <button
            type="button"
            onClick={() => void copy(entry.username, 'Username')}
            className="pressable flex h-6 w-6 flex-none items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
            aria-label="Copy username"
            title="Copy username"
          >
            <CopyIcon />
          </button>
        </div>
        {/* Password — masked with eye + copy */}
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5">
          <KeyGlyph />
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-[var(--ink)]">
            {revealed[entry.id] ? entry.password : '•'.repeat(Math.min(entry.password.length || 8, 14))}
          </span>
          <button
            type="button"
            onClick={() => setRevealed((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
            className="pressable flex h-6 w-6 flex-none items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
            aria-label={revealed[entry.id] ? 'Hide password' : 'Show password'}
            title={revealed[entry.id] ? 'Hide password' : 'Show password'}
          >
            {revealed[entry.id] ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button
            type="button"
            onClick={() => void copy(entry.password, 'Password')}
            className="pressable flex h-6 w-6 flex-none items-center justify-center rounded text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]"
            aria-label="Copy password"
            title="Copy password"
          >
            <CopyIcon />
          </button>
        </div>
      </div>
      {entry.note && <p className="mt-1.5 text-[11px] text-[var(--muted)]">{entry.note}</p>}
    </div>
  ));

  return (
    <div className={`flex h-full min-h-0 flex-col ${full ? '' : ''}`}>
      <div className={compact ? 'min-h-0 flex-1 overflow-y-auto' : 'flex min-h-0 flex-1 flex-col'}>
        {compact ? (
          <div className="border-b border-[var(--line)] px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-base font-bold tracking-tight">Passwords</h2>
              <Button size="sm" onClick={() => setEditing('new')}>Add</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-none items-center justify-between border-b border-[var(--line)] px-5 py-3">
            <div>
              <h2 className="font-serif text-lg font-bold tracking-tight">Passwords</h2>
              <p className="text-[11px] text-[var(--muted)]">{entries?.length ?? 0} saved · stored only on this device</p>
            </div>
            <Button size="sm" onClick={() => setEditing('new')}>Add password</Button>
          </div>
        )}

        {feedback && <p className="px-5 pt-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{feedback}</p>}

        <div className={compact ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 flex-1 overflow-y-auto'}>
          {entries === undefined ? null : entries.length ? (
            rows
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--panel-soft)] text-[var(--muted)]"><KeyIcon /></span>
              <p className="text-[13px] font-medium text-[var(--ink)]">No passwords saved</p>
              <p className="max-w-[32ch] text-xs text-[var(--muted)]">Store logins here — they never leave this device and sit behind your PIN.</p>
              <Button size="sm" variant="secondary" onClick={() => setEditing('new')}>Add your first password</Button>
            </div>
          )}
        </div>
      </div>

      <VaultModal
        entry={editing === 'new' ? null : editing instanceof Object ? (editing as VaultEntry) : null}
        open={editing !== null}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function VaultModal({ entry, open, onClose }: { entry: VaultEntry | null; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(entry?.title ?? '');
      setUsername(entry?.username ?? '');
      setPassword(entry?.password ?? '');
      setUrl(entry?.url ?? '');
      setNote(entry?.note ?? '');
      setShowPassword(false);
    }
  }, [entry, open]);

  const save = async () => {
    if (!title.trim() || !password) return;
    if (entry) {
      await vaultRepository.update(entry.id, { title: title.trim(), username, password, url: url || null, note: note || null });
    } else {
      await vaultRepository.create({ title: title.trim(), username, password, url: url || null, note: note || null });
    }
    onClose();
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={entry ? 'Edit password' : 'Add password'} size="sm">
      <div className="space-y-3">
        <Input label="Name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Gmail" autoFocus />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="you@example.com" autoComplete="off" />
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[var(--muted)]">Password</label>
          <div className="flex gap-1.5">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--brand)]"
              autoComplete="new-password"
            />
            <IconButton icon={showPassword ? <EyeOffIcon /> : <EyeIcon />} label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} />
          </div>
        </div>
        <Input label="Website (optional)" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recovery hints…" />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => void save()} disabled={!title.trim() || !password}>
            {entry ? 'Save changes' : 'Add password'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const CopyIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
);
const UserGlyph = () => (
  <svg className="h-3.5 w-3.5 flex-none text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="3.4" /><path d="M5.5 19.5c.9-3 3.4-4.5 6.5-4.5s5.6 1.5 6.5 4.5" />
  </svg>
);
const KeyGlyph = () => (
  <svg className="h-3.5 w-3.5 flex-none text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </svg>
);
const EyeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </svg>
);
const EyeOffIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 4l16 16M9.9 5.9A9.5 9.5 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.5 17.5 0 0 1-2.2 3M6.1 7.6A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.4-.7" />
    <path d="M9.9 9.9a2.8 2.8 0 0 0 4 4" />
  </svg>
);
const PencilIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Zm9.5-12.5 3 3" />
  </svg>
);
const TrashIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4.5 7h15M9 7V4.5h6V7m2.75 0-.6 11.05a2 2 0 0 1-2 1.9h-6.3a2 2 0 0 1-2-1.9L6.25 7" />
  </svg>
);
const KeyIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8-8m-3 3 2.5 2.5m-5 -0.5 2.5 2.5" />
  </svg>
);
