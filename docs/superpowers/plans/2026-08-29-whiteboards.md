# Whiteboards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline Excalidraw whiteboards, local autosave, PNG/SVG export, and live clickable board previews inside notes.

**Architecture:** Store each officially serialized Excalidraw scene in a new Dexie `whiteboards` table. Render the official React component on a dedicated route, and represent note embeds as a Tiptap atom containing only a board ID so the preview can query the current board record live.

**Tech Stack:** React 18, TypeScript, Vite, Dexie, Tiptap, `@excalidraw/excalidraw@0.18.1`, Vitest, jsdom, fake-indexeddb, React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-whiteboards-design.md`

## Global Constraints

- Offline and single-user only; no collaboration, cloud sync, sharing, or version history.
- Whiteboards remain separate records; note blocks store only `boardId`.
- Scene writes debounce at 700 ms; thumbnail writes debounce at 1,500 ms.
- Surrounding controls remain keyboard accessible and support light/dark themes.
- Preserve the user's existing uncommitted `EditorToolbar.tsx` overlap fix.
- Do not commit `.superpowers/` visual-companion artifacts.

---

### Task 1: Test Harness and Whiteboard Repository

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/types/whiteboard.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/db/database.ts`
- Create: `src/lib/db/whiteboards.repository.ts`
- Test: `src/lib/db/whiteboards.repository.test.ts`

**Interfaces:**
- Produces: `Whiteboard`, `CreateWhiteboardInput`, `UpdateWhiteboardInput`.
- Produces: `whiteboardsRepository.create/get/list/update/delete`.
- Produces: `db.whiteboards: Table<Whiteboard, string>`.

- [ ] **Step 1: Install runtime and test dependencies**

Run:

```powershell
npm install @excalidraw/excalidraw@0.18.1
npm install --save-dev vitest@1.6.1 jsdom@30.0.1 fake-indexeddb@6.2.5 @testing-library/react@16.3.3 @testing-library/dom@10.4.1
```

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add to `vite.config.ts`:

```ts
/// <reference types="vitest/config" />

test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts']
}
```

- [ ] **Step 2: Add the global test setup**

```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 3: Write the failing repository tests**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './database';
import { whiteboardsRepository } from './whiteboards.repository';

describe('whiteboardsRepository', () => {
  beforeEach(async () => {
    await db.whiteboards.clear();
  });

  it('creates, updates, lists, and deletes a whiteboard', async () => {
    const created = await whiteboardsRepository.create({ title: 'Flow' });
    expect(created.title).toBe('Flow');
    expect(created.sceneJson).toContain('"type":"excalidraw"');

    await whiteboardsRepository.update(created.id, {
      title: 'Updated flow',
      sceneJson: '{"type":"excalidraw","version":2,"elements":[],"appState":{},"files":{}}'
    });

    expect((await whiteboardsRepository.get(created.id))?.title).toBe('Updated flow');
    expect((await whiteboardsRepository.list()).map(board => board.id)).toEqual([created.id]);

    await whiteboardsRepository.delete(created.id);
    expect(await whiteboardsRepository.get(created.id)).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run the test and verify RED**

Run: `npm test -- src/lib/db/whiteboards.repository.test.ts`

Expected: FAIL because the whiteboard types, table, and repository do not exist.

- [ ] **Step 5: Add the whiteboard type and Dexie v2 schema**

Use the exact data contracts and version 2 schema from the spec. Add `whiteboards` to the `NotesDatabase` class, `clearAllData()` transaction, and storage usage result.

- [ ] **Step 6: Implement the repository minimally**

```ts
export class WhiteboardsRepository {
  async create(input: CreateWhiteboardInput = {}): Promise<Whiteboard>;
  async get(id: string): Promise<Whiteboard | undefined>;
  async list(): Promise<Whiteboard[]>;
  async update(id: string, updates: UpdateWhiteboardInput): Promise<Whiteboard | undefined>;
  async delete(id: string): Promise<void>;
}
```

New records use `generateUUID()`, `Untitled whiteboard`, and an empty Excalidraw JSON document. `list()` sorts newest `updatedAt` first.

- [ ] **Step 7: Run the repository test and full tests**

Run: `npm test -- src/lib/db/whiteboards.repository.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```powershell
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/types/whiteboard.ts src/types/index.ts src/lib/db/database.ts src/lib/db/whiteboards.repository.ts src/lib/db/whiteboards.repository.test.ts
git commit -m "feat: add whiteboard persistence"
```

---

### Task 2: Scene Serialization, Preview, and Download Helpers

**Files:**
- Create: `src/lib/whiteboards/scene.ts`
- Test: `src/lib/whiteboards/scene.test.ts`

**Interfaces:**
- Produces: `EMPTY_SCENE_JSON`.
- Produces: `parseScene(sceneJson): ExcalidrawInitialDataState`.
- Produces: `serializeScene(elements, appState, files): string`.
- Produces: `createPreview(elements, appState, files): Promise<string | null>`.
- Produces: `downloadPng(name, elements, appState, files): Promise<void>`.
- Produces: `downloadSvg(name, elements, appState, files): Promise<void>`.

- [ ] **Step 1: Write failing scene tests**

Test that an empty serialized scene parses to empty elements and files, malformed JSON throws `Invalid whiteboard scene`, and `serializeScene` returns official Excalidraw JSON containing the supplied elements.

```ts
it('rejects malformed scene data', () => {
  expect(() => parseScene('{')).toThrow('Invalid whiteboard scene');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/lib/whiteboards/scene.test.ts`

Expected: FAIL because `scene.ts` does not exist.

- [ ] **Step 3: Implement scene helpers**

Use `serializeAsJSON`, `exportToBlob`, and `exportToSvg` from `@excalidraw/excalidraw`. `parseScene` accepts only an object with `elements`, `appState`, and `files`. Downloads create an object URL, click a temporary anchor, and always revoke the URL. Filenames are normalized to `<title>.png` and `<title>.svg`.

`createPreview()` returns `null` for an empty board. Otherwise export a PNG with `exportBackground: true` and `maxWidthOrHeight: 640`, then convert the blob to a data URL with `FileReader`.

- [ ] **Step 4: Run scene and full tests**

Run: `npm test -- src/lib/whiteboards/scene.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/whiteboards/scene.ts src/lib/whiteboards/scene.test.ts
git commit -m "feat: add whiteboard scene helpers"
```

---

### Task 3: Whiteboard Routes, Navigation, and List

**Files:**
- Create: `src/pages/WhiteboardsPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `whiteboardsRepository` and `db.whiteboards`.
- Produces: `/whiteboards` and navigation into `/whiteboards/:whiteboardId`.

- [ ] **Step 1: Add `.superpowers/` to `.gitignore`**

Append exactly:

```gitignore
# Superpowers visual companion
.superpowers/
```

- [ ] **Step 2: Create the whiteboard list page**

Use `useLiveQuery(() => whiteboardsRepository.list(), [])`. The page includes:

- `Whiteboards` heading and board count.
- `New whiteboard` button that creates a board then navigates to its editor.
- Responsive cards with thumbnail, title, updated time, rename button, and delete button.
- Empty state with one create action.
- Native `confirm('Delete this whiteboard? Notes linking to it will show it as unavailable.')` before delete.

- [ ] **Step 3: Register routes**

In `App.tsx`, lazy-load the heavy editor page and add:

```tsx
<Route path="whiteboards" element={<WhiteboardsPage />} />
<Route path="whiteboards/:whiteboardId" element={<WhiteboardEditorPage />} />
```

Wrap the editor route in `Suspense` using the existing spinner.

- [ ] **Step 4: Add sidebar navigation**

Add a `New whiteboard` action beside the note action and a `Whiteboards` `NavItem` whose active state matches `/whiteboards` and `/whiteboards/*`.

- [ ] **Step 5: Verify TypeScript and build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add .gitignore src/pages/WhiteboardsPage.tsx src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat: add whiteboard workspace"
```

---

### Task 4: Full Excalidraw Editor, Autosave, and Export

**Files:**
- Create: `src/pages/WhiteboardEditorPage.tsx`
- Modify: `src/index.css`
- Test: `src/pages/WhiteboardEditorPage.test.tsx`

**Interfaces:**
- Consumes: repository and scene helpers from Tasks 1–2.
- Produces: full editor route with `Saving…`, `Saved`, and `Save failed` states.

- [ ] **Step 1: Write the failing autosave test**

Mock only the external Excalidraw component as a button that emits two successive `onChange` scenes. Use fake timers and assert that after 700 ms the repository update receives the newest serialized scene once.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/pages/WhiteboardEditorPage.test.tsx`

Expected: FAIL because the page does not exist.

- [ ] **Step 3: Implement the editor page**

Load `whiteboardId` with `useLiveQuery`. Parse the saved scene once for `initialData`. Keep the latest `(elements, appState, files)` in a ref.

On Excalidraw `onChange`:

1. Mark dirty and show `Saving…`.
2. Reset a 700 ms scene timer.
3. Reset a 1,500 ms preview timer.
4. Scene timer serializes and updates `sceneJson`.
5. Preview timer exports and updates `previewDataUrl`.
6. Successful writes show `Saved`; failures show `Save failed` without clearing the in-memory ref.

Cleanup and `visibilitychange` invoke a shared `flushPending()` function. Catch malformed scenes, show a warning, and initialize an empty canvas without writing until `onChange` fires.

Header controls rename the board and invoke `downloadPng` / `downloadSvg` with the current scene. Excalidraw receives the app theme and fills a container with non-zero height.

- [ ] **Step 4: Add minimal whiteboard layout CSS**

Add only the height rules Tailwind cannot express cleanly:

```css
.whiteboard-canvas { height: calc(100vh - 72px - 73px); min-height: 420px; }
@media (max-width: 640px) { .whiteboard-canvas { height: calc(100vh - 72px - 65px); min-height: 360px; } }
```

- [ ] **Step 5: Run targeted and full tests**

Run: `npm test -- src/pages/WhiteboardEditorPage.test.tsx`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/pages/WhiteboardEditorPage.tsx src/pages/WhiteboardEditorPage.test.tsx src/index.css
git commit -m "feat: add whiteboard editor"
```

---

### Task 5: Live Whiteboard Blocks in Notes

**Files:**
- Create: `src/components/whiteboards/WhiteboardPreview.tsx`
- Create: `src/components/whiteboards/WhiteboardPicker.tsx`
- Create: `src/lib/editor/whiteboard-preview-extension.tsx`
- Modify: `src/lib/editor/extensions.ts`
- Modify: `src/components/editor/EditorToolbar.tsx`
- Test: `src/components/whiteboards/WhiteboardPreview.test.tsx`

**Interfaces:**
- Produces: Tiptap node `{ type: 'whiteboardPreview', attrs: { boardId: string } }`.
- Produces: `EditorToolbar` insertion flow.

- [ ] **Step 1: Write failing preview tests**

Render `WhiteboardPreview` inside `MemoryRouter` with a real fake-indexeddb board record. Assert the title and thumbnail render. Delete the record and assert `Whiteboard unavailable` renders.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- src/components/whiteboards/WhiteboardPreview.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the preview component and Tiptap extension**

`WhiteboardPreview` uses `useLiveQuery(() => db.whiteboards.get(boardId), [boardId])`, renders a button card, and navigates to `/whiteboards/${boardId}`. Missing records render an unavailable card.

The node extension is block, atom, draggable, and defines only `boardId`. Render it with `ReactNodeViewRenderer(WhiteboardPreviewNodeView)`.

- [ ] **Step 4: Implement the picker**

Use the existing `Modal`. List boards newest-first with title and thumbnail. Selecting one calls `onSelect(board.id)`. The empty state includes a `Create whiteboard` link.

- [ ] **Step 5: Add toolbar insertion**

Register the extension in `getEditorExtensions()`. Add an `Insert whiteboard` icon button to `EditorToolbar`. On selection run:

```ts
editor.chain().focus().insertContent({
  type: 'whiteboardPreview',
  attrs: { boardId }
}).run();
```

Keep the user's existing non-sticky toolbar class unchanged.

- [ ] **Step 6: Run targeted and full tests**

Run: `npm test -- src/components/whiteboards/WhiteboardPreview.test.tsx`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/components/whiteboards/WhiteboardPreview.tsx src/components/whiteboards/WhiteboardPicker.tsx src/lib/editor/whiteboard-preview-extension.tsx src/lib/editor/extensions.ts src/components/editor/EditorToolbar.tsx src/components/whiteboards/WhiteboardPreview.test.tsx
git commit -m "feat: embed whiteboards in notes"
```

---

### Task 6: Verification and Finish

**Files:**
- Modify only files required by failures directly caused by this feature.

**Interfaces:**
- Verifies all success criteria from the spec.

- [ ] **Step 1: Run automated verification**

```powershell
npm test
npm run build
npx eslint src/types/whiteboard.ts src/lib/db/whiteboards.repository.ts src/lib/whiteboards/scene.ts src/pages/WhiteboardsPage.tsx src/pages/WhiteboardEditorPage.tsx src/components/whiteboards src/lib/editor/whiteboard-preview-extension.tsx src/components/editor/EditorToolbar.tsx --max-warnings 0
git diff --check
```

Expected: all commands exit 0. Run the repository-wide `npm run lint` separately and report pre-existing unrelated failures.

- [ ] **Step 2: Run browser verification**

Verify the eight browser flows from the spec at desktop and 375 px widths. Inspect console errors after each route. Confirm light/dark themes and keyboard focus.

- [ ] **Step 3: Confirm the final diff is scoped**

Run:

```powershell
git status --short
git diff --stat HEAD~5..HEAD
```

Confirm `.superpowers/` is ignored and no unrelated user files are staged.

- [ ] **Step 4: Leave no uncommitted feature fixes**

Run `git diff --quiet`. Expected: exit 0. If it fails, return to the task that owns the changed file, rerun that task's verification, and amend that task's feature commit.
