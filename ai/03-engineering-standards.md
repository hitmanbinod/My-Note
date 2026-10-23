# 03: Engineering standards

Where the code already does something consistently, follow the code. If it differs from this file, note it under "Observed differences" at the end; do not change code to match this file unless a task says so.

## TypeScript
- Strict mode. No `any`; use `unknown` and narrow. No `@ts-ignore`/`@ts-expect-error` without a one-line reason and a TODO.
- Exported functions have explicit parameter and return types. Prefer `type` unions over enums. No non-null `!` where a guard is easy.

## React
- Function components and hooks only. Respect the rules of hooks. Derive state instead of duplicating it; keep state as local as possible.
- No `setState` per animation frame or per `timeupdate`/pointer move: write to refs or CSS variables from `requestAnimationFrame` instead.
- Memoize only when measured. Effects clean up listeners, timers, object URLs and observers.
- A component file exports components only (fast-refresh rule). Split constants/helpers into their own files. Keep files under about 300 lines; split by responsibility.
- Accessible by default: real `<button>`s, labels, `aria-*` for custom widgets, visible focus, keyboard support.

## Styling
- Tokens only (`ai/06`); no hard-coded colors, radii or shadows in components. Tailwind utilities plus the project's CSS variables. Both themes and both sidebar modes must work.

## State and data
- All persistence goes through the repositories in `src/lib/db/`; components never touch Dexie directly.
- Multi-table writes use a transaction. Schema changes are additive, versioned, migrated and tested (`ai/07`).
- Async code handles cancellation and races (ignore stale results). Never swallow errors silently: surface them to the user (toast/dialog) or log without sensitive data.

## Electron
- `contextIsolation: true`, `nodeIntegration: false`. The renderer talks only through the preload API.
- Every IPC handler validates its input and its sender. Keep the API surface minimal and typed.
- Open external links only for `http(s)` through the shell with a validated URL. Restrict navigation and new windows.

## TipTap / editor
- Extensions live in `src/lib/editor/`. Node and mark attributes are additive and optional with defaults, and must serialize and parse (`parseHTML`/`renderHTML`) so old notes still load.
- Every custom node has a round-trip test (JSON/HTML → editor → JSON/HTML).
- Pasted content is sanitized by the paste pipeline; never inject raw HTML.

## Performance
- Virtualize long lists. Use `requestAnimationFrame` for drags and animations. Avoid layout thrash. Avoid loading large media into the DOM eagerly.

## Code hygiene
- Names say what things are. Comments explain *why*, not *what*. No commented-out code, no dead code, no debug logging. No magic numbers: name constants.
- Dependencies: none added without approval (risk flag). Prefer the platform and existing libraries. Pinned versions; check the license.
- Don't reformat files you aren't changing. Match the existing style (ESLint/Prettier decide).

## Observed differences
- Reads go through `useLiveQuery` (dexie-react-hooks) in hooks such as `useNotes`/`useNote`, so components observe Dexie indirectly; writes go through `noteService`/repositories. Treat hooks as the read path, repositories as the write path.
- Strict mode is on (`tsconfig.json`); `noUncheckedIndexedAccess` is also on, so indexed access needs guards or `!`.
- A few justified non-null `!` uses exist (indexed access in hot paths); new code prefers guards.
- The editor renders through plain `EditorContent` with custom React node views (`ResizableImageView`, `QuoteNodeView`, `VoiceMemoView`), not a virtualized list — long-note virtualization is a known gap.
