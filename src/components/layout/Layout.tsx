import { ReactNode, useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout({ children }: { children?: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--app-bg)] lg:flex">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1 lg:pl-[272px]">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-h-[calc(100vh-72px)] px-4 py-5 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
export default Layout;
