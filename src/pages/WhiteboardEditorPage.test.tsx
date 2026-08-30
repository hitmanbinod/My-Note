import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  board: {
    id: 'board-1',
    title: 'Flow',
    sceneJson: '{"elements":[],"appState":{},"files":{}}',
    previewDataUrl: null,
    createdAt: 1,
    updatedAt: 1
  },
  update: vi.fn(),
  parseScene: vi.fn(),
  serializeScene: vi.fn((elements: readonly { id: string }[]) => elements[elements.length - 1]?.id || 'empty')
}));

vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => mocks.board }));
vi.mock('@/lib/db/whiteboards.repository', () => ({
  whiteboardsRepository: { update: mocks.update }
}));
vi.mock('@/lib/whiteboards/scene', () => ({
  createPreview: vi.fn().mockResolvedValue('data:image/png;base64,preview'),
  downloadPng: vi.fn(),
  downloadSvg: vi.fn(),
  parseScene: mocks.parseScene,
  serializeScene: mocks.serializeScene
}));
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: ({ onChange }: { onChange: (elements: readonly { id: string }[], appState: object, files: object) => void }) => (
    <>
      <button type="button" onClick={() => onChange([], {}, {})}>Initialize</button>
      <button type="button" onClick={() => {
          onChange([{ id: 'scene-1' }], {}, {});
          onChange([{ id: 'scene-2' }], {}, {});
        }}>Draw</button>
    </>
  )
}));

import WhiteboardEditorPage from './WhiteboardEditorPage';

describe('WhiteboardEditorPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.update.mockReset().mockResolvedValue(mocks.board);
    mocks.parseScene.mockReset().mockImplementation((sceneJson: string) => {
      if (sceneJson === 'corrupt') throw new Error('bad scene');
      return { elements: [], appState: {}, files: {} };
    });
    mocks.board.sceneJson = '{"elements":[],"appState":{},"files":{}}';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('autosaves only the newest rapid scene change', async () => {
    render(
      <MemoryRouter
        initialEntries={['/whiteboards/board-1']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/whiteboards/:whiteboardId" element={<WhiteboardEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Initialize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Draw' }));
    mocks.board = { ...mocks.board, sceneJson: 'saved-old', updatedAt: 2 };
    fireEvent.change(screen.getByRole('textbox', { name: 'Whiteboard title' }), { target: { value: 'Flow map' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(700);
    });

    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.update).toHaveBeenCalledWith('board-1', { sceneJson: 'scene-2' });
  });

  it('does not overwrite a corrupt scene during Excalidraw initialization', async () => {
    mocks.board = { ...mocks.board, sceneJson: 'corrupt', updatedAt: 3 };
    render(
      <MemoryRouter initialEntries={['/whiteboards/board-1']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/whiteboards/:whiteboardId" element={<WhiteboardEditorPage />} /></Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Initialize' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });

    expect(mocks.update).not.toHaveBeenCalled();
  });
});
