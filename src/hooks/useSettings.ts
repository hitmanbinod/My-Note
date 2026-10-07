import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/database';
import { AppSettings, UpdateSettingsInput } from '@/types/settings';

/**
 * Live access to app settings plus a patch helper. Fields added in later versions
 * may be missing from stored settings rows — consumers must default with ??.
 */
export function useSettings(): { settings: Partial<AppSettings> | undefined; update: (patch: UpdateSettingsInput) => Promise<void> } {
  const settings = useLiveQuery(
    async () => {
      try {
        return await db.settings.get('singleton');
      } catch {
        return undefined;
      }
    },
    [],
    undefined
  );

  const update = useCallback(async (patch: UpdateSettingsInput) => {
    await db.settings.update('singleton', patch as Partial<AppSettings>);
  }, []);

  return { settings, update };
}
