import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWindowControlsInset } from '@/hooks/useWindowControlsInset';
import { useSettings } from '@/hooks/useSettings';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';
import { AccountMenuButton } from '@/components/layout/AccountMenuButton';
import SearchBar from './SearchBar';

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
}

/**
 * Merged 48px top bar: the empty strip is a window-drag region; the native
 * window buttons overlay its right edge on Windows. Create / settings /
 * account live at the top right.
 */
function Header({ onToggleSidebar, sidebarCollapsed }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Precise, DPI-proof reservation for the native window buttons
  const controlsInset = useWindowControlsInset();
  const { settings, update } = useSettings();

  // Keep the folder context when creating from inside a notebook, and force a
  // fresh editor (with a reset stamp) when a blank one is already open.
  const newNotePath = () => {
    const folder = location.pathname.match(/^\/notes\/folder\/([^/]+)/);
    if (folder) return `/notes/folder/${folder[1]}/new`;
    return '/notes/new';
  };

  const onNewNote = () => {
    const target = newNotePath();
    if (location.pathname === target) navigate(target, { state: { fresh: Date.now() }, replace: true });
    else navigate(target);
  };

  const createWhiteboard = async () => {
    try {
      const board = await whiteboardsRepository.create();
      navigate(`/whiteboards/${board.id}`);
    } catch {
      navigate('/whiteboards');
    }
  };

  return (
    <header style={{ paddingRight: controlsInset || undefined }} className="app-drag flex h-12 flex-none items-center border-b border-[var(--line)] bg-[var(--app-bg)] px-3 sm:px-4">
      <div className="topbar-inner flex items-center gap-1.5">
        {/* Sidebar collapse (desktop) / drawer (mobile) */}
        <button onClick={onToggleSidebar} className={`pressable flex h-8 w-8 items-center justify-center rounded-md ${sidebarCollapsed ? 'text-[var(--ink)]' : 'text-[var(--muted)]'} hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]`} aria-label="Toggle sidebar" title="Toggle sidebar">
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.8" d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>

        {/* Back / forward history navigation */}
        <button onClick={() => navigate(-1)} className="pressable hidden h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] sm:flex" aria-label="Back" title="Back">
          <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="m14.5 5.5-6.5 6.5 6.5 6.5" /></svg>
        </button>
        <button onClick={() => navigate(1)} className="pressable hidden h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] sm:flex" aria-label="Forward" title="Forward">
          <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="m9.5 5.5 6.5 6.5-6.5 6.5" /></svg>
        </button>

        <div className="mx-2 flex min-w-0 flex-1 justify-start">
          <SearchBar />
        </div>

        {/* Create + view actions (top right) */}
        <button onClick={onNewNote} className="pressable flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="New note" title="New note (Ctrl N)">
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth="1.9" d="M12 5v14M5 12h14" /></svg>
        </button>
        <button onClick={() => void createWhiteboard()} className="pressable hidden h-8 w-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)] sm:flex" aria-label="New whiteboard" title="New whiteboard">
          <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M4.5 4.5h15v15h-15zM8 15l3-4 2 2 3-4" /></svg>
        </button>

        {/* Split view toggle */}
        <button
          onClick={() => void update({ splitView: !settings?.splitView })}
          className={`pressable hidden h-8 w-8 items-center justify-center rounded-md lg:flex ${settings?.splitView ? 'bg-[var(--brand-soft)] text-[var(--brand)]' : 'text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]'}`}
          aria-label="View two notes side by side"
          title="Split view"
        >
          <SplitGlyph />
        </button>

        <span className="mx-1 h-5 w-px flex-none bg-[var(--line)]" aria-hidden />

        {/* Settings + account */}
        <Link to="/settings" className="pressable flex h-8 w-8 flex-none items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--ink)]" aria-label="Settings" title="Settings">
          <GearGlyph />
        </Link>
        <AccountMenuButton />
      </div>
    </header>
  );
}

const SplitGlyph = () => (
  <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
    <path d="M12 4.5v15" />
  </svg>
);

const GearGlyph = () => (
  <svg className="h-[17px] w-[17px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5ZM19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1H3v-4h.08A1.7 1.7 0 0 0 4.6 8.97a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.03 4.2l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.08V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" /></svg>
);

export default Header;
