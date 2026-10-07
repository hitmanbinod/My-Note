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
    // Interval ticks are quiet-aware: runSync skips Drive entirely when
    // nothing is queued and the last pull is recent, so an idle workspace
    // never shows "Syncing…" out of nowhere.
    const interval = setInterval(() => void runSync(), SYNC_INTERVAL_MS);
    const onOnline = () => void runSync(true);
    window.addEventListener('online', onOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [drive]);

  return info;
}
