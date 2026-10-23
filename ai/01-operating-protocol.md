# 01: Operating protocol (every task, every model)

This protocol is mandatory and identical for all models. Fast models: do not skip phases because a task looks easy. Strong models: do not skip the written plan because you can hold it in your head. The written plan is what makes results consistent and reviewable.

## Task size and rigor

| Size | Definition | Required |
|---|---|---|
| **S** | 1-3 files, no risk flag, no behavior change beyond visuals/text | 3-line plan, then proceed |
| **M** | 4-10 files, or a new component/behavior, no risk flag | Written plan (template), then proceed |
| **L** | More than 10 files, or ANY risk flag from `AGENTS.md` | Written plan, then **STOP and wait for the user's approval** |

If unsure between sizes, choose the larger one.

## Phases

### 1. Intake
Restate the task in 1-3 sentences and list acceptance criteria (use the user's task card if provided). Ask at most 3 questions, only if the answer changes the plan or involves data, security or release behavior. Otherwise write your assumptions.

### 2. Recon (read-only; no edits)
- Read what `ai/README.md` says your task needs.
- `git status`; confirm a clean tree and the current branch.
- Search the code for existing implementations, patterns, tokens, tests and call sites.
- Identify the root cause for bugs: find it, don't guess. Write one or two lines.
- Output "Recon notes" (max 10 lines): files involved, existing patterns to reuse, root cause, unknowns.

### 3. Plan
Write the plan using `ai/templates/plan.md`: goal, steps (each small and verifiable, max 8), files to change, risks and rollback, tests, docs to update, out of scope. For **L** tasks stop here and wait for approval. If the user says "go", proceed exactly as planned; if you must deviate, say so first.

### 4. Branch and baseline
`git switch -c <type>/<slug>` from an up-to-date `main`. For risky work first create the backup tag: `git tag pre/<slug>` and push it. Run `npm run verify` and note the baseline. If the baseline is already red, report it and do not fix unrelated failures unless asked.

### 5. Implement in small steps
For each step in the plan: make the change → run the fastest relevant check (type-check, targeted test) → when the step is complete and `npm run verify` is green → commit and push (`ai/02`) → update `ai/HANDOFF.md` ("done", "next step"). One logical change per commit.
Rules while coding: only planned files unless you explain; follow `ai/03`; reuse tokens and components; no debug leftovers; no commented-out code; no unrelated formatting changes.

### 6. Verify
Run `npm run verify`, plus `npm run verify:full` for anything touching build, Electron or packaging. Do the manual checks in `ai/04` for your change type. Record real results.
Bug fixes: write a failing test that reproduces the bug **first**, then fix it.

### 7. Self-review the diff
Run `git diff main...HEAD` and check: only intended files changed; no unrelated edits or formatting churn; no `console.log`/debug code; no secrets; no new `any`/`@ts-ignore` without a reason; no weakened tests or lint rules; lockfile changes only if a dependency was approved; docs updated. Fix anything found before reporting.

### 8. Docs
- `PROGRESS.md`: edit in place only the facts that changed (feature status, gotchas, next up, known issues). Add one line to "Recent major changes" only for major changes (new user-visible feature, data model/IPC/storage/sync/vault change, migration or breaking change, release, large UI restructure).
- `ai/09-features/<feature>.md`: update if behavior, files or invariants changed.
- `ai/DECISIONS.md`: add an entry for any design or architecture choice.
- `ai/05-architecture.md`: update if IPC, storage keys, data model or flows changed.
- `ai/HANDOFF.md`: final state of the task.

### 9. Finish
Push the branch. Report with `ai/templates/report.md`. Merge only if the user says "merge" (`ai/02`).

## Stop rules
Stop and report (do not push through) when:
- A requirement is ambiguous in a way that affects data, security or release behavior.
- A fix fails twice (two strikes): revert your uncommitted changes with `git restore`, report the root cause.
- The working tree has changes that are not yours and not in the handoff.
- You would need to touch a risk-flagged area that the approved plan did not cover.
- Tools you need are unavailable (no GUI, no network): say what you could not verify.

## Scope discipline
Do exactly what the task says. Other problems you notice go under "Noticed, not changed" in the report; do not fix them silently. No new dependencies, no renames, no moves, no deletions of files unless the plan said so and the user approved.

## Honesty
Never write "tests pass" without running them. Quote the actual result lines. Mark anything not checked as "not verified". Do not fabricate APIs, paths, config keys or behavior; search the code or docs first.

## Time and quota
You may be cut off at any moment. Therefore: commit and push a green checkpoint after every step, and update `ai/HANDOFF.md` after every step, not only at the end.
