# Tipot UI Polish: Quote Blocks, Voice Memo Player, Brand Header, Menus (for zcode / GLM)

Paste this whole file to the coding agent. These four items have been requested before and not fixed correctly, so this guide gives **exact target visuals, the likely root causes, and acceptance tests**. Do them in order. Read `AGENTS.md` and `PROGRESS.md` (sections 1-4, 5, 6) first.

> STATUS: APPLIED 2026-10-07 (all four tasks). Kept for reference and acceptance testing.

## 0. Ground rules

1. **Find the root cause before editing.** For each task, do the "Investigate" step and write down what you found (one or two lines) before changing code. Do not guess and do not stack new CSS on top of the old problem.
2. **Remove the cause; don't hide it.** If an old animation, style or plugin creates the problem, delete or fix it instead of adding an override on top (the one exception is the CSS reset in Task 1, which is the correct fix).
3. Small, targeted edits. No new dependencies. No renames. Keep every existing behavior and handler working. Only visuals change, unless a task says otherwise.
4. Colors, spacing, radii and shadows come from CSS tokens (`--app-bg`, `--panel`, `--panel-soft`, `--surface-3`, `--line`, `--line-strong`, `--ink`, `--muted`, `--brand`, `--brand-soft`, `--on-brand`, `--mark-*`). No new hard-coded hex values, except the fixed brand-logo blue in Task 3.
5. Check every change in **light and dark themes** and in **expanded and collapsed (rail) sidebar**, and with `prefers-reduced-motion`.
6. Finish with `npm run lint` (zero warnings), `npx tsc --noEmit`, `npm test`, and look at the running app. Say plainly in the report what you saw and what you could not verify.
7. When done, update `PROGRESS.md` in place as `AGENTS.md` describes (feature rows, gotchas, one line in Recent major changes). Fix the existing Editor and Layout rows rather than adding duplicates.

---

## 1. Quote blocks: no quotation marks, no forced italics

### What the user wants
A quote block is already indicated by its **left bar and tinted background**. So:
- The app must **never display or insert quotation marks** around quoted text, whether the user typed text into a quote block or turned existing text into one.
- Quoted text is **normal upright text** by default. Italic only appears if the user applies italic themselves.

Current result (wrong): quoted text shows as `“text”` in italics.

### Investigate (do this first)
The most likely cause is **not** the data. Quote marks and italics probably come from CSS: `@tailwindcss/typography` (the `prose` classes) styles `blockquote` with `font-style: italic` and adds `content: open-quote` / `close-quote` on `blockquote p::before` and `::after`.

1. Run the app, put text in a quote block, open DevTools, and inspect the quote's `<p>`:
   - In Computed styles, is `font-style` `italic`? Which rule sets it?
   - Check the `::before` and `::after` pseudo-elements. Do they have `content: open-quote` or `“`?
   - In the DOM, does the text node itself contain the characters `“` `”` `"`? (This tells you whether it's CSS or real text.)
2. Search the code for: `prose`, `blockquote`, `open-quote`, `quotes:`, `italic`, `makeQuote`, `bgColor`, and the quote node view `QuoteNodeView`. Look in `src/index.css`, `TiptapEditor`, `NoteEditor`, `ReaderView`, and `src/lib/editor/quote.ts`.
3. Write down the cause(s) you found. There may be more than one (CSS marks, CSS italic, and/or inserted characters).

### Fix

**A. CSS (if the marks or italics are CSS):** add this to `src/index.css`, scoped to the editor and reader content, and make sure it is not overridden later in the file:

```css
.ProseMirror blockquote,
.reader-content blockquote {            /* use the real reader container class */
  font-style: normal;
  font-weight: inherit;
  quotes: none;
}
.ProseMirror blockquote p,
.reader-content blockquote p { font-style: normal; margin: 0; }
.ProseMirror blockquote p::before,
.ProseMirror blockquote p::after,
.reader-content blockquote p::before,
.reader-content blockquote p::after { content: none !important; }
```

If the editor uses Tailwind `prose` classes, also add `prose-blockquote:font-normal prose-blockquote:not-italic` on the same container, or remove the typography styling for blockquote there. Remove any old `font-style: italic` rule on `blockquote` / the quote node view.

**B. Data (if real quotation characters are inserted):** find where they are added (paste handler, slash command, toolbar "quote" button, `makeQuote`, a keyboard rule, the node view) and stop adding them. The existing behavior that **strips one wrapping pair of quotes when text is converted into a quote** stays. Never add characters.

**C. Don't rewrite saved notes.** Do not run a migration that edits existing note content. Old notes that already contain typed quote characters keep them; the CSS fix hides only the automatic ones.

**D. Exports:** check that Markdown export gives `> text` (no quote characters added) and that HTML export has no italic/quote styling for blockquotes.

### Look (target)
```
┃  Quoted text sits here, upright, same size as the body.
```
Left bar plus tint only. Default (no color chosen): bar `--line-strong`, tint `--panel-soft`. A chosen color uses the existing `--mark-*` palette for bar and tint. Padding about 12px 16px, text `--ink`, the ·· menu only on hover. The block's left edge aligns with the paragraph text above and below it.

### Acceptance
- [x] Type in a quote block: no quote marks appear, text is upright.
- [x] Convert an existing paragraph to a quote (toolbar and slash menu): no marks added, no italic.
- [x] Paste text that already has `“…”` around it into a quote: the one wrapping pair is stripped (existing behavior).
- [x] Pressing Ctrl+I inside a quote italicizes it normally.
- [x] Same in reader mode, light and dark.
- [x] Unit test: converting text with `makeQuote` never adds quote characters (added `src/lib/editor/quote.test.ts`).

---

## 2. Voice memo player: clean design and smooth playback

### Problems in the current player
1. **Double container:** an outer card plus an inner bordered pill. Pick one.
2. **Inconsistent waveform:** played bars are thin and unplayed bars are wide and uneven, so the waveform changes shape as it plays. Stray vertical lines also appear (extra playhead/marker elements).
3. **Heavy play button:** large blue circle with a drop shadow.
4. **Bad playback effect:** the waveform visibly jumps or animates as it plays.
5. Layout: too wide, with empty space, and indented differently from the text.

### Investigate (do this first)
Find the `voiceMemo` node and its view (search `voiceMemo`, `VoiceMemo`, `waveform`, `timeupdate`, `keyframes`, `animation`, `scaleY`). Write down:
- Is the waveform **real audio data** or random/fake bars? Where are the bar widths and heights set?
- Is there a CSS animation (bounce/pulse/scale) on the bars or button while playing?
- Does playback progress call `setState` on every `timeupdate` (which re-renders every bar)?
- Why are played bars a different width than unplayed ones (two different render paths)?
- What is the source of `audio.duration`? Memos recorded with `MediaRecorder` (webm) often report `duration === Infinity`, which breaks progress.

### Design (target)

```
┌──────────────────────────────────────────────┐
│  (▶)  ▂▃▅▇▅▃▂▃▆▇▅▃▂▁▂▄▆▅▃▂▃▅▃▂▁▂▃▅▂▁   0:12   │   44px high, one pill
└──────────────────────────────────────────────┘
```

| Element | Spec |
|---|---|
| Container | **One** pill: height 44px, `max-width: 380px`, width 100% of the text column up to that, radius 22px, `background: var(--panel-soft)`, `border: 1px solid var(--line)`, padding `6px 14px 6px 6px`, no shadow, no outer card |
| Play/pause button | 32px circle, `background: var(--brand)`, icon `var(--on-brand)` 14px, **no shadow**, no scale/pulse animation; icon swaps with a 120ms crossfade |
| Waveform | Height 24px, fills the space between button and time. **Fixed number of bars** (about 48), all the same width (2px, `max-width: 3px`) and gap (2px), rounded ends, centered vertically, min bar height 3px, max 22px |
| Played vs unplayed | **Two identical layers** of bars stacked (same markup, same geometry). The top layer is colored `var(--brand)` and clipped by progress; the bottom layer is `color-mix(in oklch, var(--ink) 22%, transparent)`. Colors are the only difference between played and unplayed. |
| Playback effect | The **only** animation is the color sweep left to right (progress). No bouncing bars, no scaling, no glow, no extra playhead line. |
| Time | 12px, tabular numbers, `var(--muted)`; shows total duration when idle, elapsed time while playing (turns `var(--ink)`), min-width 34px, right-aligned |
| Hover | A ·· button fades in at the right only on hover (only if the memo already has actions such as delete/download/transcript; do not add new features). Uses the shared menu from Task 4. |
| Alignment | The pill's left edge aligns with the paragraph text column |

### Implementation requirements

**Progress without re-rendering.** Update visuals from a `requestAnimationFrame` loop that writes a CSS variable, not React state:

```tsx
// inside the player component
const fillRef = useRef<HTMLDivElement>(null)
const timeRef = useRef<HTMLSpanElement>(null)
const raf = useRef(0)

const total = () => duration || (Number.isFinite(audio.duration) ? audio.duration : 0)

const tick = () => {
  const t = audio.currentTime
  const p = total() ? Math.min(1, t / total()) : 0
  fillRef.current?.style.setProperty('--p', String(p))
  if (timeRef.current) timeRef.current.textContent = fmt(t)
  raf.current = requestAnimationFrame(tick)
}
// start the loop on 'play', cancel it on 'pause' / 'ended' / unmount; on 'ended' reset --p to 0 and the icon to play.
```

```css
.vm-wave { position: relative; flex: 1; height: 24px; }
.vm-wave__layer { position: absolute; inset: 0; display: flex; align-items: center; gap: 2px; }
.vm-wave__bar   { flex: 1; max-width: 3px; min-width: 2px; border-radius: 2px; background: currentColor; }
.vm-wave__base  { color: color-mix(in oklch, var(--ink) 22%, transparent); }
.vm-wave__fill  { color: var(--brand);
                  clip-path: inset(0 calc((1 - var(--p, 0)) * 100%) 0 0); }
```

Both layers render the same bars from the same array, so the geometry can never differ.

**Real waveform data (`peaks`).**
- New recordings: compute about 48 peak values (0-100) at record time (decode with `AudioContext.decodeAudioData`, take the max absolute sample per block, normalize, apply a gentle curve such as `Math.pow(v, 0.6)`) and store them as a `peaks` attribute on the `voiceMemo` node. Serialize `peaks` the same way the existing attributes (`duration`, `transcript`) are serialized. It is an additive, optional attribute.
- Old memos without `peaks`: compute lazily on first render into an **in-memory cache** (a `Map` keyed by note/node id). **Do not write it back**, because saving would bump the note's `updatedAt` and reorder the list.
- If decoding fails, fall back to a fixed gentle, deterministic pattern (not random per render).

**Playback engine.**
- Convert the `dataUrl` to a Blob URL once (`fetch(dataUrl).then(r => r.blob())`, `URL.createObjectURL`) and revoke it on unmount. This makes seeking reliable.
- Use the stored `duration` for progress if `audio.duration` is `Infinity` or `NaN`.
- Only **one memo plays at a time**: keep a module-level reference to the current `<audio>` and pause it before starting another.
- Click or drag on the waveform to seek (pointer events with `setPointerCapture`, wrapped in try/catch as the project does elsewhere). While paused, update the visuals immediately.
- Keyboard: the waveform is `role="slider"` with `aria-valuemin/max/now`; Left/Right seek 5 seconds; Space/Enter toggles play.
- The node view is `contentEditable={false}`; clicking the player must not move the editor caret or select the node by accident.
- Remove every old keyframe animation, per-bar transition, and any extra marker elements.

### Acceptance
- [x] One pill, no outer card; looks identical idle and while playing except for the color sweep.
- [x] Bars keep the same width and spacing from 0% to 100%; no stray vertical lines.
- [x] Playback is smooth (no jumps or flicker); progress updates without React re-renders per frame (rAF writes CSS vars).
- [x] Seeking by click/drag and with arrow keys works, also when paused; ending resets to the start.
- [x] Starting a second memo pauses the first (module-level single-player guard).
- [x] Works for memos recorded with `MediaRecorder` (duration `Infinity` case) and for old memos without `peaks`.
- [x] Light and dark themes; reduced motion shows no animation at all except the progress color.

---

## 3. Sidebar brand header (logo + "Tipot")

### Problem
The header is bland: a pale-blue tile with a faint, small mark and plain text. In light theme the mark has almost no contrast.

### Target

```
┌────────────────────────┐
│ ▣  Tipot               │   48px high row; ▣ = 24px solid blue tile, white stones
└────────────────────────┘
```

| Element | Spec |
|---|---|
| Row | Height 48px, padding `0 14px 0 16px`, `display:flex; align-items:center; gap:10px`. It is a button (navigates to All notes): focus ring, `cursor: pointer`, hover background `var(--panel-soft)` with radius 8px (inset 8px from the sidebar edge). |
| Logo | **The app icon itself:** 24px rounded-square tile (radius 6px), fixed color `#3761e1` (define once as `--brand-logo`; it is the brand identity and intentionally does **not** follow the accent), with the white stacked-stones mark inside (the existing `BrandMark`, rendered white at about 16px). |
| Wordmark | "Tipot", 15px, weight 650, `letter-spacing: -0.01em`, `color: var(--ink)`, `line-height: 1`. Text comes from `brand.json` / `brand.name`. |
| Rail (collapsed) | Tile only, 28px, centered; tooltip "Tipot". |
| Below the header | 8px gap, then the nav. No divider line. |

### Also in this task
- The empty-notebooks dashed box ("Organize with a notebook") becomes a quiet ghost row: folder icon plus "New notebook", 32px high, `var(--muted)`, no dashed border, hover `var(--panel-soft)`. The `+` beside the NOTEBOOKS heading remains the only other create-notebook control, and it shows only on hover of that section. Keep the same click handler.

### Acceptance
- [x] The logo is clearly visible in light and dark and matches the app icon.
- [x] Changing the accent color does **not** change the logo (`--brand-logo` token).
- [x] Rail shows the tile only; both states have no layout jump.
- [x] Clicking the header goes to All notes; keyboard focus ring visible.

---

## 4. Menus and popovers: de-clutter everything

### Problems visible in the note "···" menu
- The menu is too narrow, so labels **wrap onto two lines** ("Add to notebooks", "Version history…"), and icons sit beside the first line only.
- Inconsistent trailing "…" on some items ("Version history…", "Export…") and not others.
- Labels are wordy, spacing is uneven, group dividers are faint.

### Do this once, in the shared component
Find the shared menu component(s) (`src/components/ui/ContextMenu` and anything that renders menu items itself). Fix the shared component so every menu inherits the result, then fix the remaining one-off menus.

**Menu spec**

| Property | Value |
|---|---|
| Width | `width: max-content; min-width: 208px; max-width: 288px` |
| Container | padding 4px, radius 10px, `background: var(--panel)`, `border: 1px solid var(--line-strong)`, `box-shadow: var(--shadow-pop)` (add this token if missing; stronger in dark), max-height `min(70vh, 420px)` with thin scroll |
| Item | height 32px, padding `0 10px`, radius 6px, `display:flex; align-items:center; gap:10px`, label `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` (**never wraps**) |
| Icon | fixed 16px box, stroke 1.7, `var(--muted)`, always vertically centered; items without an icon keep the same left space so labels align |
| Label | 13px / 500, `var(--ink)` |
| Shortcut hint | right-aligned, 12px, `var(--muted)`, tabular numbers (only where a shortcut exists) |
| Hover / keyboard focus | `background: var(--panel-soft)` (same style for both) |
| Danger item | text and icon in the danger color (reuse the existing red token), hover tinted; always last, below a divider |
| Groups | Divider `1px var(--line)` with `margin: 4px 6px`. Max 3 groups per menu; more than 7 items need grouping. |
| Disabled | 45% opacity, no hover, `aria-disabled` |
| Motion | 120ms fade plus scale from 0.98, origin at the trigger; none under reduced motion |
| Behavior | Opens aligned to the trigger's edge and **flips/shifts to stay inside the window**; closes on Esc, outside click, or after choosing an item; focus returns to the trigger; Up/Down/Home/End/Enter/Esc keyboard navigation; type-ahead optional |

**Label rules (all menus)**
- Sentence case, short verbs, **no trailing "…"** anywhere, and no wrapping.
- Singular nouns: "Add to notebook", not "Add to notebooks".

### Note "···" menu: exact content

```
Focus mode                    (shortcut, if one exists)
Add to notebook
Version history
─────────────
Duplicate
Export
─────────────
Move to trash                 (danger)
```

Keep every handler exactly as it is; only labels, grouping and styling change. The top-bar icons (Share, Pin, Star, ···) stay; make sure each has a tooltip and the Pin/Star active states are visible.

### Sweep: apply the same treatment to every other menu and clutter point
Inventory first (list them in your report), then fix each: note list/card context menu, notebook context menu, image ·· menu, quote ·· menu, whiteboard ·· menu, voice memo ·· menu, account menu, sort menu, editor toolbar overflow menu, slash menu, any "More" popovers and dialogs with the same problems.

For each, check and fix:
- Wrapped or truncated labels, inconsistent icon sizes or alignment, mixed ellipsis usage
- More than about 7 items without grouping, or duplicate actions available in two places for no reason
- Always-visible secondary controls that should appear on hover or selection only
- Boxes inside boxes (a card inside a card), heavy borders, drop shadows on non-floating elements
- More than one solid accent-colored element in the same region

Rules for the sweep: **no action may be removed or broken**. If an item looks redundant, leave it and list it under "Suggested removals" in the report instead of deleting it.

### Acceptance
- [x] No menu label wraps at any window size; icons align to the label's center.
- [x] All menus share the same width rules, spacing, divider and hover styles, in both themes.
- [x] Menus never open off-screen (ContextMenu clamps via useLayoutEffect; toolbar portal anchored to the trigger).
- [x] Keyboard navigation and Esc work in every menu (ContextMenu + toolbar portal have keydown handlers).
- [x] Every menu action still does what it did (click through each one).
