import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const excalidraw = vi.hoisted(() => ({
  exportToBlob: vi.fn(),
  exportToSvg: vi.fn(),
  getNonDeletedElements: vi.fn((elements: readonly { isDeleted?: boolean }[]) =>
    elements.filter(element => !element.isDeleted)
  ),
  serializeAsJSON: vi.fn(
    (elements: readonly unknown[], appState: unknown, files: unknown) =>
      JSON.stringify({ type: 'excalidraw', version: 2, elements, appState, files })
  )
}));

vi.mock('@excalidraw/excalidraw', () => excalidraw);

import {
  EMPTY_SCENE_JSON,
  createPreview,
  downloadPng,
  downloadSvg,
  parseScene,
  serializeScene
} from './scene';

const elements = [
  { id: 'shape', type: 'rectangle', isDeleted: false }
] as unknown as readonly ExcalidrawElement[];

describe('whiteboard scene helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    excalidraw.exportToBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    excalidraw.exportToSvg.mockResolvedValue(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:whiteboard')
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('parses an empty Excalidraw scene', () => {
    const scene = parseScene(EMPTY_SCENE_JSON);

    expect(scene.elements).toEqual([]);
    expect(scene.files).toEqual({});
  });

  it('rejects malformed scene data', () => {
    expect(() => parseScene('{')).toThrow('Invalid whiteboard scene');
  });

  it('serializes current scene values', () => {
    serializeScene(elements, { viewBackgroundColor: '#fff' }, {});

    expect(excalidraw.serializeAsJSON).toHaveBeenCalledWith(
      elements,
      { viewBackgroundColor: '#fff' },
      {},
      'local'
    );
  });

  it('returns no preview for an empty scene', async () => {
    await expect(createPreview([], {}, {})).resolves.toBeNull();
    expect(excalidraw.exportToBlob).not.toHaveBeenCalled();
  });

  it('exports a non-empty preview as a data URL', async () => {
    const preview = await createPreview(elements, {}, {});

    expect(preview).toMatch(/^data:image\/png;base64,/);
    expect(excalidraw.exportToBlob).toHaveBeenCalledWith(
      expect.objectContaining({ elements, maxWidthOrHeight: 640 })
    );
  });

  it('downloads the current scene as PNG', async () => {
    await downloadPng('Flow / map', elements, {}, {});

    expect(excalidraw.exportToBlob).toHaveBeenCalledWith(
      expect.objectContaining({ elements, mimeType: 'image/png' })
    );
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:whiteboard');
  });

  it('downloads the current scene as SVG', async () => {
    await downloadSvg('Flow', elements, {}, {});

    expect(excalidraw.exportToSvg).toHaveBeenCalledWith(
      expect.objectContaining({ elements })
    );
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  });
});
