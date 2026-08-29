import { useEffect, useState } from 'react';
import { useNotes } from './useNotes';
import { searchEngine } from '@/lib/search/search-engine';
import { Note } from '@/types';

export function useSearch(query: string, options?: { folderId?: string | null }) {
  const { notes: allNotes } = useNotes({ isDeleted: false });
  const [results, setResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Index notes when they change
  useEffect(() => {
    if (allNotes.length > 0) {
      searchEngine.indexNotes(allNotes);
    }
  }, [allNotes]);

  // Perform search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);

    const performSearch = async () => {
      try {
        // Get matching note IDs from search engine
        const matchingIds = searchEngine.search(query, options);

        // Get full note objects
        const matchedNotes = allNotes.filter(note => matchingIds.includes(note.id));

        // Sort by relevance (order returned by search engine)
        const sorted = matchingIds
          .map(id => matchedNotes.find(note => note.id === id))
          .filter((note): note is Note => note !== undefined);

        setResults(sorted);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search slightly
    const timeout = setTimeout(performSearch, 100);
    return () => clearTimeout(timeout);
  }, [query, allNotes, options]);

  return { results, isSearching };
}

export function useSearchSuggestions(query: string) {
  const { notes: allNotes } = useNotes({ isDeleted: false });
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Index notes when they change
  useEffect(() => {
    if (allNotes.length > 0) {
      searchEngine.indexNotes(allNotes);
    }
  }, [allNotes]);

  // Get suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const results = searchEngine.autoSuggest(query, { limit: 5 });
      setSuggestions(results);
    } catch (error) {
      console.error('Auto-suggest failed:', error);
      setSuggestions([]);
    }
  }, [query]);

  return suggestions;
}
