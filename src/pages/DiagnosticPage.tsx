import { useEffect, useState } from 'react';
import { db, isDbReady } from '@/lib/db/database';
import { AppSettings } from '@/types';

interface DiagnosticInfo {
  dbReady: boolean;
  settings: AppSettings | null | undefined;
  tablesCount: number;
  envVars: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  errors: string[];
}

function DiagnosticPage() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function runDiagnostics() {
      const errors: string[] = [];
      
      try {
        // Check DB ready
        const dbReady = isDbReady();
        
        // Check settings
        let settings = null;
        try {
          settings = await db.settings.get('singleton');
        } catch (err) {
          errors.push(`Settings fetch error: ${err}`);
        }

        // Check environment variables
        const envVars = {
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        };

        if (!envVars.clientId) {
          errors.push('VITE_GOOGLE_CLIENT_ID is not set');
        }
        if (!envVars.clientSecret) {
          errors.push('VITE_GOOGLE_CLIENT_SECRET is not set');
        }

        // Check tables
        const tablesCount = db.tables.length;

        setDiagnostics({
          dbReady,
          settings,
          tablesCount,
          envVars,
          errors,
        });
      } catch (err) {
        errors.push(`General error: ${err}`);
        setDiagnostics({
          dbReady: false,
          settings: null,
          tablesCount: 0,
          envVars: {
            clientId: undefined,
            clientSecret: undefined,
          },
          errors,
        });
      } finally {
        setLoading(false);
      }
    }

    runDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Running diagnostics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          System Diagnostics
        </h1>

        {diagnostics && (
          <div className="space-y-6">
            {/* Database Status */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Database Status
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">DB Ready:</span>
                  <span className={diagnostics.dbReady ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.dbReady ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tables Count:</span>
                  <span className="text-gray-900 dark:text-white">{diagnostics.tablesCount}</span>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Settings
              </h2>
              {diagnostics.settings ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Access Token:</span>
                    <span className="text-gray-900 dark:text-white">
                      {diagnostics.settings.googleAccessToken ? 'Present' : 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">User Email:</span>
                    <span className="text-gray-900 dark:text-white">
                      {diagnostics.settings.userEmail || 'Not set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Theme:</span>
                    <span className="text-gray-900 dark:text-white">
                      {diagnostics.settings.theme}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Onboarding Completed:</span>
                    <span className="text-gray-900 dark:text-white">
                      {diagnostics.settings.onboardingCompleted ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-red-600">No settings found</p>
              )}
            </div>

            {/* Environment Variables */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Environment Variables
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Google Client ID:</span>
                  <span className={diagnostics.envVars.clientId ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.envVars.clientId ? '✓ Set' : '✗ Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Google Client Secret:</span>
                  <span className={diagnostics.envVars.clientSecret ? 'text-green-600' : 'text-red-600'}>
                    {diagnostics.envVars.clientSecret ? '✓ Set' : '✗ Not set'}
                  </span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {diagnostics.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-4">
                  Errors
                </h2>
                <ul className="space-y-2">
                  {diagnostics.errors.map((error, index) => (
                    <li key={index} className="text-red-800 dark:text-red-200">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Actions
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Refresh Diagnostics
                </button>
                <a
                  href="/"
                  className="block w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors text-center"
                >
                  Go to Home
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiagnosticPage;
