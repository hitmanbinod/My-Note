import {
  exportToBlob,
  exportToSvg,
  getNonDeletedElements,
  serializeAsJSON
} from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type {
  AppState,
  BinaryFiles,
  ExcalidrawInitialDataState
} from '@excalidraw/excalidraw/types';
export { EMPTY_SCENE_JSON } from './constants';

export function parseScene(sceneJson: string): ExcalidrawInitialDataState {
  try {
    const scene = JSON.parse(sceneJson) as Record<string, unknown>;
    if (
      !scene ||
      !Array.isArray(scene.elements) ||
      typeof scene.appState !== 'object' ||
      scene.appState === null ||
      typeof scene.files !== 'object' ||
      scene.files === null
    ) {
      throw new Error('invalid shape');
    }

    return {
      elements: scene.elements as unknown as readonly ExcalidrawElement[],
      appState: scene.appState as Partial<AppState>,
      files: scene.files as BinaryFiles
    };
  } catch {
    throw new Error('Invalid whiteboard scene');
  }
}

export function serializeScene(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles
): string {
  return serializeAsJSON(elements, appState, files, 'local');
}

export async function createPreview(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles
): Promise<string | null> {
  const visibleElements = getNonDeletedElements(elements);
  if (!visibleElements.length) return null;

  const blob = await exportToBlob({
    elements: visibleElements,
    appState: { ...appState, exportBackground: true },
    files,
    mimeType: 'image/png',
    maxWidthOrHeight: 640
  });

  return blobToDataUrl(blob);
}

export async function downloadPng(
  title: string,
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles
): Promise<void> {
  const blob = await exportToBlob({
    elements: getNonDeletedElements(elements),
    appState: { ...appState, exportBackground: true },
    files,
    mimeType: 'image/png'
  });
  downloadBlob(blob, `${safeFilename(title)}.png`);
}

export async function downloadSvg(
  title: string,
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles
): Promise<void> {
  const svg = await exportToSvg({
    elements: getNonDeletedElements(elements),
    appState,
    files
  });
  downloadBlob(new Blob([svg.outerHTML], { type: 'image/svg+xml' }), `${safeFilename(title)}.svg`);
}

function safeFilename(title: string): string {
  return title.trim().replace(/[<>:"/\\|?*]/g, '-') || 'whiteboard';
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error('Could not read whiteboard preview'));
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
