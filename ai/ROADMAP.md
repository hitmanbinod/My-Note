# ROADMAP — the only index of planned work

Status: DONE / PARTIAL / NOT STARTED / UNKNOWN / BLOCKED / DECISION NEEDED. One row per item; details live in the guides, not here. Update in place.

| ID | Item | Status | Evidence | Guide | Notes |
|---|---|---|---|---|---|
| B1 | AI agent system exists (ai/, AGENTS.md, hooks, CI, verify scripts) | DONE | files tracked in git; `git config core.hooksPath` = `.githooks`; commits 969b821, 61ce478, e7a5a2b, 08a39e4 | ai/tasks/bootstrap.md | Applied 2026-10-07 |
| B2 | Bootstrap merged into main | DECISION NEEDED | `git merge-base --is-ancestor chore/ai-agent-system main` → NOT_MERGED; branch pushed | — | Wait for the human to say "merge" (ai/02) |
| B3 | CI green on the bootstrap branch | UNKNOWN | gh CLI not installed — `gh run list` cannot run; ci.yml tracked on the branch | — | Check on GitHub after first push of this branch (CI runs on all branches) |
| G1 | "Protect main" ruleset active | UNKNOWN | gh missing; `gh api repos/hitmanbinod/My-Note/rulesets` cannot run | ai/tasks/github-setup.md | Human check on github.com |
| G2 | Secret scanning and push protection enabled | UNKNOWN | gh missing; api call cannot run | ai/tasks/github-setup.md | Human check on github.com |
| G3 | Dependabot alerts | UNKNOWN | gh missing; api call cannot run | ai/tasks/github-setup.md | Optional (ai/tasks/github-setup.md) |
| G4 | Required CI check on main | DECISION NEEDED | Not enabled; merge workflow not decided | ai/tasks/github-setup.md §5 | Do not enable until B2 is decided |
| R1 | Version 1.1.1 released under the old name | NOT STARTED | `git tag --list "v*"` empty; package.json still 1.1.0; installer is Tipot-Setup-1.1.0.exe | — | No 1.1.1 exists; next release should be Tipot-branded (bump version) |
| N1 | Rename to Tipot (brand.json, data folder pinned, installer name, rename guard) | DONE | brand.json tracked; main.cjs calls `app.setPath('userData', …)` before other requires; artifactName `Tipot-Setup-${version}.exe`; rename-guard test passes (43/43); userData verified live = `AppData\Roaming\My Notes` | ai/tasks/rename-tipot.md | Upgrade-over-old-install test still manual (ai/08 §8.5) |
| N2 | Icon files in place (build/, public/, src/assets/brand/) | DONE | `git ls-files` shows build/icon.ico+png+1024, public/favicon.svg+32, src/assets/brand/ | ai/tasks/rename-tipot.md | brand/ folder at root restored for reference on this branch |
| U1 | Quote blocks: no quote marks, no forced italics | DONE | index.css blockquote reset (quotes: none, content: none, font-style: normal) + prose-blockquote modifiers in TiptapEditor; makeQuote strips one pair (quote.test.ts 3 tests) | ai/tasks/ui-polish.md task 1 | Verified: computed font-style normal, ::before content none |
| U2 | Voice memo player redesign and smooth playback | DONE | VoiceMemoView.tsx: peaks attr, dual-layer 48 bars with clip-path --p, rAF loop (no per-frame setState); record-time peaks via computePeaksFromBlob | ai/tasks/ui-polish.md task 2 | Verified: playback p 0.30→1.0, no bounce animation |
| U3 | Sidebar brand header (BrandMark, "Tipot" wordmark) | DONE | Sidebar.tsx: 48px row, --brand-logo tile, white BrandMark 16px, wordmark 15px/650; rail tile only | ai/tasks/ui-polish.md task 3 | Verified in dark theme |
| U4 | Menu cleanup (shared component, sweep) | DONE | ContextMenu.tsx keyboard nav + focus return + disabled/icon support; .toolbar-menu spec CSS (min 208/max 288, 32px nowrap items); labels: no trailing "…", "Add to notebook" singular | ai/tasks/ui-polish.md task 4 | Verified: grep "Add to notebooks" empty |
| D1 | PROGRESS.md matches the code and links to ai/ | DONE | Header links ai/README.md; Decisions moved to ai/DECISIONS.md; Editor/Theme/Layout rows match the code | — | Checked 2026-10-07 |
| D2 | Token names in ai/06 match src/index.css | DONE | Token map written into ai/06 "Observed differences"; every name verified by grep | — | --bg/--surface-1/--surface-2 do not exist (mapped) |
| T1 | Floated-image cursor placement and typing beside the float | NOT STARTED | Not implemented; listed in PROGRESS.md Next up | — | Editor UX |
| SYNC1 | Drive sync end-to-end test pass | NOT STARTED | No e2e test exists | — | Needs a real Drive account |
| WB1 | Empty-whiteboard auto-delete vs top-bar create behavior | DECISION NEEDED | Current: an untouched board is deleted on unmount (WhiteboardEditorPage) — conflicts with "New whiteboard" in the top bar | — | Human decides intended behavior |
| REL1 | Release next version (Tipot-branded) | NOT STARTED | package.json 1.1.0; upgrade test manual per ai/08 | ai/08-release-and-production.md | After B2 and the upgrade test |
