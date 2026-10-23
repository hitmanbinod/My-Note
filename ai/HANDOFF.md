# Handoff (the current task only; overwrite, don't append)

Updated: 2026-10-07 by GLM (ZCode)
Task: Bootstrap the ai/ agent system (guide: "Tipot AI Agent System: Bootstrap")
Branch: chore/ai-agent-system   Last commit: see `git log --oneline -1`   Pushed: yes/no (check)
Size / risk flags: L (docs + tooling; no src/electron changes allowed)
Plan: see the bootstrap guide section 2
Done:
- Phase 0: preflight run; legacy work committed as `feat(editor): polish quote blocks, voice memo player and shared menus`; tag `pre/ai-agent-system` pushed; branch `chore/ai-agent-system` created
- Phase 1: AGENTS.md replaced (old rules merged into "Working notes"), ai/README.md, ai/01-04, ai/06-08 (with Observed differences), templates, DECISIONS.md, HANDOFF.md
Next step:
- Phase 2: create `.githooks/*`, `.github/workflows/ci.yml`, add `verify`/`verify:full`/`prepare` scripts, run the hook test, commit `build(tooling): add git hooks, CI workflow and verify scripts`
Open questions / blockers:
- None
Gotchas learned:
- User data folder is pinned to legacy "My Notes" (brand.json); NEVER remove the pin
- Lint is --max-warnings 0; the tree is currently warning-free
- Tests: 43 in 12 files; `npm test` is run-mode
State of gates: lint clean · tsc clean · tests 43/43
