# 02: Git, commits, merging and recovery

Goal: every state of the project is saved on GitHub, every task can be undone with one command, and `main` is always releasable.

## Model
- `main` only ever receives **verified** work, through `git merge --no-ff`. Never commit directly to `main`.
- One task = one branch = (after merge) one merge commit. Reverting that merge commit undoes the whole task.
- Branch names: `feat/…`, `fix/…`, `refactor/…`, `perf/…`, `chore/…`, `docs/…`, `test/…`; lowercase, hyphenated, short.

## Commits
- Format (Conventional Commits): `type(scope): summary` where type is one of `feat fix refactor perf style docs test build ci chore revert wip`. Scope is the area (`editor`, `sidebar`, `vault`, `sync`, `theme`, `electron`, `ai`, …).
- Subject: imperative, at most 72 characters, no trailing period. Body (when useful): why, not what.
- Trailers (end of the body): `Task: <slug>` and `Assisted-by: <model name>`. If a commit changes the Dexie schema add `Schema: vN -> vM`.
- Examples: `fix(editor): remove automatic quotation marks from quote blocks` · `feat(voice-memo): add real waveform peaks` · `refactor(menu): share one menu component`.
- **When to commit:** after each completed step in the plan, when `npm run verify` is green (a "green checkpoint"). Small commits are cheap and are the unit of recovery. Never mix unrelated changes in one commit.
- **When to push:** after every commit. `git push -u origin <branch>` (first time), then `git push`. If push fails (credentials, network), do not loop; report it and continue locally.
- **`wip:` commits** are allowed only on feature branches, only when you must save unfinished work (quota ending, handoff), using `AI_WIP=1 git commit -m "wip: <what is unfinished>"`. A `wip:` commit must be followed by a green commit before the branch is merged. `wip:` commits are never pushed to `main`.
- Never commit: secrets or `.env`, installers or `release-windows/`, `node_modules`, user data, large binaries, or generated files that are in `.gitignore`.

## Tags
- `pre/<slug>`: backup before any risky task (pushed).
- `stable/YYYY-MM-DD`: a verified, known-good point after a milestone.
- `vX.Y.Z`: releases (`ai/08`).
Push tags one at a time (`git push origin <tag>`). Never delete or move a pushed tag.

## Merging (only when the user says "merge")
```
git switch main
git pull --ff-only
git merge --no-ff <branch> -m "Merge <branch>: <one-line summary>"
npm run verify            # on the merged result
git push
git tag stable/YYYY-MM-DD # only for milestones
```
If verification fails after the merge, do **not** fix forward on `main`: `git revert -m 1 <merge-commit>` (commands below), then report.

## Recovery playbook

| Situation | Command |
|---|---|
| Discard uncommitted changes to one file | `git restore <path>` |
| Discard all uncommitted changes (tracked files) | `git restore .` (never `git clean -fdx`) |
| Undo the last commit, keep the work (not pushed yet) | `git reset --soft HEAD~1` |
| Undo a commit that is already pushed | `git revert <sha>` |
| Undo a whole merged task | `git revert -m 1 <merge-sha>` |
| Undo several commits in a row | `git revert --no-commit <oldest>^..<newest>` then `git commit` |
| Get one file back from an earlier commit or tag | `git restore --source=<sha-or-tag> -- <path>` |
| Look at an old version without changing anything | `git switch --detach <tag-or-sha>` (return with `git switch -`) |
| Go back to a stable point permanently | `git switch -c fix/rollback-<date> <tag>`, verify, then merge it as a task |
| Find the commit that broke something | `git bisect start`, `git bisect bad`, `git bisect good <known-good>` |
| "I lost commits" | `git reflog` shows where HEAD was; `git switch -c rescue <sha>` |
| See what a task changed | `git log --oneline main..<branch>` and `git diff main...<branch>` |

On `main`, reverts need `ALLOW_MAIN=1 git revert ...` (the hook blocks other direct commits).

**Schema warning:** reverting code does **not** downgrade a user's database. Before reverting any commit whose message has a `Schema:` trailer, read `ai/07` and tell the user.

## Never
Force-push (the only exception is `git push --force-with-lease` on your own feature branch, with the user's approval) · rewrite history of `main` or pushed shared branches · `git reset --hard` on pushed commits · `git clean -fdx` · `--no-verify` · commit secrets (if one is committed: stop, tell the user to rotate it, do not try to hide it) · delete or move tags · rebase `main`.

## GitHub setup (human steps; the agent lists them in its report)
1. Repo Settings → Branches → add a rule for `main`: block force pushes and deletion; require the `verify` status check once CI exists; (optional) require a pull request.
2. Settings → Code security: enable secret scanning and Dependabot alerts.
3. Keep `.gitignore` covering `node_modules`, `release-windows/`, `dist/`, `.env*`.
4. Check `.gitattributes` for line-ending policy. If missing, the agent only **proposes** one in its report (changing line endings creates a large diff).

## Hooks and CI (installed by the bootstrap)
- `pre-commit`: blocks commits on `main` and runs lint and type-check (skipped only for `AI_WIP=1`).
- `commit-msg`: enforces the commit format.
- `pre-push`: before updating `main`, runs tests and rejects `wip:` commits.
- CI (`.github/workflows/ci.yml`): lint, type-check, tests, build on every push and pull request.
