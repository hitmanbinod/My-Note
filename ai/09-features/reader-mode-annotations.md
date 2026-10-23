# Reader Mode Annotations.Md

**Purpose:** Read notes as documents and annotate them (highlights, pen, sticky notes).

**Key files:** src/components/reader/ReaderView.tsx, src/lib/reader/highlights.ts.

**Data:** marks (text offsets + color), strokes (normalized 0-1 points), text notes (x/y + text); session-scoped via readerAnnotations.

**How it works:**
1. Enter via reader toggle; folders become chapters. 2. Highlight: select text → bubble → color (CSS Custom Highlight API reader-hl-*). 3. Highlighter tool: drag paints live via caretRangeFromPoint + live Highlight, commits offsets on release. 4. Pen: SVG overlay polylines. 5. Eraser: nearest stroke/mark.

**Invariants / do-not-break rules:** Annotations are session-scoped (lost on reload by design — later phase persists them). Text offsets are relative to the rendered chapter.

**Edge cases and gotchas:** Highlighter needs the overlay pointer-events-none; caretRangeFromPoint ignores pointer-events:none elements.

**Tests:** None. Missing: offsets round-trip test.

**Known issues:** Annotations do not survive reload (by design, phase 1).

**Open questions:** None.
