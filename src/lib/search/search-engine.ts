import MiniSearch from 'minisearch';
import { Note } from '@/types';

interface SearchableNote {
  id: string;
  title: string;
  content: string;
  tags: string;
  folderId: string | null;
}

export class SearchEngine {
  private miniSearch: MiniSearch<SearchableNote>;
  private initialized = false;

  constructor() {
    this.miniSearch = new MiniSearch<SearchableNote>({
      fields: ['title', 'content', 'tags'],
      storeFields: ['id', 'title', 'content', 'tags', 'folderId'],
      searchOptions: {
        boost: { title: 3, tags: 2, content: 1 },
        fuzzy: 0.2,
        prefix: true,
        combineWith: 'AND'
      }
    });
  }

  /**
   * Index notes for searching
   */
  indexNotes(notes: Note[]): void {
    // Clear existing index
    this.miniSearch.removeAll();

    // Convert notes to searchable format
    const searchableNotes: SearchableNote[] = notes
      .filter(note => !note.isDeleted)
      .map(note => ({
        id: note.id,
        title: note.title,
        content: note.plainTextContent,
        tags: note.tags.join(' '),
        folderId: note.folderId
      }));

    // Add to index
    this.miniSearch.addAll(searchableNotes);
    this.initialized = true;
  }

  /**
   * Add a single note to the index
   */
  addNote(note: Note): void {
    if (note.isDeleted) return;

    const searchableNote: SearchableNote = {
      id: note.id,
      title: note.title,
      content: note.plainTextContent,
      tags: note.tags.join(' '),
      folderId: note.folderId
    };

    try {
      this.miniSearch.add(searchableNote);
    } catch {
      // Note already exists, update it
      this.updateNote(note);
    }
  }

  /**
   * Update a note in the index
   */
  updateNote(note: Note): void {
    try {
      this.miniSearch.discard(note.id);
    } catch {
      // Note doesn't exist in index
    }

    if (!note.isDeleted) {
      this.addNote(note);
    }
  }

  /**
   * Remove a note from the index
   */
  removeNote(noteId: string): void {
    try {
      this.miniSearch.discard(noteId);
    } catch {
      // Note doesn't exist in index
    }
  }

  /**
   * Search notes
   */
  search(query: string, options?: { folderId?: string | null; limit?: number }): string[] {
    if (!this.initialized || !query.trim()) {
      return [];
    }

    try {
      let results = this.miniSearch.search(query, {
        ...this.miniSearch.options.searchOptions,
        filter: options?.folderId !== undefined
          ? (result) => result.folderId === options.folderId
          : undefined
      });

      if (options?.limit) {
        results = results.slice(0, options.limit);
      }

      return results.map(result => result.id);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Get search suggestions
   */
  autoSuggest(query: string, options?: { limit?: number }): string[] {
    if (!this.initialized || !query.trim()) {
      return [];
    }

    try {
      const results = this.miniSearch.autoSuggest(query, {
        ...this.miniSearch.options.searchOptions,
        boost: { title: 5, tags: 3, content: 1 }
      });

      const suggestions = results
        .map(result => result.suggestion)
        .slice(0, options?.limit || 5);

      return suggestions;
    } catch (error) {
      console.error('Auto-suggest error:', error);
      return [];
    }
  }

  /**
   * Check if search engine is ready
   */
  isReady(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const searchEngine = new SearchEngine();
