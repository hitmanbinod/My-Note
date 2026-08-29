import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { initiateGoogleAuth, signOut, getValidAccessToken } from '@/lib/auth/google-auth';
import Button from '@/components/ui/Button';

/**
 * Test page for OAuth authentication
 * Access at: http://localhost:5173/auth-test
 */
function AuthTestPage() {
  const { isAuthenticated, user } = useAuth();
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await initiateGoogleAuth();
    } catch (error) {
      setTestResult(`❌ Sign in failed: ${error}`);
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      setTestResult('✅ Signed out successfully');
      setIsLoading(false);
    } catch (error) {
      setTestResult(`❌ Sign out failed: ${error}`);
      setIsLoading(false);
    }
  };

  const handleTestToken = async () => {
    try {
      setIsLoading(true);
      const token = await getValidAccessToken();
      setTestResult(`✅ Token obtained: ${token.substring(0, 20)}...`);
      setIsLoading(false);
    } catch (error) {
      setTestResult(`❌ Token test failed: ${error}`);
      setIsLoading(false);
    }
  };

  const handleTestAPI = async () => {
    try {
      setIsLoading(true);
      const token = await getValidAccessToken();
      
      // Test Drive API - list files
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?pageSize=10',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      setTestResult(`✅ Drive API working! Found ${data.files?.length || 0} files`);
      setIsLoading(false);
    } catch (error) {
      setTestResult(`❌ API test failed: ${error}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            OAuth Authentication Test
          </h1>

          {/* Status */}
          <div className="mb-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Status
            </h2>
            <div className="space-y-1 text-sm">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Authenticated:</strong>{' '}
                <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {isAuthenticated ? '✅ Yes' : '❌ No'}
                </span>
              </p>
              {user && (
                <>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Email:</strong> {user.email}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Name:</strong> {user.name}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-mono whitespace-pre-wrap">
                {testResult}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {!isAuthenticated ? (
              <Button
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Loading...' : '🔐 Sign In with Google'}
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleTestToken}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? 'Testing...' : '🔑 Test Access Token'}
                </Button>

                <Button
                  onClick={handleTestAPI}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? 'Testing...' : '☁️ Test Drive API'}
                </Button>

                <Button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? 'Signing out...' : '🚪 Sign Out'}
                </Button>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              📋 Setup Instructions
            </h3>
            <ol className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-decimal list-inside">
              <li>Create Google Cloud Project</li>
              <li>Enable Google Drive API and People API</li>
              <li>Configure OAuth consent screen</li>
              <li>Create OAuth client ID (Web application)</li>
              <li>Add redirect URI: http://localhost:5173/auth/callback</li>
              <li>Copy Client ID to .env file</li>
              <li>Restart dev server</li>
            </ol>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-2">
              See <strong>OAUTH_SETUP_GUIDE.md</strong> for detailed instructions.
            </p>
          </div>

          {/* Configuration Check */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">
              Configuration Status
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono">
              Client ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Missing'}
            </p>
            {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <p className="text-xs text-gray-600 dark:text-gray-400 font-mono mt-1 break-all">
                {import.meta.env.VITE_GOOGLE_CLIENT_ID}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthTestPage;
