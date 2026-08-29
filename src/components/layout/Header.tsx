import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth/google-auth';
import SearchBar from './SearchBar';

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-[var(--line)] bg-[color:var(--panel)]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <button onClick={onMenuClick} className="pressable -ml-1 rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--panel-soft)] lg:hidden" aria-label="Open navigation"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="M4 7h16M4 12h16M4 17h16" /></svg></button>
      <SearchBar />
      <div className="ml-auto flex items-center gap-2">
        <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Offline ready</span>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 ring-1 ring-primary-200 dark:bg-primary-900/40 dark:text-primary-200 dark:ring-primary-800" aria-label="Open account menu">{user?.name?.[0] || user?.email?.[0] || 'M'}</button>
          {menuOpen && <><button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close account menu" /><div className="app-panel absolute right-0 z-20 mt-2 w-56 origin-top-right rounded-xl p-1.5 text-sm"><div className="px-3 py-2.5"><p className="font-semibold text-[var(--ink)]">{user?.name || 'Local workspace'}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{user?.email || 'Stored on this device'}</p></div><Link to="/settings" onClick={() => setMenuOpen(false)} className="pressable flex items-center gap-2 rounded-lg px-3 py-2 text-[var(--ink)] hover:bg-[var(--panel-soft)]"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></svg>Settings</Link><div className="my-1 border-t border-[var(--line)]" /><button onClick={handleLogout} disabled={loggingOut} className="pressable flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4m4-3 4-4-4-4m4 4H9" /></svg>{loggingOut ? 'Logging out…' : 'Log out'}</button></div></>}
        </div>
      </div>
    </header>
  );
}
export default Header;
