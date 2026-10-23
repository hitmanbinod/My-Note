# Auto Update.Md

**Purpose:** Automatic updates via GitHub Releases.

**Key files:** electron/main.cjs (setupAutoUpdate), electron/preload.cjs, src/pages/SettingsPage.tsx (update section).

**Data:** GitHub Releases feed (publish config in package.json); status events app:update:status.

**How it works:**
1. Check on launch + every 6h (packaged only). 2. Download silently. 3. Install on close (or "Restart" button).

**Invariants / do-not-break rules:** Never update in dev (app.isPackaged gate). Installer name must match latest.yml.

**Edge cases and gotchas:** Unsigned builds trigger SmartScreen; update trust is weaker.

**Tests:** None (network). Not covered by design.

**Known issues:** None known.

**Open questions:** None.
