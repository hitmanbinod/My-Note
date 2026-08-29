import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import NotesPage from './pages/NotesPage';
import SettingsPage from './pages/SettingsPage';
import AuthPage from './pages/AuthPage';
import OnboardingPage from './pages/OnboardingPage';
import AuthTestPage from './pages/AuthTestPage';
import DiagnosticPage from './pages/DiagnosticPage';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { waitForDb } from './lib/db/database';

function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  // Wait for database to initialize
  useEffect(() => {
    waitForDb()
      .then(() => {
        console.log('✅ Database ready in App');
        setDbInitialized(true);
      })
      .catch((error) => {
        console.error('❌ Database initialization failed in App:', error);
        setDbError(error.message || 'Failed to initialize database');
      });
  }, []);

  // Apply theme to document
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Database Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{dbError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  // Show loading while database initializes or auth is loading
  if (!dbInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {!dbInitialized ? 'Initializing database...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/auth/callback" element={<AuthPage />} />
        <Route path="/auth-test" element={<AuthTestPage />} />
        <Route path="/diagnostics" element={<DiagnosticPage />} />
        <Route
          path="/onboarding"
          element={!isAuthenticated ? <OnboardingPage /> : <Navigate to="/notes" replace />}
        />
        <Route
          path="/notes/*"
          element={isAuthenticated ? <NotesPage /> : <Navigate to="/onboarding" replace />}
        />
        <Route
          path="/settings"
          element={isAuthenticated ? <SettingsPage /> : <Navigate to="/onboarding" replace />}
        />
        <Route path="/" element={<Navigate to="/notes" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
