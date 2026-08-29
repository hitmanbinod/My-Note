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
      setNotes(rawNotes);
      setLoading(false);
      setError(null);
    }
  }, [rawNotes]);

  return { notes, loading, error };
}

export function useNote(id: string | undefined) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
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
      setNote(rawNote);
      setLoading(false);
      setError(null);
    }
  }, [id, rawNote]);

  return { note, loading, error };
}
