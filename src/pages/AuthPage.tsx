import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForTokens } from '@/lib/auth/google-auth';
import Spinner from '@/components/ui/Spinner';

function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Authentication failed. Please try again.');
      setTimeout(() => navigate('/onboarding'), 3000);
      return;
    }

    if (code) {
      exchangeCodeForTokens(code)
        .then(() => {
          navigate('/notes', { replace: true });
        })
        .catch((err) => {
          console.error('Token exchange failed:', err);
          console.error('Error details:', err.message);
          setError(`Failed to complete authentication: ${err.message || 'Unknown error'}`);
          setTimeout(() => navigate('/onboarding'), 5000);
        });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Authenticating...</p>
      </div>
    </div>
  );
}

export default AuthPage;
