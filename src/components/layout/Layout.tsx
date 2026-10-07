import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSync } from '@/hooks/useSync';
import { useSettings } from '@/hooks/useSettings';
import { UiWidthsProvider } from '@/hooks/UiWidthsProvider';
import { useUiWidths } from '@/hooks/useUiWidths';
import { resolveShortcuts, combosEqual } from '@/lib/shortcuts';
import { runSync } from '@/lib/sync/sync-service';
import { runBackup } from '@/lib/backup/backup-service';
import { ContextMenu } from '@/components/ui/ContextMenu';
import { inputMenuItems } from '@/components/ui/clipboard-menu';

function Layout() {
  return (
    <UiWidthsProvider>
      <LayoutInner />
    </UiWidthsProvider>
  );
}

function LayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputMenuPos, setInputMenuPos] = useState<{ x: number; y: number } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useSync(true);
  const { settings, update } = useSettings();
  const { beginSidebarResize, resetSidebar } = useUiWidths();
  const collapsed = settings?.sidebarCollapsed === true;
  const focusMode = settings?.focusMode === true;

  // Rebindable app-level keyboard shortcuts
  useEffect(() => {
    const shortcuts = resolveShortcuts(settings?.shortcuts);
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Don't hijack typing inside inputs
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const hit = shortcuts.find((def) => combosEqual(event, def.combo));
      if (!hit) return;
      event.preventDefault();
      switch (hit.id) {
        case 'new-note': navigate('/notes/new'); break;
        case 'search': document.getElementById('global-search')?.focus(); break;
        case 'focus': void update({ focusMode: !focusMode }); break;
        case 'split': void update({ splitView: !settings?.splitView }); break;
        case 'sync': void runSync(true); break;
        case 'settings': navigate('/settings'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings?.shortcuts, settings?.splitView, focusMode, navigate, update]);

  // Close the mobile drawer when navigating
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Exit focus mode with Escape
  useEffect(() => {
    if (!focusMode) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void update({ focusMode: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode, update]);

  // Automatic backups (UpNote-style): check periodically, back up when due
  const backupFrequency = settings?.backupFrequency ?? 'off';
  const backupDir = settings?.backupDir;
  const backupMaxCount = settings?.backupMaxCount ?? 50;
  const lastBackupAt = settings?.lastBackupAt ?? 0;
  useEffect(() => {
    if (backupFrequency === 'off' || !backupDir || !window.electronAPI?.backupWrite) return undefined;
    const intervalMs = backupFrequency === 'hourly' ? 3_600_000 : backupFrequency === 'daily' ? 86_400_000 : 604_800_000;
    const tick = () => {
      if (Date.now() - lastBackupAt < intervalMs) return;
      void runBackup({ dir: backupDir, maxCount: backupMaxCount }).then((result) => {
        if (result.ok) void update({ lastBackupAt: Date.now() });
      });
    };
    void tick();
    const timer = window.setInterval(tick, 15 * 60_000);
    return () => window.clearInterval(timer);
  }, [backupFrequency, backupDir, backupMaxCount, lastBackupAt, update]);

  // One button: collapse on desktop, drawer on mobile
  const handleSidebarToggle = useCallback(() => {
    if (window.innerWidth >= 1024) {
      void update({ sidebarCollapsed: !collapsed });
    } else {
      setSidebarOpen((open) => !open);
    }
  }, [collapsed, update]);

  if (focusMode) {
    // Distraction-free: only the note area with its formatting toolbar
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--ink)]">
        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div
      className="flex h-screen flex-col overflow-hidden bg-[var(--app-bg)] text-[var(--ink)]"
      onContextMenu={(event) => {
        // Fallback clipboard menu for inputs outside the note editor (the
        // note pane handles its own richer menu and stops propagation)
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          event.preventDefault();
          setInputMenuPos({ x: event.clientX, y: event.clientY });
        }
      }}
    >
      <Header onToggleSidebar={handleSidebarToggle} sidebarCollapsed={collapsed} />
      <div className="flex min-h-0 flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={collapsed} savedWidth={settings?.sidebarWidth} />
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            data-resize="sidebar"
            onPointerDown={beginSidebarResize}
            onDoubleClick={resetSidebar}
            className="col-resize-handle hidden flex-none lg:block"
          />
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {inputMenuPos && <ContextMenu x={inputMenuPos.x} y={inputMenuPos.y} items={inputMenuItems()} onClose={() => setInputMenuPos(null)} />}
    </div>
  );
}

export default Layout;
