import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  missing: false,
  board: { id: 'board-1', title: 'Flow', previewDataUrl: null },
  note: {
    id: 'note-1',
    title: 'Plan',
    content: { type: 'doc', content: [{ type: 'whiteboardPreview', attrs: { boardId: 'board-1' } }] },
    tags: [],
    updatedAt: 1,
    isDeleted: false,
    isPinned: false,
    isStarred: false
  }
}));

vi.mock('@/hooks/useNotes', () => ({ useNote: () => ({ note: mocks.missing ? null : mocks.note, loading: false }) }));
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.board }));
vi.mock('@/lib/db/whiteboards.repository', () => ({ whiteboardsRepository: { get: vi.fn(), list: vi.fn() } }));
vi.mock('@/services/NoteService', () => ({
  noteService: {
    updateNote: vi.fn(),
    createNote: vi.fn(),
    deleteNote: vi.fn(),
    toggleStar: vi.fn(),
    togglePin: vi.fn(),
    restoreNote: vi.fn(),
    permanentlyDeleteNote: vi.fn()
  }
}));

import NoteEditor from './NoteEditor';

describe('NoteEditor', () => {
  it('mounts the rich-text editor with the loaded note content', async () => {
    render(
      <MemoryRouter initialEntries={['/notes/note-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/notes/:noteId" element={<NoteEditor />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: 'Open Flow' })).toBeTruthy();
  });

  it('shows the not-found state instead of loading forever', async () => {
    mocks.missing = true;
    render(
      <MemoryRouter initialEntries={['/notes/missing']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/notes/:noteId" element={<NoteEditor />} /></Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Note not found' })).toBeTruthy();
    mocks.missing = false;
  });
});
