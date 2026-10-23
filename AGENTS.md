# AGENTS.md: Universal rules for every AI model working on Tipot

Tipot is a private, local-first notes and whiteboard app for Windows (Electron, React, TypeScript, TipTap, Dexie). The standard is production quality. These rules apply identically to every model and every tool. If a rule seems inconvenient, follow it anyway and mention it in your report.

## Start every session (in this order)
1. Read this file, then `ai/HANDOFF.md` (current state), then `PROGRESS.md` sections 1-4.
2. Read `ai/README.md` to see which other guides your task needs, and read those.
3. Run `git status` and `git log --oneline -5`. Confirm the branch and that the tree is clean (or that any dirty files are yours, per HANDOFF.md).

## The 10 non-negotiables
1. **Plan before code.** Edit no file until you have written Intake, Recon and Plan (`ai/01`). Small tasks: a 3-line plan. Large or risky tasks: stop after the plan and wait for the user's "go".
2. **One task, one branch.** Never work on `main`. Branch: `feat|fix|refactor|chore|docs|test|perf/<short-slug>`.
3. **Small steps, green checkpoints.** After each completed step run `npm run verify`, then commit and push the branch. Never commit a broken state (only `wip:` commits may be red, see `ai/02`).
4. **Never claim what you didn't run.** Report real results for lint, type-check and tests. Write "not verified" for anything you could not check (for example UI you could not see).
5. **Do only what was asked.** No drive-by refactors, reformatting, renames or dependency changes. List other findings under "Noticed, not changed".
6. **Protect user data.** No change to DB names or schema, storage keys, encryption inputs, user-data paths, backup format or Drive lookup without a risk-flagged plan and the user's approval (`ai/07`).
7. **Reuse before create.** Search the code for existing components, hooks, tokens and utilities, and follow existing patterns (`ai/03`, `ai/06`).
8. **Two strikes.** If a fix fails twice, stop, revert your uncommitted changes, and report the root cause. Do not stack workarounds.
9. **Everything reversible.** Backup tag before risky work, small commits, merge with `--no-ff` (`ai/02`). Never force-push, rewrite shared history, or use `--no-verify`.
10. **Leave the project understandable.** Update `PROGRESS.md` (in place), `ai/DECISIONS.md`, the relevant `ai/09-features` guide, and `ai/HANDOFF.md` as `ai/01` says. A task without its docs update is not done.

## Working notes (carried over from the previous rules)
- Small, targeted edits; search the code before writing anything new. If something is unclear, leave `// TODO(area):` and report it — do not invent features.
- UI changes must be checked in light **and** dark themes, in expanded **and** collapsed (rail) sidebar, and with `prefers-reduced-motion` (`ai/06` checklist).
- Never log or store decrypted note content, PINs, keys or tokens (`ai/07`).

## Risk flags: plan, then STOP for approval
Dexie schema or migration · encryption, vault, PIN · IPC channels or preload API · Drive sync · installer, updater, appId, user-data path · deleting or moving user data · adding or upgrading dependencies · export/import format · security settings · more than 10 files · anything irreversible.

## Merge policy
Default: finish on the feature branch, push it, report. Merge to `main` only when the user says "merge". Then: gates green on the merged result, `git merge --no-ff`, push, tag if it is a milestone.

## Honesty and uncertainty
Do not invent file paths, APIs or behavior: search first. If you are unsure, ask one specific question or state your assumption in the plan. Never guess about data, security or release behavior.

## Final report
Use `ai/templates/report.md`. Maximum 20 lines.

## Index
`ai/README.md` lists every guide and when to read it.
