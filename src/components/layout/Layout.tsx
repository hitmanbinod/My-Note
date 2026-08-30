import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSync } from '@/hooks/useSync';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  useSync(true);

  // Close sidebar on desktop when navigating
  useEffect(() => {
    if (window.innerWidth >= 1024) { // lg breakpoint
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--app-bg)] text-[var(--ink)]">
      {/* Sidebar is fixed at 272px on desktop; reserve that space so the header and content never sit under it */}
      <div className="flex h-full min-h-0 flex-col lg:pl-[272px]">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </div>
  );
}

export default Layout;
