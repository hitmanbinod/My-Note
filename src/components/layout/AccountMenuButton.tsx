import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSync } from '@/hooks/useSync';
import { signOut } from '@/lib/auth/google-auth';
import { SyncInfo } from '@/types/sync';

/** Avatar + account popover. Lives in the sidebar footer (guide Task 4). */
export function AccountMenuButton({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  const sync = useSync();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const isDriveConnected = Boolean(user?.email);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      setMenuOpen(false);
      navigate('/onboarding', { replace: true });
    } catch {
      setLoggingOut(false);
      alert('Could not log out. Please try again.');
    }
  };

  return (
    <div className="relative flex-none">
      <button onClick={() => setMenuOpen(!menuOpen)} className="pressable flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] text-xs font-bold text-[var(--ink)]" aria-label="Open account menu">{user?.name?.[0] || user?.email?.[0] || 'M'}</button>
      {menuOpen && <><button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close account menu" /><div className="app-panel absolute right-0 top-full z-20 mt-1.5 w-56 rounded-lg p-1 text-sm shadow-lg shadow-black/5">
        <div className="px-3 py-2.5"><p className="truncate font-medium">{user?.name || 'Local workspace'}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{user?.email || 'Stored on this device'}</p></div>
        {isDriveConnected && <><SyncStateRow sync={sync} /><div className="my-1 border-t border-[var(--line)]" /></>}
        <Link to="/settings" onClick={() => { setMenuOpen(false); onNavigate?.(); }} className="pressable flex items-center gap-2.5 rounded-md px-3 py-1.5 hover:bg-[var(--panel-soft)]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></svg>Settings</Link>
        <div className="my-1 border-t border-[var(--line)]" />
        <button onClick={handleLogout} disabled={loggingOut} className="pressable flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4m4-3 4-4-4-4m4 4H9" /></svg>{loggingOut ? 'Logging out…' : 'Log out'}</button>
      </div></>}
    </div>
  );
}

function SyncStateRow({ sync }: { sync: SyncInfo }) {
  const label: Record<SyncInfo['state'], string> = {
    idle: 'Synced to Drive', syncing: 'Syncing…', offline: 'Offline', error: 'Sync error', paused: 'Sync paused'
  };
  const dot: Record<SyncInfo['state'], string> = {
    idle: 'bg-emerald-500', syncing: 'bg-primary-500 animate-pulse', offline: 'bg-amber-500', error: 'bg-red-500', paused: 'bg-[var(--muted)]'
  };
  return (
    <div className="flex items-center justify-between px-3 py-2 text-xs text-[var(--muted)]">
      <span className="flex items-center gap-2"><span className={`h-1.5 w-1.5 rounded-full ${dot[sync.state]}`} />{label[sync.state]}</span>
      {sync.lastSyncTime && <span className="tabular-nums">{new Date(sync.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
    </div>
  );
}
