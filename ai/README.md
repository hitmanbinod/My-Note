# ai/: Index and how to work with AI models on Tipot

## Reading order
Always: `AGENTS.md` → `ai/HANDOFF.md` → `PROGRESS.md` (sections 1-4) → `ai/01-operating-protocol.md`.
Then, by task type:

| Task type | Also read |
|---|---|
| Any code change | `ai/03-engineering-standards.md`, `ai/04-quality-gates-and-testing.md` |
| Git, branches, undoing things | `ai/02-git-and-recovery.md` |
| UI / UX / styling | `ai/06-design-system.md` |
| Data, Dexie, vault/PIN, IPC, sync, backup, secrets | `ai/07-security-privacy-data.md`, `ai/05-architecture.md` |
| Releasing, installer, updater | `ai/08-release-and-production.md` |
| A specific feature | `ai/09-features/<feature>.md` |
| Why something is the way it is | `ai/DECISIONS.md` |

## Documentation hierarchy
- `PROGRESS.md`: living state (what exists, what's next, known issues, recent major changes).
- `ai/` guides: stable rules and deep reference.
- `ai/DECISIONS.md`: the reasons behind choices.
- `ai/HANDOFF.md`: the current task only.
One fact, one place. Link, don't copy.

## For the human: how to start any session (paste one of these)

**New task:**
> Follow AGENTS.md and ai/01-operating-protocol.md. Start with Intake, Recon and Plan, and do not edit files until the plan is written. Task card: [paste a card from ai/templates/task-card.md]

**Continue after a model or quota switch:**
> Follow AGENTS.md. Read ai/HANDOFF.md, run git status and git log -5, tell me in 5 lines where the work stands, re-run `npm run verify`, then continue from "Next step" in the handoff.

**Review another model's work (read-only):**
> Follow AGENTS.md. Review branch <name> against main using ai/templates/review-request.md. Change no files.

## Model-switch protocol (for the agent)
When you take over mid-task: read the handoff, check `git status`/`git log`, confirm the branch matches the handoff, run `npm run verify` to learn the true state, and only then continue. If the handoff and the repo disagree, trust the repo and say so.

## Keeping this folder healthy
Docs describe the present. Edit in place; do not append history. Anything unconfirmed is tagged `UNVERIFIED`. When a guide would exceed about 250 lines, split it.
