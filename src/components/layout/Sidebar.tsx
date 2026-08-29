import { Link, useLocation } from 'react-router-dom';
import { useFolders } from '@/hooks/useFolders';
import { useNotes } from '@/hooks/useNotes';
import Badge from '@/components/ui/Badge';
import IconButton from '@/components/ui/IconButton';
import { useState } from 'react';
import { folderService } from '@/services/FolderService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { folders } = useFolders();
  const [showFolderForm, setShowFolderForm] = useState(false);

  // Count notes in different views
  const { notes: allNotes = [] } = useNotes({ isDeleted: false });
  const { notes: starredNotes = [] } = useNotes({ isDeleted: false, isStarred: true });
  const { notes: archivedNotes = [] } = useNotes({ isDeleted: false, isArchived: true });
  const { notes: trashedNotes = [] } = useNotes({ isDeleted: true });

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* New note button */}
        <div className="p-4">
          <Link
            to="/notes/new"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Note
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2">
          <div className="space-y-1">
            <NavLink
              to="/notes"
              icon={<NotesIcon />}
              label="All Notes"
              count={allNotes.length}
              isActive={isActive('/notes')}
              onClick={onClose}
            />
            <NavLink
              to="/notes/starred"
              icon={<StarIcon />}
              label="Starred"
              count={starredNotes.length}
              isActive={isActive('/notes/starred')}
              onClick={onClose}
            />
            <NavLink
              to="/notes/archived"
              icon={<ArchiveIcon />}
              label="Archive"
              count={archivedNotes.length}
              isActive={isActive('/notes/archived')}
              onClick={onClose}
            />
            <NavLink
              to="/notes/trash"
              icon={<TrashIcon />}
              label="Trash"
              count={trashedNotes.length}
              isActive={isActive('/notes/trash')}
              onClick={onClose}
            />
          </div>

          {/* Folders */}
          <div className="mt-6">
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Folders
              </h3>
              <IconButton
                icon={<PlusIcon />}
                label="New folder"
                onClick={() => setShowFolderForm(!showFolderForm)}
                className="!p-1"
              />
            </div>

            {showFolderForm && (
              <div className="px-3 py-2">
                <input
                  type="text"
                  placeholder="Folder name"
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  autoFocus
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                      await folderService.createFolder({ name: e.currentTarget.value.trim() });
                      setShowFolderForm(false);
                    }
                    if (e.key === 'Escape') {
                      setShowFolderForm(false);
                    }
                  }}
                  onBlur={() => setShowFolderForm(false)}
                />
              </div>
            )}

            <div className="space-y-1">
              {folders.map((folder) => (
                <NavLink
                  key={folder.id}
                  to={`/notes/folder/${folder.id}`}
                  icon={<FolderIcon color={folder.color} />}
                  label={folder.name}
                  isActive={location.pathname === `/notes/folder/${folder.id}`}
                  onClick={onClose}
                />
              ))}
              {folders.length === 0 && !showFolderForm && (
                <p className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  No folders yet
                </p>
              )}
            </div>
          </div>
        </nav>
      </aside>
    </>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

function NavLink({ to, icon, label, count, isActive, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
        ${
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
      `}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 font-medium text-sm">{label}</span>
      {count !== undefined && count > 0 && (
        <Badge variant={isActive ? 'info' : 'default'} className="text-xs">
          {count}
        </Badge>
      )}
    </Link>
  );
}

// Icons
const NotesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

const ArchiveIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const FolderIcon = ({ color }: { color?: string | null }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={color ? { color } : undefined}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export default Sidebar;
