import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { db } from '@/lib/db/database';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

function SettingsPage() {
  const { user } = useAuth();
  const { configuredTheme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'account' | 'appearance' | 'security' | 'data'>('account');
  const [showClearDataModal, setShowClearDataModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/notes"
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Notes
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
          <TabButton active={activeTab === 'account'} onClick={() => setActiveTab('account')}>
            Account
          </TabButton>
          <TabButton active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')}>
            Appearance
          </TabButton>
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')}>
            Security
          </TabButton>
          <TabButton active={activeTab === 'data'} onClick={() => setActiveTab('data')}>
            Data
          </TabButton>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {activeTab === 'account' && <AccountSection user={user} />}
          {activeTab === 'appearance' && (
            <AppearanceSection theme={configuredTheme} setTheme={setTheme} />
          )}
          {activeTab === 'security' && <SecuritySection />}
          {activeTab === 'data' && (
            <DataSection onClearData={() => setShowClearDataModal(true)} />
          )}
        </div>
      </div>

      {/* Clear Data Modal */}
      <Modal
        isOpen={showClearDataModal}
        onClose={() => setShowClearDataModal(false)}
        title="Clear Local Data"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            This will delete all notes, folders, and settings stored locally on this device. Synced
            data in Google Drive will not be affected.
          </p>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ This action cannot be undone. Make sure your notes are synced before proceeding.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowClearDataModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
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
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
        active
          ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function AccountSection({ user }: { user: any }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Google Account
        </h2>
        {user?.email ? (
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {user.photoUrl ? (
              <img src={user.photoUrl} alt={user.name} className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium text-xl">
                {user.name?.[0] || user.email[0]}
              </div>
            )}
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-white">{user.name || 'User'}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>
            <Badge variant="success">Connected</Badge>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Connect your Google account to sync notes across devices
            </p>
            <Button>Connect Google Drive</Button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">About</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Version</span>
            <span className="text-gray-900 dark:text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Build</span>
            <span className="text-gray-900 dark:text-white">Development</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection({ theme, setTheme }: any) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Theme</h2>
        <div className="space-y-2">
          <ThemeOption
            label="Light"
            description="Always use light theme"
            selected={theme === 'light'}
            onClick={() => setTheme('light')}
          />
          <ThemeOption
            label="Dark"
            description="Always use dark theme"
            selected={theme === 'dark'}
            onClick={() => setTheme('dark')}
          />
          <ThemeOption
            label="System"
            description="Match system preference"
            selected={theme === 'system'}
            onClick={() => setTheme('system')}
          />
        </div>
      </div>
    </div>
  );
}

function ThemeOption({
  label,
  description,
  selected,
  onClick
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-primary-500' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {selected && <div className="w-3 h-3 rounded-full bg-primary-500" />}
      </div>
      <div className="flex-1 text-left">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </button>
  );
}

function SecuritySection() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Encryption
        </h2>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-gray-900 dark:text-white font-medium mb-1">
                Encryption not configured
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Enable end-to-end encryption to protect your notes with a password
              </p>
              <Button size="sm">Enable Encryption</Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          App Lock
        </h2>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Require authentication to unlock the app after inactivity
          </p>
          <div className="mt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded" disabled />
              <span className="text-gray-700 dark:text-gray-300">Enable app lock</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataSection({ onClearData }: { onClearData: () => void }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Import & Export
        </h2>
        <div className="space-y-3">
          <Button variant="secondary" className="w-full">
            Export All Notes (JSON)
          </Button>
          <Button variant="secondary" className="w-full">
            Export as Markdown
          </Button>
          <Button variant="secondary" className="w-full">
            Import Notes
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Storage
        </h2>
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Local storage</span>
            <span className="text-gray-900 dark:text-white">~2.4 MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Notes</span>
            <span className="text-gray-900 dark:text-white">0</span>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
          Danger Zone
        </h2>
        <div className="border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2">
            Clear Local Data
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Delete all notes and settings stored on this device
          </p>
          <Button variant="danger" size="sm" onClick={onClearData}>
            Clear All Data
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
