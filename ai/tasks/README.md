# ai/tasks/ — task guides and their status

Guides written outside the repo are stored here once applied. Each file documents a task that was (or will be) executed by an AI agent.

| File | Task | Status | Owner | Size | Risk flags |
|---|---|---|---|---|---|
| `bootstrap.md` | AI agent system (ai/, AGENTS.md, hooks, CI, verify scripts) | APPLIED 2026-10-07 — **not merged to main** (DECISION NEEDED) | zcode | L | none (docs/tooling only) |
| `rename-tipot.md` | Rename to Tipot + cairn-layers icon | APPLIED 2026-10-07 (installer Tipot-Setup-1.1.0.exe); upgrade test outstanding | zcode | L | user-data path, packaging (handled) |
| `ui-polish.md` | Quote blocks, voice memo player, brand header, menus | APPLIED 2026-10-07 | zcode | L | none (visuals only) |
| `github-setup.md` | **MISSING** — never delivered. Needed for G1–G4 (protect main, secret scanning, Dependabot, required check) | NOT STARTED | human + agent | S | GitHub settings (human-only writes) |

## Execution order (from the reconciliation pass)

1. Bootstrap merged and CI green → needs the human's "merge" for B2
2. GitHub protection set (human, per github-setup.md) → G1–G3
3. Rename to Tipot → done (N1, N2 DONE); upgrade test outstanding
4. UI polish: quote blocks, voice memo, brand header, menus → done (U1–U4 DONE)
5. Upgrade test, then release the next version (Tipot-branded)

## Notes

- The `brand/` folder at the project root holds the original icon files delivered with rename-tipot.md (kept for reference; the applied copies live in `build/`, `public/` and `src/assets/brand/`).
- Older design guides elsewhere in the repo (for example `docs/superpowers/specs/`) predate the token system — see the token map in `ai/06-design-system.md` under "Observed differences".
