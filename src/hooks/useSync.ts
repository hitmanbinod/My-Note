import { useEffect, useState } from 'react';
import { runSync, subscribeSyncInfo, getSyncInfo } from '@/lib/sync/sync-service';
import { SyncInfo } from '@/types/sync';

const SYNC_INTERVAL_MS = 60_000;

/** Subscribes to sync state; the first mount also drives the sync engine (interval + online/offline triggers). */
export function useSync(drive = false): SyncInfo {
  const [info, setInfo] = useState<SyncInfo>(getSyncInfo());

  useEffect(() => subscribeSyncInfo(setInfo), []);

  useEffect(() => {
    if (!drive) return;

    runSync();
    const interval = setInterval(runSync, SYNC_INTERVAL_MS);
    const onOnline = () => runSync();
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [drive]);

  return info;
}
