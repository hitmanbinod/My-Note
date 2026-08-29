import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ board: undefined as undefined | { id: string; title: string; previewDataUrl: string | null } }));

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.board }));
vi.mock('@/lib/db/whiteboards.repository', () => ({ whiteboardsRepository: { get: vi.fn() } }));

import WhiteboardPreview from './WhiteboardPreview';

describe('WhiteboardPreview', () => {
  it('links an available board to its editor', () => {
    mocks.board = { id: 'board-1', title: 'Launch flow', previewDataUrl: 'data:image/png;base64,preview' };
    render(<WhiteboardPreview boardId="board-1" />);

    expect(screen.getByRole('link', { name: /open launch flow/i }).getAttribute('href')).toBe('/whiteboards/board-1');
    expect(document.querySelector('img')?.getAttribute('src')).toBe(mocks.board.previewDataUrl);
  });

  it('keeps a readable placeholder when the linked board was deleted', () => {
    mocks.board = undefined;
    render(<WhiteboardPreview boardId="missing" />);

    expect(screen.getByText('Whiteboard unavailable')).toBeTruthy();
  });
});
