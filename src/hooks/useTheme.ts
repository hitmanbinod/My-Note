import { useEffect, useState } from 'react';
import { db } from '@/lib/db/database';
import { Theme } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export function useTheme() {
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (!settings) return undefined;

    const theme = settings.theme;

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveTheme(prefersDark ? 'dark' : 'light');

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        setEffectiveTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      setEffectiveTheme(theme);
      return undefined;
    }
  }, [settings]);

  const setTheme = async (theme: Theme) => {
    await db.settings.update('singleton', { theme });
  };

  return {
    theme: effectiveTheme,
    configuredTheme: settings?.theme || 'system',
    setTheme
  };
}
