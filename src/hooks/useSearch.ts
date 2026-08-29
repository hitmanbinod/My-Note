import { useEffect, useState } from 'react';
import { Note } from '@/types';
import { db } from '@/lib/db/database';

export function useSearch(query: string, options?: { folderId?: string | null }) {
  const [results, setResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const performSearch = async () => {
      try {
        // Get all non-deleted notes
        const allNotes = await db.notes
          .where('isDeleted')
          .equals(0)
          .toArray() as Note[];

        const lowerQuery = query.toLowerCase();
        
        // Simple text search
        const matched = allNotes.filter(note => {
          // Apply folder filter if specified
          if (options?.folderId !== undefined && note.folderId !== options.folderId) {
            return false;
          }

          // Search in title, content, and tags
          return (
            note.title.toLowerCase().includes(lowerQuery) ||
            note.plainTextContent.toLowerCase().includes(lowerQuery) ||
            note.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
          );
        });

        // Sort by relevance (title matches first)
        matched.sort((a, b) => {
          const aTitle = a.title.toLowerCase().includes(lowerQuery);
          const bTitle = b.title.toLowerCase().includes(lowerQuery);
          
          if (aTitle && !bTitle) return -1;
          if (!aTitle && bTitle) return 1;
          
          return b.updatedAt - a.updatedAt;
        });

        setResults(matched);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [query, options?.folderId]);

  return { results, isSearching };
}

export function useSearchSuggestions(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const getSuggestions = async () => {
      try {
        const allNotes = await db.notes
          .where('isDeleted')
          .equals(0)
          .toArray() as Note[];

        // Extract unique tags that match
        const matchingTags = new Set<string>();
        const lowerQuery = query.toLowerCase();

        allNotes.forEach(note => {
          note.tags.forEach(tag => {
            if (tag.toLowerCase().includes(lowerQuery)) {
              matchingTags.add(tag);
            }
          });
        });

        setSuggestions(Array.from(matchingTags).slice(0, 5));
      } catch (error) {
        console.error('Auto-suggest failed:', error);
        setSuggestions([]);
      }
    };

    const timeout = setTimeout(getSuggestions, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  return suggestions;
}
