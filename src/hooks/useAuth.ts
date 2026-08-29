import { useState, useEffect } from 'react';
import { db } from '@/lib/db/database';
import { useLiveQuery } from 'dexie-react-hooks';

export function useAuth() {
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (settings !== undefined) {
      setIsLoading(false);
    }
  }, [settings]);

  // User is authenticated if they have a Google token OR if onboarding is completed (offline mode)
  const isAuthenticated = Boolean(
    settings?.googleAccessToken || settings?.onboardingCompleted
  );

  return {
    isAuthenticated,
    isLoading,
    user: settings
      ? {
          email: settings.userEmail,
          name: settings.userName,
          photoUrl: settings.userPhotoUrl
        }
      : null
  };
}
