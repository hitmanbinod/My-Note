import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import DiagnosticPage from './pages/DiagnosticPage';
import AuthTestPage from './pages/AuthTestPage';
import Layout from './components/layout/Layout';
import { waitForDb, getDbError } from './lib/db/database';
import { db } from './lib/db/database';
import { useLiveQuery } from 'dexie-react-hooks';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Wait for database
  useEffect(() => {
    let mounted = true;

    const initDb = async () => {
      try {
        console.log('App: Waiting for database...');
        await waitForDb();
        
        if (mounted) {
          console.log('App: Database ready!');
          setDbReady(true);
        }
      } catch (error) {
        console.error('App: Database error:', error);
        if (mounted) {
          const err = getDbError();
          setDbError(err?.message || 'Failed to initialize database');
        }
      }
    };

    initDb();

    return () => {
      mounted = false;
    };
  }, []);

  // Get settings for auth check
  const settings = useLiveQuery(
    async () => {
      if (!dbReady) return undefined;
      try {
        const data = await db.settings.get('singleton');
        return data || undefined;
      } catch (error) {
        console.error('Failed to get settings:', error);
        return undefined;
      }
    },
    [dbReady],
    undefined
  );

  // Apply theme
  useEffect(() => {
    if (!settings) return;

    const applyTheme = () => {
      if (settings.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      } else {
        setTheme(settings.theme);
      }
    };

    applyTheme();

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    
    return undefined;
  }, [settings]);

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Show database error
  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-red-600 dark:text-red-400 mb-4 text-center">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Database Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-center text-sm">
            {dbError}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => {
                indexedDB.deleteDatabase('NotesDB');
                setTimeout(() => window.location.reload(), 100);
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Clear Database &amp; Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading while database initializes
  if (!dbReady || settings === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!dbReady ? 'Initializing database...' : 'Loading settings...'}
          </p>
        </div>
      </div>
    );
  }

  const isAuthenticated = Boolean(
    settings?.googleAccessToken || settings?.onboardingCompleted
  );

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/auth/callback" element={<AuthPage />} />
        <Route path="/auth-test" element={<AuthTestPage />} />
        <Route path="/diagnostics" element={<DiagnosticPage />} />
        <Route
          path="/onboarding"
          element={!isAuthenticated ? <OnboardingPage /> : <Navigate to="/notes" replace />}
        />

        {/* Protected routes with shared Layout */}
        <Route
          path="/"
          element={isAuthenticated ? <Layout /> : <Navigate to="/onboarding" replace />}
        >
          <Route index element={<Navigate to="/notes" replace />} />
          <Route path="notes/*" element={<NotesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/notes' : '/onboarding'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
