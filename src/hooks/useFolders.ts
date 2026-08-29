import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, waitForDb } from '@/lib/db/database';
import { Folder } from '@/types';

export function useFolders() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    waitForDb().then(() => setDbReady(true)).catch(console.error);
  }, []);

  const folders = useLiveQuery(
    async () => {
      if (!dbReady) return [];
      try {
        return await db.folders.orderBy('name').toArray();
      } catch (err) {
        console.error('Error loading folders:', err);
        return [];
      }
    },
    [dbReady],
    []
  ) as Folder[];

  const loading = folders === undefined;

  return { folders: folders || [], loading };
}

export function useFolder(id: string | undefined) {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    waitForDb().then(() => setDbReady(true)).catch(console.error);
  }, []);

  const folder = useLiveQuery(
    async () => {
      if (!dbReady || !id) return undefined;
      try {
        return await db.folders.get(id);
      } catch (err) {
        console.error('Error loading folder:', err);
        return undefined;
      }
    },
    [id, dbReady]
  ) as Folder | undefined;

  const loading = id !== undefined && folder === undefined;

  return { folder, loading };
}
