# Review request (read-only review of a branch)

Branch: <name> vs main. Change no files.
Check and report by severity (Blocker / Major / Minor / Nit), with file and line:
1. Does it do what the task asked? Any missing acceptance criteria?
2. Scope: unrelated changes, formatting churn, new dependencies?
3. Data safety and security (ai/07): schema, storage keys, encryption, IPC, secrets, plaintext leaks.
4. Correctness: edge cases, race conditions, cleanup of listeners/timers/URLs, error handling.
5. Standards (ai/03) and design system (ai/06): tokens, themes, rail, accessibility.
6. Tests: do they prove the behavior? Any weakened or skipped tests?
7. Docs: PROGRESS.md, ai guides, DECISIONS, HANDOFF updated?
Finish with: Approve / Approve with changes / Do not merge, and a 3-line summary.
