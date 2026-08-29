import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, waitForDb } from '@/lib/db/database';
import { Note, NoteFilter, NoteSortField, NoteSortOrder } from '@/types';
import { noteService } from '@/services/NoteService';

export function useNotes(
  filter?: NoteFilter,
  sortBy: NoteSortField = 'updatedAt',
  sortOrder: NoteSortOrder = 'desc'
) {
  const filterKey = JSON.stringify(filter || {});
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);

  // Wait for database initialization
  useEffect(() => {
    waitForDb().then(() => setDbReady(true)).catch(console.error);
  }, []);

  // Use Dexie's live query for reactivity - only after DB is ready
  const rawNotes = useLiveQuery(
    async () => {
      if (!dbReady) return [];
      
      try {
        return await db.notes.toCollection().toArray();
      } catch (err) {
        console.error('Error in useLiveQuery:', err);
        return [];
      }
    },
    [dbReady],
    []
  );

  // Process notes through service (handles encryption)
  useEffect(() => {
    const processNotes = async () => {
      if (!rawNotes) return;

      try {
        setLoading(true);
        setError(null);
        
        const processed = await noteService.listNotes(JSON.parse(filterKey) as NoteFilter, sortBy, sortOrder);
        setNotes(processed);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes');
        setNotes([]);
      } finally {
        setLoading(false);
      }
    };

    processNotes();
  }, [rawNotes, filterKey, sortBy, sortOrder]);

  return { notes, loading, error };
}

export function useNote(id: string | undefined) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Watch for changes to the note
  const rawNote = useLiveQuery(
    () => (id ? db.notes.get(id) : undefined),
    [id]
  );

  useEffect(() => {
    const loadNote = async () => {
      if (!id) {
        setNote(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const loaded = await noteService.getNote(id);
        setNote(loaded || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load note');
        setNote(null);
      } finally {
        setLoading(false);
      }
    };

    loadNote();
  }, [id, rawNote]);

  return { note, loading, error };
}
