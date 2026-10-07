# Rules for AI agents and contributors

Tipot: Windows Electron + React + TipTap + Dexie. Read PROGRESS.md (sections 1-4, then what your task needs).

## Working

- Small, targeted edits. No rewrites, renames or data-model changes unless the task says so.
- Search the code first; reuse existing components, hooks and tokens.
- Colors/spacing/radii from CSS tokens. No hard-coded hex.
- UI changes: check light + dark, expanded + rail sidebar, prefers-reduced-motion.
- Dexie schema change = additive `version(n).stores(...)` block in `src/lib/db/database.ts` + test.
- Never log or store decrypted content, PINs or keys.
- Unclear? Leave `// TODO(area):` and report it. Don't invent features.

## Done means

1. `npm run lint`, `npx tsc --noEmit`, `npm test` pass.
2. You ran the app and checked the change.
3. PROGRESS.md is current (below).

## Keeping PROGRESS.md current

PROGRESS.md describes how the project is NOW. Edit it in place with small edits; never rewrite the file.
- If your change alters any fact in it (feature state, stack, folder map, data model, IPC channel, storage key,
  layout rule, command, release step, gotcha, decision), replace that line. Do not leave the old fact and do
  not write "was X, now Y".
- Update "Next up" (remove finished, add follow-ups) and "Known issues" (add found, remove fixed).
- Add a line to "Recent major changes" ONLY for: a new user-visible feature, a change to data model / IPC /
  storage keys / sync / vault, a migration or breaking change, a release, or a large UI restructure. Max 5
  lines: delete the oldest first. Format: `YYYY-MM-DD · what changed · Verified: <what you ran/checked>`.
- Bug fixes and tweaks are not logged. Just correct any fact they changed.
- Anything you did not confirm in code is tagged UNVERIFIED. Update the "Updated:" date at the top.
- Keep the file under about 300 lines: shorten wording, don't delete useful facts.

## Final reply (5 lines max)

Files changed · Verified · Skipped/TODOs · PROGRESS.md sections edited · Next suggested task
