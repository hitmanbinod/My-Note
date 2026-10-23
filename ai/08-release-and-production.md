# 08: Release and production readiness

## Versioning
Semantic versioning in `package.json`: patch = fixes, minor = features, major = breaking or data-format changes. Only `main` is released. The working tree must be clean and `main` must equal the verified merge.

## Release checklist (agent prepares, user approves)
1. All intended branches merged; `npm run verify:full` green on `main`; CI green on GitHub.
2. `npm audit` reviewed; no known high-severity issues in shipped dependencies.
3. Bump the version; update `PROGRESS.md` (version header, recent major changes).
4. Build the installer (`npm run dist:win`). Confirm the artifact name and icon.
5. **Upgrade test** from the previous installed version: all notes, folders, images, voice memos, the protected note (same PIN), Drive sync, settings and version history intact; an older backup still imports; Settings > Apps shows one entry.
6. Fresh-install test on a clean profile.
7. Auto-update test: the release metadata (`latest.yml`) matches the installer name; an older build updates correctly.
8. Tag `vX.Y.Z` and publish with `npm run release:win` (or the project's release script) only when the user says so.
9. Write short release notes (user-visible changes only).

## Rolling back a bad release
Do not delete published assets. Mark the release as pre-release or publish a fixed patch quickly (`git revert -m 1 <merge>` on a branch, bump patch, release). Check `ai/07` before reverting anything with a `Schema:` trailer.

## Production-readiness gate (review before each minor/major release; unmet items go to PROGRESS.md "Known issues")
- [ ] Installer and executable are code-signed (otherwise Windows SmartScreen warns and update trust is weaker)
- [ ] Crash and error handling: uncaught errors are caught, logged locally without sensitive data, and shown as a friendly message; React error boundaries around the editor and large features
- [ ] Autosave survives a force-quit; data-safety backup exists (automatic local backups, tested restore)
- [ ] Performance budget: cold start, memory with large notes and about 1000+ notes, scrolling the list
- [ ] Accessibility pass: keyboard, focus, contrast, labels
- [ ] Privacy: no telemetry unless documented; backups and exports noted as plaintext
- [ ] Licenses: third-party license notices included (editor, whiteboard, other dependencies)
- [ ] Uninstall keeps user data (`deleteAppDataOnUninstall` is false)
- [ ] Documentation current: `PROGRESS.md`, `ai/` guides

## Observed differences
- Scripts (real names): renderer build `npm run build` (tsc + vite) · desktop dev run `npm run desktop` (build + electron .) · packaging `npm run dist:win` (electron-builder --win --x64) · release `npm run release:win` (--publish always). Output to `release-windows/`.
- Artifact: `Tipot-Setup-<version>.exe` (NSIS, one-click, per-user, `deleteAppDataOnUninstall: false`).
- Signing: none — Windows SmartScreen will warn on new releases.
- Publish: GitHub Releases via electron-builder (`publish.provider: github`), repo `hitmanbinod/My-Note`; electron-updater checks Releases on launch and every 6 hours, downloads silently, installs on close.
- Version currently 1.1.0; user data survives upgrades because the data folder is pinned to the legacy `My Notes` folder (see `ai/07`).
