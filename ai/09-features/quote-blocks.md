# Quote Blocks.Md

**Purpose:** Blockquote styling and quote-specific UI (background tints, quote-mark-free rendering).

**Key files:** src/lib/editor/extensions.ts (QuoteWithTools), src/components/editor/QuoteNodeView.tsx, src/lib/editor/quote.ts, index.css (blockquote rules).

**Data:** blockquote node with optional bgColor attr (key into --mark-* palette).

**How it works:**
1. Toggle: toolbar/slash/makeQuote — strips one wrapping pair of typed quotes. 2. Render: upright text, left bar, tint; prose italics/quote marks suppressed by CSS reset. 3. Options: ·· menu (copy, cut, background color, delete). 4. Trailing empty paragraph enforced by appendTransaction; edge-typed quote characters stripped live.

**Invariants / do-not-break rules:** Never insert quote characters. Trailing paragraph after a quote must exist. bgColor keys map to CSS vars.

**Edge cases and gotchas:** The typography plugin injects open/close-quote pseudo-elements — the reset in index.css removes them; do not delete that reset.

**Tests:** quote.test.ts (3 tests). Missing: appendTransaction strip test.

**Known issues:** None known.

**Open questions:** None.
