import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles, ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { whiteboardsRepository } from '@/lib/db/whiteboards.repository';
import {
  createPreview,
  downloadPng,
  downloadSvg,
  parseScene,
  serializeScene
} from '@/lib/whiteboards/scene';
import { EMPTY_SCENE_JSON } from '@/lib/whiteboards/constants';
import Spinner from '@/components/ui/Spinner';

type SaveStatus = 'saving' | 'saved' | 'error';

interface SceneSnapshot {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

function WhiteboardEditorPage() {
  const { whiteboardId = '' } = useParams();
  const navigate = useNavigate();
  const board = useLiveQuery(
    () => whiteboardId ? whiteboardsRepository.get(whiteboardId) : undefined,
    [whiteboardId],
    null
  );
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [exportError, setExportError] = useState('');
  const latestScene = useRef<SceneSnapshot | null>(null);
  const sceneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedBoardId = useRef('');
  const ignoredInitialChange = useRef(false);
  const userInteracted = useRef(false);
  const revision = useRef(0);
  const saveChain = useRef(Promise.resolve<unknown>(undefined));

  const parsed = useMemo(() => {
    if (!board) return null;
    try {
      return { data: parseScene(board.sceneJson), corrupt: false };
    } catch {
      return { data: parseScene(EMPTY_SCENE_JSON), corrupt: true };
    }
  }, [board]);

  useEffect(() => {
    if (!board || !parsed || loadedBoardId.current === board.id) return;
    loadedBoardId.current = board.id;
    ignoredInitialChange.current = false;
    userInteracted.current = false;
    revision.current = 0;
    setTitle(board.title);
    latestScene.current = {
      elements: parsed.data.elements || [],
      appState: parsed.data.appState || {},
      files: parsed.data.files || {}
    };
  }, [board, parsed]);

  const persistScene = useCallback(async () => {
    const scene = latestScene.current;
    if (!scene || !whiteboardId) return;
    sceneTimer.current = null;
    const savingRevision = revision.current;
    try {
      const sceneJson = serializeScene(scene.elements, scene.appState, scene.files);
      saveChain.current = saveChain.current.catch(() => undefined).then(() => whiteboardsRepository.update(whiteboardId, { sceneJson }));
      await saveChain.current;
      if (revision.current === savingRevision) setSaveStatus('saved');
    } catch {
      if (revision.current === savingRevision) setSaveStatus('error');
    }
  }, [whiteboardId]);

  const persistPreview = useCallback(async () => {
    const scene = latestScene.current;
    if (!scene || !whiteboardId) return;
    previewTimer.current = null;
    try {
      const previewDataUrl = await createPreview(scene.elements, scene.appState, scene.files);
      await whiteboardsRepository.update(whiteboardId, { previewDataUrl });
    } catch {
      // Scene saving remains independent from thumbnail generation.
    }
  }, [whiteboardId]);

  const flushPending = useCallback(() => {
    if (sceneTimer.current) {
      clearTimeout(sceneTimer.current);
      void persistScene();
    }
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      void persistPreview();
    }
  }, [persistPreview, persistScene]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) flushPending();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      flushPending();
    };
  }, [flushPending]);

  const handleChange = useCallback((
    elements: readonly ExcalidrawElement[],
    appState: AppState,
    files: BinaryFiles
  ) => {
    if (!ignoredInitialChange.current) {
      ignoredInitialChange.current = true;
      return;
    }
    if (parsed?.corrupt && !userInteracted.current) return;
    latestScene.current = { elements, appState, files };
    revision.current += 1;
    setSaveStatus('saving');
    if (sceneTimer.current) clearTimeout(sceneTimer.current);
    if (previewTimer.current) clearTimeout(previewTimer.current);
    sceneTimer.current = setTimeout(() => void persistScene(), 700);
    previewTimer.current = setTimeout(() => void persistPreview(), 1_500);
  }, [parsed?.corrupt, persistPreview, persistScene]);

  const saveTitle = async () => {
    const nextTitle = title.trim() || 'Untitled whiteboard';
    setTitle(nextTitle);
    if (board && nextTitle !== board.title) {
      try {
        await whiteboardsRepository.update(board.id, { title: nextTitle });
      } catch {
        setSaveStatus('error');
      }
    }
  };

  const runExport = async (format: 'png' | 'svg') => {
    const scene = latestScene.current;
    if (!scene || !board) return;
    try {
      setExportError('');
      const exportScene = format === 'png' ? downloadPng : downloadSvg;
      await exportScene(title, scene.elements, scene.appState, scene.files);
    } catch {
      setExportError(`Could not export ${format.toUpperCase()}.`);
    }
  };

  if (board === null) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (!board || !parsed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Whiteboard not found</h1>
        <button type="button" onClick={() => navigate('/whiteboards')} className="mt-4 text-sm font-semibold text-primary-600 hover:underline">Back to whiteboards</button>
      </div>
    );
  }

  const initialData: ExcalidrawInitialDataState = {
    ...parsed.data,
    scrollToContent: true
  };
  const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-[64px] flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2 sm:px-5">
        <button type="button" onClick={() => { flushPending(); navigate('/whiteboards'); }} className="pressable rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--panel-soft)]" aria-label="Back to whiteboards"><BackIcon /></button>
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={event => {
            if (event.key === 'Enter') event.currentTarget.blur();
          }}
          aria-label="Whiteboard title"
          className="min-w-0 flex-1 bg-transparent text-base font-semibold text-[var(--ink)] outline-none sm:max-w-md"
        />
        <span className={`text-xs font-medium ${saveStatus === 'error' ? 'text-red-600 dark:text-red-400' : 'text-[var(--muted)]'}`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Saved'}
        </span>
        <button type="button" onClick={() => void runExport('png')} className="pressable rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]">PNG</button>
        <button type="button" onClick={() => void runExport('svg')} className="pressable rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--panel-soft)]">SVG</button>
        {exportError && <span role="alert" className="w-full text-right text-xs text-red-600 dark:text-red-400">{exportError}</span>}
      </div>
      {parsed.corrupt && <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">The saved scene could not be read. A blank recoverable canvas is open.</p>}
      <div
        className="whiteboard-canvas min-h-0 flex-1 bg-white"
        onPointerDownCapture={() => { userInteracted.current = true; }}
        onKeyDownCapture={() => { userInteracted.current = true; }}
      >
        <Excalidraw
          initialData={initialData}
          onChange={handleChange}
          theme={theme}
          name={board.title}
        />
      </div>
    </div>
  );
}

const BackIcon = () => <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m15 18-6-6 6-6" /></svg>;

export default WhiteboardEditorPage;
