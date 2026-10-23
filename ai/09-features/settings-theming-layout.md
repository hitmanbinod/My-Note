# Settings Theming Layout.Md

**Purpose:** User preferences, theming (accents/page colors), and the resizable layout.

**Key files:** src/pages/SettingsPage.tsx, src/lib/theme/appearance.ts, src/hooks/useSettings.ts, useUiWidths.tsx + UiWidthsProvider.tsx, useWindowControlsInset.ts.

**Data:** settings singleton: theme, accentColor, pageColor, editorFont/Size/LineHeight, sidebarWidth, listWidth, sidebarCollapsed, splitView, focusMode, typewriterMode, shortcuts, toolbarOrder, pin/vault hashes, Drive tokens.

**How it works:**
1. Accent: applyAccent generates OKLCH ramps + --on-brand by contrast. 2. Page color: surface tokens. 3. Panes: drag writes CSS vars, commit on pointer-up, double-click resets. 4. Top bar: native window buttons overlay; the renderer reserves their area via the Window Controls Overlay API.

**Invariants / do-not-break rules:** --brand-logo is fixed #3761e1 (never accent-driven). Pane width transitions disabled while dragging.

**Edge cases and gotchas:** Theme-reactive components must use useIsDark, not classList.contains at render time.

**Tests:** None. Missing: applyAccent contrast test.

**Known issues:** None known.

**Open questions:** None.
