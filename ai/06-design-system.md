# 06: Design system (UI/UX rules)

Style: minimal, calm, professional (UpNote-like). The code is the source of truth for token names (`src/index.css`, `src/lib/theme/appearance.ts`); reconcile names under "Observed differences".

## Tokens (concepts)
- Surfaces: app background, panel, soft panel/raised, hover/menu; borders `--line`, `--line-strong`.
- Text: `--ink`, secondary (`--muted`), tertiary for placeholders only.
- Accent: `--brand`, `--brand-soft`, `--brand-text`, `--on-brand` (readable text on a solid brand fill, computed from contrast).
- Mark palette `--mark-*` for highlights, tints, quote colors.
- Never hard-code colors. Exception: the fixed brand-logo blue `#3761e1`, which does not follow the accent.

## Accent budget
`--brand` may appear only on: the one solid primary button, the active nav item (`--brand-soft` + `--brand-text`), the selected list row, focus rings, and links/toggles/checkboxes/starred state. Not on logos (fixed brand blue), titles, or decorative icons. One solid accent element per region.

## Layout
- Top bar 48px with the native window buttons overlaid (drag region except controls).
- Sidebar: default about 260px, resizable, collapses to an icon rail; nav items 32px high, icons 18px.
- Notes list: default 320px, min 260, max 480. Editor reading column max 720px. Title, tags and body share one left edge.
- Panes resize via CSS variables (no re-render), double-click the divider resets, widths persist.

## Typography
Chrome sizes 11 / 12 / 13 / 14 / 15 px; weights 500 and 600; tabular numbers for dates, counts and times. Editor font size and line height are user settings.

## Components
- **Primary action:** one solid button per region. Others are ghost or outline.
- **Menus and popovers:** `min-width 208px, max 288px`, items 32px, icon box 16px, single-line labels (no wrapping), sentence case, no trailing "…", shortcut hints right-aligned, destructive item last in red below a divider, max 3 groups, flip/shift to stay on screen, Esc and outside click close, focus returns to the trigger, arrow-key navigation, 120ms fade, no animation under reduced motion. One shared component for all menus.
- **Embeds (images, whiteboards, voice memos):** nothing visible at rest except the content; hover/selection reveals a ·· options button and a corner resize grip; options live in one menu.
- **Quote block:** left bar and tinted background only. Never insert or display quotation marks. Text is upright (no italic unless the user applies it).
- **Voice memo:** one pill (max 380px), 32px play button, waveform of equal-width bars drawn in two identical layers (played and unplayed differ only in color), time in tabular numbers, progress from a `requestAnimationFrame` loop writing a CSS variable; the only animation is the color sweep.
- **Lists/rows:** compact (about 64px), selected = soft tint plus 2px left edge with normal-colored title, no empty placeholder text.
- **Dialogs:** only for decisions that need input. Destructive actions prefer an undo toast; permanent deletes need confirmation.
- **Empty states:** one icon, one line, one hint (shortcut), no extra buttons that duplicate global actions.
- **Brand header:** 48px row, 24px solid-blue tile with the white stacked-stones mark, "Tipot" wordmark 15px/650; rail shows the tile only.

## Motion and accessibility
120-180ms ease; disable under `prefers-reduced-motion`. Text contrast at least 4.5:1 (including text on solid brand fills). Visible focus ring everywhere. Targets at least 28px. Do not convey state by color alone.

## UI change checklist
Tokens only · both themes · rail and expanded · keyboard · reduced motion · no duplicate controls for the same action · no box inside a box · no more than one solid accent element in the region.

## Token map (older guides → this codebase)

Older design guides (UI cleanup, whiteboards spec) used token names that do not exist here. Verified by grep against src/index.css (2026-10-07):

| Old name | Real token |
|---|---|
| --bg | --app-bg |
| --surface-1 | --panel |
| --surface-2 | --panel-soft (hover) |
| --surface-3 | --surface-3 (exists) |
| --ink-2 | --ink-2 (exists; --muted aliases it) |
| --ink-3 | --ink-3 (exists; placeholders/tertiary) |
| --ink / --muted / --line / --line-strong / --brand / --brand-soft / --brand-text / --on-brand / --mark-* | same names (exist) |


## Observed differences
- Actual token names: `--app-bg` (app background), `--panel`, `--panel-soft`, `--surface-3`, `--line`, `--line-strong`, `--ink`, `--ink-2`, `--muted` (secondary; used everywhere as the quiet text color), `--brand`, `--brand-soft`, `--brand-text`, `--on-brand`, `--brand-logo` (fixed #3761e1), `--mark-red|orange|yellow|green|blue|pink|purple|gray`. There is no separate tertiary token; placeholders use `--muted` with opacity.
- Accents are OKLCH ramps generated at runtime by `applyAccent` (`--p-50…900`, `--brand`, `--brand-strong`); the primary Tailwind ramp is `rgb(var(--p-N) / <alpha>)` (`primary-50…900`).
- Menus: the shared component is `src/components/ui/ContextMenu.tsx` (portal, keyboard nav) plus the `.toolbar-menu` CSS block that all inline dropdowns and the editor toolbar reuse.
- Panes: `useUiWidths.tsx` + `UiWidthsProvider.tsx` write `--sidebar-w` / `--list-w` on `<html>` during drag and commit to settings on pointer-up.
