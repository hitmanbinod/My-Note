# 04: Quality gates and testing

## Gates (all must pass before a commit counts as "green")

| Gate | Command | Rule |
|---|---|---|
| Lint | `npm run lint` | Zero warnings |
| Types | `npx tsc --noEmit` | Zero errors |
| Tests | `npm test` | All pass; none skipped or weakened to get green |
| Build (for Electron, packaging or build-config changes) | `npm run verify:full` | Succeeds |

`npm run verify` runs lint, types and tests. Never disable a rule, delete a test, or lower a threshold to pass a gate. If a gate is wrong, report it.

## Tests required by change type

| Change | Required test |
|---|---|
| Bug fix | A test that fails before the fix and passes after (write it first) |
| Utility / library function | Unit tests including edge cases |
| React component with logic | Testing Library test for the main behaviors |
| Custom TipTap node or mark | Round-trip serialization test plus a test with an old-format sample |
| Dexie schema / migration | Migration test from a fixture of the previous version |
| Vault / crypto | Round-trip and wrong-PIN tests; never change formats without a migration test |
| IPC handler | Input validation test where feasible |
| UI-only styling | Manual checklist below plus a note on what was seen |

## Manual checklist (UI changes)
- [ ] Light and dark themes
- [ ] Sidebar expanded and collapsed (rail)
- [ ] Window widths about 900, 1280 and 1920 px
- [ ] Keyboard only: tab order, focus ring, Esc, Enter/Space
- [ ] `prefers-reduced-motion`
- [ ] No console errors or warnings
- [ ] No layout jump, flicker or janky animation

## Manual checklist (data-affecting changes)
- [ ] Create, edit, autosave, close the app, reopen: content intact
- [ ] Protected (encrypted) note locks and unlocks
- [ ] Export then import round-trip, and import of an older backup
- [ ] Sync (if touched): no duplicates, no data loss
- [ ] Upgrade from the previous installed version keeps all data

## Evidence in the report
List each gate with its result line (for example `Tests: 41 passed`). For manual checks say what you did and saw. If you could not run the GUI, write "UI not visually verified" and list what the user should check.

## Flaky or failing tests
Never retry until green. Find the cause. If a test is wrong, fix it in its own commit and explain.

## Observed differences
- Tests: 43 tests in 12 files (paste pipeline, quote blocks, whiteboard preview/scene, repositories, sync service, NoteEditor, NoteCard, rename guard). Run with `npx vitest run` via `npm test` (run mode, not watch).
- Not covered: Electron main/preload, Google Drive network layer, Excalidraw canvas interactions, audio playback, reader-mode annotations.
- Lint is ESLint 8 with `--max-warnings 0` (zero warnings enforced). `@typescript-eslint/no-explicit-any` is enabled and the tree is currently clean of it — keep it that way.
