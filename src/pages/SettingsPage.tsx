import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { useSettings } from '@/hooks/useSettings';
import { db } from '@/lib/db/database';
import { initiateGoogleAuth, signOut } from '@/lib/auth/google-auth';
import { runSync } from '@/lib/sync/sync-service';
import { ACCENTS, FONTS, PAGE_COLORS, pickOnBrand } from '@/lib/theme/appearance';
import { useIsDark } from '@/hooks/useIsDark';
import { savePin, verifyPin, clearPin, hasPin, isValidPinFormat } from '@/lib/utils/pin';
import { comboFromEvent, formatCombo, resolveShortcuts } from '@/lib/shortcuts';
import { runBackup, restoreFromBackup } from '@/lib/backup/backup-service';
import { importFromSource } from '@/lib/backup/import-service';
import { PinInput } from '@/components/security/PinPrompt';
import type { AccentColor, DefaultView, EditorFont, PageColor, Theme } from '@/types/settings';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import packageJson from '../../package.json';

type SettingsTab = 'appearance' | 'editor' | 'shortcuts' | 'security' | 'backup' | 'account' | 'data';

const PaletteIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.3 0 2-.9 2-2 0-.6-.3-1.1-.6-1.5-.3-.4-.6-.9-.6-1.5 0-1.1.9-2 2-2h2.4A3.8 3.8 0 0 0 21 10.2C20.4 6 16.6 3 12 3Z" /><circle cx="7.5" cy="11.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="11" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="16" cy="8.5" r="1.2" fill="currentColor" stroke="none"/></svg>;
const ShortcutsIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01M15 14h.01M17.5 14h.01" /></svg>;
const EditorIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 12.5h8M8 16h5"/></svg>;
const ShieldIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 3 5 5.5v5.6c0 4.3 3 8.3 7 9.9 4-1.6 7-5.6 7-9.9V5.5L12 3Z"/><path d="m9.2 12 2 2 3.6-4"/></svg>;
const BackupIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5"/><path d="M4.5 15.5v2A2.5 2.5 0 0 0 7 20h10a2.5 2.5 0 0 0 2.5-2.5v-2"/></svg>;
const UserIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.4 3.6-5 7-5s6.2 1.6 7 5"/></svg>;
const DataIcon = () => <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/></svg>;

const NAV: Array<{ key: SettingsTab; label: string; icon: React.ReactNode }> = [
  { key: 'appearance', label: 'Appearance', icon: <PaletteIcon /> },
  { key: 'editor', label: 'Editor', icon: <EditorIcon /> },
  { key: 'shortcuts', label: 'Shortcuts', icon: <ShortcutsIcon /> },
  { key: 'security', label: 'Security', icon: <ShieldIcon /> },
  { key: 'backup', label: 'Backup', icon: <BackupIcon /> },
  { key: 'account', label: 'Account', icon: <UserIcon /> },
  { key: 'data', label: 'Data', icon: <DataIcon /> }
];

function SettingsPage() {
  const { settings, update } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const isDark = useIsDark();

  // Escape leaves settings, like every other window
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Clicking the page outside the settings shell also closes settings
  const onBackdropClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, .app-panel, input, select')) return;
    navigate(-1);
  };

  return (
    <div className="min-h-full" onClick={onBackdropClick}>
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-8">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => { if (location.key !== 'default') navigate(-1); else navigate('/notes'); }}
          className="mb-3 inline-flex items-center text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <h1 className="font-serif text-2xl font-bold text-[var(--ink)]">Settings</h1>
      </div>

      {/* UpNote-style settings shell: left nav + content */}
      <div className="app-panel flex overflow-hidden rounded-lg">
        <nav className="w-[168px] flex-none border-r border-[var(--line)] bg-[var(--panel-soft)]/40 px-2 py-3">
          {NAV.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pressable mb-0.5 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-[13px] ${
                activeTab === key
                  ? 'bg-[var(--brand-soft)] font-semibold text-[var(--brand-text)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              <span className={activeTab === key ? 'text-[var(--brand)]' : ''}>{icon}</span>
              {label}
            </button>
          ))}
          <div className="mt-4 border-t border-[var(--line)] px-3 pt-3 text-[10.5px] text-[var(--muted)]">
            v{packageJson.version}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {activeTab === 'appearance' && (
            <>
              <Row title="Theme" description="How Tipot looks on this device">
                <Segmented<Theme>
                  value={settings?.theme ?? 'system'}
                  onChange={(value) => void update({ theme: value })}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' }
                  ]}
                />
              </Row>
              <Row title="Accent color" description="Used for buttons, selection and links." stack>
                <div className="grid w-fit grid-cols-6 gap-2.5">
                  {(Object.keys(ACCENTS) as AccentColor[]).map((key) => {
                    const selected = (settings?.accentColor ?? 'blue') === key;
                    const def = ACCENTS[key];
                    const fill = isDark ? def.dark : def.light;
                    return (
                      <button key={key} type="button" onClick={() => void update({ accentColor: key })} className="pressable flex w-[86px] flex-col items-center gap-1" aria-label={`Accent ${def.name}`} aria-pressed={selected} title={def.name}>
                        <span
                          className="relative block h-12 w-full overflow-hidden rounded-lg"
                          style={{
                            background: fill,
                            boxShadow: selected ? '0 0 0 2px var(--surface-1), 0 0 0 4px var(--brand)' : 'inset 0 0 0 1px var(--line-strong)'
                          }}
                        >
                          {selected && (
                            <svg className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2" style={{ color: pickOnBrand(fill) }} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row title="Page color" description="Background of the app window and notes." stack>
                <div className="flex flex-wrap items-start gap-2.5">
                  {(Object.keys(PAGE_COLORS) as PageColor[]).map((key) => {
                    const selected = (settings?.pageColor ?? 'default') === key;
                    const preset = PAGE_COLORS[key];
                    return (
                      <button key={key} type="button" onClick={() => void update({ pageColor: key })} className="pressable flex w-[86px] flex-col items-center gap-1" aria-label={`Page color ${preset.name}`} aria-pressed={selected} title={preset.name}>
                        <span
                          className="relative block h-12 w-full overflow-hidden rounded-lg"
                          style={{
                            background: isDark ? preset.darkAppBg : preset.appBg,
                            boxShadow: selected ? '0 0 0 2px var(--surface-1), 0 0 0 4px var(--brand)' : 'inset 0 0 0 1px var(--line-strong)'
                          }}
                        >
                          <span className="absolute left-2 right-2 top-2 block h-6 rounded-[4px]" style={{ background: isDark ? preset.darkPanel : preset.panel }} />
                          <span className="absolute left-2 top-9 block h-1 w-10 rounded-full" style={{ background: isDark ? 'rgb(255 255 255 / .35)' : 'rgb(0 0 0 / .3)' }} />
                          <span className="absolute left-2 top-[46px] block h-1 w-8 rounded-full opacity-60" style={{ background: isDark ? 'rgb(255 255 255 / .25)' : 'rgb(0 0 0 / .2)' }} />
                          {selected && (
                            <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--brand)]">
                              <svg className="h-2.5 w-2.5" style={{ color: 'var(--on-brand)' }} fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                            </span>
                          )}
                        </span>
                        <span className={`text-[11.5px] ${selected ? 'font-semibold text-[var(--ink)]' : 'text-[var(--muted)]'}`}>{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </Row>
            </>
          )}

          {activeTab === 'editor' && (
            <Section title="Editor">
              <Row title="Font" description="Typeface used across the app and the editor">
                <select
                  value={settings?.editorFont ?? 'system'}
                  onChange={(event) => void update({ editorFont: event.target.value as EditorFont })}
                  className="h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
                >
                  {(Object.keys(FONTS) as EditorFont[]).map((key) => (
                    <option key={key} value={key} style={{ fontFamily: FONTS[key].preview }}>{FONTS[key].label}</option>
                  ))}
                </select>
              </Row>
              <Row title="Font size" description="Text size inside the note editor">
                <input
                  type="number"
                  min={12}
                  max={32}
                  step={1}
                  value={settings?.editorFontSize ?? 16}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next) && next >= 12 && next <= 32) void update({ editorFontSize: next });
                  }}
                  className="h-9 w-24 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] tabular-nums outline-none focus:border-[var(--brand)]"
                />
              </Row>
              <Row title="Line spacing" description="Vertical rhythm of paragraphs">
                <Segmented
                  value={String(settings?.editorLineHeight ?? 1.8)}
                  onChange={(value) => void update({ editorLineHeight: Number(value) })}
                  options={[
                    { value: '1.6', label: 'Compact' },
                    { value: '1.8', label: 'Normal' },
                    { value: '2.1', label: 'Relaxed' }
                  ]}
                />
              </Row>
              <Row title="Default notes view" description="Layout used when opening the notes page">
                <Segmented<DefaultView>
                  value={settings?.defaultView ?? 'list'}
                  onChange={(value) => void update({ defaultView: value })}
                  options={[
                    { value: 'list', label: 'List' },
                    { value: 'grid', label: 'Grid' }
                  ]}
                />
              </Row>
              <Row title="Sort notes by" description="Ordering of the note list">
                <Segmented
                  value={settings?.sortBy ?? 'updatedAt'}
                  onChange={(value) => void update({ sortBy: value as 'updatedAt' | 'createdAt' | 'title' })}
                  options={[
                    { value: 'updatedAt', label: 'Edited' },
                    { value: 'createdAt', label: 'Created' },
                    { value: 'title', label: 'Title' }
                  ]}
                />
              </Row>
            </Section>
          )}

          {activeTab === 'shortcuts' && <ShortcutsSection />}
          {activeTab === 'security' && (
            <>
              <SecuritySection />
              <SecuritySection scope="vault" />
            </>
          )}
          {activeTab === 'backup' && <BackupSection />}
          {activeTab === 'account' && (
            <>
              <AccountSection />
              <AppUpdateSection />
            </>
          )}
          {activeTab === 'data' && <DataSection onClearData={() => setShowClearDataModal(true)} />}
        </div>
      </div>

      <div className="mt-4 flex items-center px-1 text-xs text-[var(--ink-3)]">
        <span>Tipot · Local-first · Your data stays yours</span>
      </div>

      {/* Clear Data Modal */}
      <Modal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        title="Clear Local Data"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-[13px] leading-relaxed text-[var(--muted)]">
            This will delete all notes, folders, and settings stored locally on this device. Synced
            data in Google Drive will not be affected.
          </p>
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
            <p className="text-[13px] text-amber-800 dark:text-amber-200">
              This action cannot be undone. Make sure your notes are synced before proceeding.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowClearDataModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                await db.clearAllData();
                setShowClearDataModal(false);
                window.location.reload();
              }}
            >
              Clear Data
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="divide-y divide-[var(--line)]">
      <div className="px-5 pb-1 pt-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--brand)]">{title}</h2>
      </div>
      {children}
      <div className="h-2" />
    </div>
  );
}

function Row({ title, description, children, stack }: { title: string; description?: string; children: React.ReactNode; stack?: boolean }) {
  return (
    <div className={`flex gap-4 px-5 py-4 ${stack ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between'}`}>
      <div className={stack ? '' : 'sm:max-w-[55%]'}>
        <p className="text-sm font-medium text-[var(--ink)]">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{description}</p>}
      </div>
      <div className={stack ? 'w-full' : 'flex-none'}>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }> }) {
  return (
    <div className="inline-flex rounded-md border border-[var(--line)] p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-[var(--panel-soft)] text-[var(--ink)]'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BackupSection() {
  const { settings, update } = useSettings();
  const api = window.electronAPI;
  const dir = settings?.backupDir ?? null;
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [backups, setBackups] = useState<Array<{ file: string; path: string; mtimeMs: number }>>([]);
  const [selectedBackup, setSelectedBackup] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const importInputRef = useRef<HTMLInputElement>(null);

  const flash = (text: string) => { setMessage(text); setError(''); };
  const fail = (text: string) => { setError(text); setMessage(''); };

  const refreshList = useCallback(() => {
    if (api?.backupList && dir) {
      void api.backupList(dir).then((list) => setBackups(list));
    } else {
      setBackups([]);
    }
  }, [api, dir]);
  useEffect(() => { refreshList(); }, [refreshList]);

  const backupNow = async () => {
    setBusy('backup');
    const result = await runBackup({ dir, maxCount: settings?.backupMaxCount ?? 50 });
    setBusy('');
    if (result.ok) {
      await update({ lastBackupAt: Date.now() });
      flash(`Backup saved${result.location ? ` — ${result.location}` : ''}`);
      refreshList();
    } else {
      fail(result.error ?? 'Backup failed');
    }
  };

  const pickFolder = async () => {
    if (!api?.backupSelectFolder) return fail('Choosing a folder needs the desktop app — in the browser, backups download instead.');
    const picked = await api.backupSelectFolder();
    if (picked) {
      await update({ backupDir: picked });
      flash('Backup folder selected');
    }
  };

  const doRestore = async (json: string) => {
    if (!confirm(restoreMode === 'replace'
      ? 'Replace the ENTIRE workspace with this backup? Current notes and notebooks will be removed.'
      : 'Restore this backup on top of your workspace? Only notes that are missing will be added.')) return;
    setBusy('restore');
    try {
      const result = await restoreFromBackup(json, restoreMode);
      flash(`Restored ${result.notes} notes and ${result.folders} notebooks`);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setBusy('');
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy('import');
    try {
      const text = await file.text();
      const result = await importFromSource({ name: file.name, text });
      flash(`Imported ${result.imported} note${result.imported === 1 ? '' : 's'} from ${file.name}`);
    } catch (err) {
      fail(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy('');
    }
  };

  const lastBackup = settings?.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Never';

  return (
    <Section title="Backup">
      <Row title="Backup frequency" description="How often the whole workspace is saved automatically">
        <select
          value={settings?.backupFrequency ?? 'off'}
          onChange={(event) => void update({ backupFrequency: event.target.value as 'off' | 'hourly' | 'daily' | 'weekly' })}
          className="h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
        >
          <option value="off">Off</option>
          <option value="hourly">Every hour</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </Row>
      <Row title="Maximum number of backups" description="Older backup files are removed beyond this limit">
        <select
          value={String(settings?.backupMaxCount ?? 50)}
          onChange={(event) => void update({ backupMaxCount: Number(event.target.value) })}
          className="h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Row>
      <Row title="Backup folder" description={dir || api?.backupSelectFolder ? (dir ?? 'No folder selected yet') : 'In the browser, backups download to your Downloads folder'}>
        <div className="flex flex-wrap items-center gap-2">
          {api?.backupSelectFolder && (
            <>
              <Button size="sm" variant="outline" onClick={() => void pickFolder()}>Select backup folder</Button>
              {dir && <Button size="sm" variant="ghost" onClick={() => void api.backupOpenFolder(dir)}>View backup folder</Button>}
            </>
          )}
          <Button size="sm" onClick={() => void backupNow()} disabled={busy === 'backup'}>
            {busy === 'backup' ? 'Backing up…' : 'Backup now'}
          </Button>
        </div>
      </Row>
      <Row title="Last backup" description="">
        <span className="text-[13px] italic text-[var(--muted)]">{lastBackup}</span>
      </Row>

      <div className="mx-5 my-2 border-t border-[var(--line)]" />

      <Row title="RESTORE BACKUP" description="Restore the workspace from a backup file in your backup folder">
        <div className="flex flex-col gap-2">
          {api?.backupList ? (
            <select
              value={selectedBackup}
              onChange={(event) => setSelectedBackup(event.target.value)}
              className="h-9 min-w-[240px] rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
            >
              <option value="">Select date</option>
              {backups.map((backup) => (
                <option key={backup.path} value={backup.path}>{backup.file.replace(/^(tipot|my-notes)-backup-/, '').replace('.json', '')}</option>
              ))}
            </select>
          ) : (
            <input
              type="file"
              accept=".json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void file.text().then((text) => { setSelectedBackup(file.name); void restoreFromBackup(text, restoreMode).then((r) => flash(`Restored ${r.notes} notes`)).catch((e) => fail(e instanceof Error ? e.message : 'Restore failed')); });
                event.target.value = '';
              }}
              className="text-[13px]"
            />
          )}
          <select
            value={restoreMode}
            onChange={(event) => setRestoreMode(event.target.value as 'merge' | 'replace')}
            className="h-9 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
          >
            <option value="merge">Restore option: merge (add missing)</option>
            <option value="replace">Restore option: replace everything</option>
          </select>
          {api?.backupRead && (
            <Button size="sm" onClick={() => { const path = selectedBackup; if (!path) return fail('Select a backup first'); void api.backupRead(path).then((json) => doRestore(json)); }} disabled={!selectedBackup || busy === 'restore'}>
              {busy === 'restore' ? 'Restoring…' : 'Restore'}
            </Button>
          )}
        </div>
      </Row>

      <div className="mx-5 my-2 border-t border-[var(--line)]" />

      <Row title="Import notes" description="Bring notes in from other apps — Evernote/UpNote ENEX exports, Markdown files, or HTML">
        <input
          ref={importInputRef}
          type="file"
          accept=".json,.md,.markdown,.enex,.html,.htm,.txt"
          className="hidden"
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <Button size="sm" variant="outline" onClick={() => importInputRef.current?.click()} disabled={busy === 'import'}>
          {busy === 'import' ? 'Importing…' : 'Choose file to import…'}
        </Button>
      </Row>

      {(error || message) && (
        <div className="px-5 py-3">
          <p className={`text-xs ${error ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{error || message}</p>
        </div>
      )}
    </Section>
  );
}

type UpdateState = 'idle' | 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error';

/** App updates: silent background downloads via electron-updater; installs on close. */
function AppUpdateSection() {
  const api = window.electronAPI;
  const [state, setState] = useState<UpdateState>('idle');
  const [info, setInfo] = useState<{ version?: string; percent?: number }>({});

  useEffect(() => {
    if (!api?.onAppUpdateStatus) return undefined;
    return api.onAppUpdateStatus((payload) => {
      setState(payload.state as UpdateState);
      setInfo(payload.info ?? {});
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = () => {
    setState('checking');
    void api?.checkForAppUpdate?.();
  };

  if (!api?.checkForAppUpdate) return null; // browser — nothing to update

  const statusText: Partial<Record<UpdateState, string>> = {
    checking: 'Checking for updates…',
    'up-to-date': "You're on the latest version.",
    available: info.version ? `Version ${info.version} is available.` : 'An update is available.',
    downloading: info.percent !== undefined ? `Downloading update — ${info.percent}%` : 'Downloading update…',
    ready: info.version ? `Version ${info.version} is ready — it installs the next time you close the app.` : 'Update ready — it installs the next time you close the app.',
    error: "Couldn't check right now (offline or the release feed is unreachable)."
  };

  return (
    <Section title="App updates">
      <Row title="Version" description={`Tipot v${packageJson.version} — updates download automatically and install when you close the app.`}>
        <Badge variant={state === 'ready' ? 'success' : 'default'}>{state === 'ready' ? 'Update ready' : `v${packageJson.version}`}</Badge>
      </Row>
      {state !== 'idle' && state !== 'checking' && (
        <Row title="Status" description={statusText[state] ?? ''}>
          {state === 'ready' ? (
            <Button size="sm" onClick={() => void api.installAppUpdate?.()}>Restart & update now</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={check} disabled={state === 'downloading'}>
              {state === 'downloading' ? 'Downloading…' : 'Check again'}
            </Button>
          )}
        </Row>
      )}
      {state === 'idle' && (
        <Row title="Check" description="Look for a newer version on the release feed now.">
          <Button size="sm" variant="outline" onClick={check}>Check for updates</Button>
        </Row>
      )}
    </Section>
  );
}

function SecuritySection({ scope = 'app' }: { scope?: 'app' | 'vault' }) {
  const { settings } = useSettings();
  const isVault = scope === 'vault';
  const [pinExists, setPinExists] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'idle' | 'change' | 'create'>('idle');
  const [currentPin, setCurrentPin] = useState<string[]>(['', '', '', '']);
  const [newPin, setNewPin] = useState<string[]>(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const activePinHash = isVault ? settings?.vaultPinHash : settings?.pinHash;
  useEffect(() => {
    void hasPin(scope).then(setPinExists);
  }, [scope, activePinHash]);

  const reset = () => {
    setCurrentPin(['', '', '', '']);
    setNewPin(['', '', '', '']);
    setConfirmPin(['', '', '', '']);
    setMode('idle');
    setError('');
  };

  const flash = (text: string) => {
    setMessage(text);
    setError('');
    window.setTimeout(() => setMessage(''), 2500);
  };

  const fail = (text: string) => {
    setError(text);
    setMessage('');
  };

  const pinString = (boxes: string[]) => boxes.join('');

  const saveChange = async (confirmOverride?: string) => {
    const current = pinString(currentPin);
    const next = pinString(newPin);
    const confirmed = confirmOverride ?? pinString(confirmPin);
    if (!isValidPinFormat(next)) return fail('New PIN must be exactly 4 digits');
    if (next !== confirmed) return fail('New PINs do not match');
    if (!(await verifyPin(current, scope))) return fail('Current PIN is wrong');
    await savePin(next, scope);
    reset();
    flash('PIN updated');
  };

  const saveCreate = async (confirmOverride?: string) => {
    const next = pinString(newPin);
    const confirmed = confirmOverride ?? pinString(confirmPin);
    if (!isValidPinFormat(next)) return fail('PIN must be exactly 4 digits');
    if (next !== confirmed) return fail('PINs do not match');
    await savePin(next, scope);
    reset();
    flash(isVault ? 'PIN saved — the password manager now uses its own PIN' : 'PIN saved — locked folders and the password vault are now protected');
  };

  const remove = async () => {
    if (!(await verifyPin(pinString(currentPin), scope))) return fail('Current PIN is wrong');
    await clearPin(scope);
    reset();
    flash('PIN removed');
  };

  const label = (text: string) => <p className="w-24 flex-none pt-2 text-[12px] text-[var(--muted)]">{text}</p>;

  return (
    <Section title="Security">
      <Row title={isVault ? 'Password manager PIN' : 'PIN lock'} description={pinExists ? (isVault ? 'The password manager opens with this dedicated PIN instead of the app PIN. Type it into the notes search bar.' : 'Protects locked folders and the password vault. Type the PIN into the notes search bar to reveal them.') : (isVault ? 'Give the password manager its own 4-digit PIN, separate from the app PIN. It will open with this PIN (or the app PIN if this stays unset).' : 'Set a 4-digit PIN to protect locked folders and the password vault.')}>
        {pinExists ? (
          <div className="flex items-center gap-2">
            <Badge variant="success">Enabled</Badge>
            <Button size="sm" variant="outline" onClick={() => setMode(mode === 'change' ? 'idle' : 'change')}>
              {mode === 'change' ? 'Cancel' : 'Change'}
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={() => setMode('create')}>Set PIN</Button>
        )}
      </Row>

      {mode === 'create' && pinExists === false && (
        <Row title="Create PIN" stack>
          <div className="flex flex-col gap-3">
            <div className="flex items-start">
              {label('New PIN')}
              <PinInput value={newPin} onChange={setNewPin} compact autoFocus />
            </div>
            <div className="flex items-start">
              {label('Repeat')}
              <PinInput value={confirmPin} onChange={setConfirmPin} compact onComplete={(_pin, values) => void saveCreate(values?.join(''))} />
            </div>
            <div className="flex items-center gap-2 pl-[104px]">
              <Button size="sm" onClick={() => void saveCreate()} disabled={!(pinString(newPin).length === 4) || !(pinString(confirmPin).length === 4)}>Save PIN</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
            </div>
          </div>
        </Row>
      )}

      {mode === 'change' && pinExists && (
        <Row title="Change PIN" stack>
          <div className="flex flex-col gap-3">
            <div className="flex items-start">
              {label('Current')}
              <PinInput value={currentPin} onChange={setCurrentPin} compact autoFocus error={Boolean(error && error.includes('Current'))} />
            </div>
            <div className="flex items-start">
              {label('New PIN')}
              <PinInput value={newPin} onChange={setNewPin} compact />
            </div>
            <div className="flex items-start">
              {label('Repeat')}
              <PinInput value={confirmPin} onChange={setConfirmPin} compact onComplete={() => void saveChange()} />
            </div>
            <div className="flex items-center gap-2 pl-[104px]">
              <Button size="sm" onClick={() => void saveChange()} disabled={!(pinString(currentPin).length === 4) || !(pinString(newPin).length === 4)}>Save</Button>
              <Button size="sm" variant="danger" onClick={() => void remove()} disabled={!(pinString(currentPin).length === 4)}>Remove PIN</Button>
              <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
            </div>
          </div>
        </Row>
      )}

      {(error || message) && (
        <div className="px-5 py-3">
          <p className={`text-xs ${error ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{error || message}</p>
        </div>
      )}
    </Section>
  );
}

function ShortcutsSection() {
  const { settings, update } = useSettings();
  const resolved = resolveShortcuts(settings?.shortcuts);
  const [capturing, setCapturing] = useState<string | null>(null);
  const [conflict, setConflict] = useState('');

  useEffect(() => {
    if (!capturing) return undefined;
    const onKey = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === 'Escape') {
        setCapturing(null);
        return;
      }
      const combo = comboFromEvent(event);
      if (!combo) return; // ignore bare modifier presses
      const clash = resolved.find((def) => def.combo === combo && def.id !== capturing);
      if (clash) {
        setConflict(`Already used by “${clash.label}”`);
        window.setTimeout(() => setConflict(''), 2200);
        return;
      }
      void update({ shortcuts: { ...(settings?.shortcuts ?? {}), [capturing]: combo } });
      setCapturing(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [capturing, resolved, settings?.shortcuts, update]);

  const resetAll = () => void update({ shortcuts: {} });

  return (
    <Section title="Shortcuts">
      <Row title="Keyboard shortcuts" description="App commands — click a shortcut, then press the new key combination. Editor formatting (Ctrl+B, Ctrl+I…) follows standard shortcuts." stack>
        <div className="w-full divide-y divide-[var(--line)] rounded-lg border border-[var(--line)]">
          {resolved.map((def) => (
            <div key={def.id} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-[13px] text-[var(--ink)]">{def.label}</span>
              {capturing === def.id ? (
                <span className="animate-pulse text-xs font-medium text-[var(--brand)]">Press keys… (Esc to cancel)</span>
              ) : (
                <button
                  type="button"
                  onClick={() => { setConflict(''); setCapturing(def.id); }}
                  className="pressable rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--ink)] hover:border-[var(--brand)]/50"
                  title="Change shortcut"
                >
                  {formatCombo(def.combo)}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {conflict ? <p className="text-xs text-red-500">{conflict}</p> : <span />}
          <Button size="sm" variant="ghost" onClick={resetAll}>Reset all</Button>
        </div>
      </Row>
    </Section>
  );
}

function AccountSection() {
  const { user } = useAuth();
  const sync = useSync();
  const navigate = useNavigate();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const connect = async () => {
    try {
      setConnecting(true);
      await initiateGoogleAuth();
      // Web flow navigates away to Google immediately; only the Electron flow resolves in-place.
      setConnecting(false);
    } catch (error) {
      setConnecting(false);
      alert(error instanceof Error ? error.message : 'Could not start Google sign in.');
    }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Google Drive? Notes stay on this device; nothing on Drive is deleted.')) return;
    setDisconnecting(true);
    await signOut();
    setDisconnecting(false);
    navigate('/onboarding', { replace: true });
  };

  return (
    <Section title="Account">
      <Row title="Google Drive" description="Sync notes across devices via your Google account">
        {user?.email ? (
          <Badge variant="success">Connected</Badge>
        ) : (
          <Button size="sm" onClick={connect} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect'}
          </Button>
        )}
      </Row>

      {user?.email && (
        <>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name ?? ''} className="h-10 w-10 rounded-full" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-[var(--on-brand)]">
                {user.name?.[0] || user.email[0]}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ink)]">{user.name || 'User'}</p>
              <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={disconnecting}>
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {sync.state === 'syncing' ? 'Syncing…' : sync.state === 'error' ? 'Sync error' : sync.state === 'offline' ? 'Offline' : 'Up to date'}
              </p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {sync.error
                  ? sync.error
                  : sync.lastSyncTime
                  ? `Last synced ${new Date(sync.lastSyncTime).toLocaleString()}`
                  : 'Not synced yet'}
                {sync.pendingOperations > 0 ? ` · ${sync.pendingOperations} pending` : ''}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => void runSync()} disabled={sync.state === 'syncing'}>
              {sync.state === 'syncing' ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        </>
      )}
    </Section>
  );
}

function DataSection({ onClearData }: { onClearData: () => void }) {
  const [counts, setCounts] = useState<{ notes: number; attachments: number; whiteboards: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [notes, attachments, whiteboards] = await Promise.all([
          db.notes.count(),
          db.attachmentBlobs.count(),
          db.whiteboards.count()
        ]);
        if (mounted) setCounts({ notes, attachments, whiteboards });
      } catch {
        if (mounted) setCounts({ notes: 0, attachments: 0, whiteboards: 0 });
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <Section title="Data">
      <Row title="Local storage" description={counts ? `${counts.notes} notes · ${counts.attachments} attachments · ${counts.whiteboards} whiteboards stored in this browser's database` : 'Counting…'}>
        <Badge variant="default">On this device</Badge>
      </Row>
      <Row title="Export" description="Download a copy of your notes (coming soon)">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>JSON</Button>
          <Button variant="outline" size="sm" disabled>Markdown</Button>
        </div>
      </Row>
      <Row title="Danger zone" description="Delete all notes, folders and settings on this device">
        <Button variant="danger" size="sm" onClick={onClearData}>
          Clear All Data
        </Button>
      </Row>
    </Section>
  );
}


export default SettingsPage;
