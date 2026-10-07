import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { noteService } from '@/services/NoteService';
import { Note, NoteFilter, NoteSortField, NoteSortOrder } from '@/types';

export function useNotes(
  filter?: NoteFilter,
  sortBy: NoteSortField = 'updatedAt',
  sortOrder: NoteSortOrder = 'desc'
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use live query to watch for changes
  const rawNotes = useLiveQuery(
    async () => {
      try {
        return await noteService.listNotes(filter, sortBy, sortOrder);
      } catch (err) {
        console.error('Error loading notes:', err);
        return [];
      }
    },
    [filter?.isDeleted, filter?.isStarred, filter?.isArchived, filter?.folderId, filter?.tag, sortBy, sortOrder],
    []
  );

  useEffect(() => {
    if (rawNotes !== undefined) {
      // The list query loads whole rows — remember them so the first open of a
      // note is a synchronous cache hit instead of a spinner.
      rawNotes.forEach(cacheNote);
      setNotes(rawNotes);
      setLoading(false);
      setError(null);
    }
  }, [rawNotes]);

  return { notes, loading, error };
}

/**
 * Session cache of recently opened notes. Warm opens (back from Settings,
 * switching between notes) read from here synchronously — no spinner frame —
 * while the live query refreshes in the background. Capped, oldest evicted.
 */
const noteCache = new Map<string, Note>();
const NOTE_CACHE_MAX = 30;

export function getCachedNote(id: string | undefined): Note | undefined {
  if (!id) return undefined;
  return noteCache.get(id);
}

function cacheNote(note: Note) {
  noteCache.delete(note.id);
  noteCache.set(note.id, note);
  if (noteCache.size > NOTE_CACHE_MAX) {
    const oldest = noteCache.keys().next().value;
    if (oldest) noteCache.delete(oldest);
  }
}

export function useNote(id: string | undefined) {
  // Seed from the cache so a previously opened note renders instantly.
  const [note, setNote] = useState<Note | null>(() => (id ? noteCache.get(id) ?? null : null));
  const [loading, setLoading] = useState(() => {
    if (!id) return false;
    return !noteCache.has(id);
  });
  const [error, setError] = useState<string | null>(null);

  const rawNote = useLiveQuery(
    async () => {
      if (!id) return undefined;

      try {
        const result = await noteService.getNote(id);
        return result || null;
      } catch (err) {
        console.error('Error loading note:', err);
        return null;
      }
    },
    [id]
  );

  useEffect(() => {
    if (!id) {
      setNote(null);
      setLoading(false);
      return;
    }

    if (rawNote !== undefined) {
      if (rawNote) cacheNote(rawNote);
      setNote(rawNote);
      setLoading(false);
      setError(null);
    }
  }, [id, rawNote]);

  return { note, loading, error };
}
