# Images And Embeds.Md

**Purpose:** Insert, resize, wrap and manage images inside notes.

**Key files:** src/components/editor/ResizableImageView.tsx, src/lib/editor/extensions.ts (image node), src/hooks/useWindowControlsInset.ts

**Data:** image node attrs: src (data URL), alt, width (% of column), align (left/center/right), float (bool → text wrap).

**How it works:**
1. Insert: file picker → fileToDataUrl → setImage. 2. Paste: HTML images parsed (allowBase64). 3. Resize: invisible corner grip, top-left pinned, commits width% + align:left. 4. Options: ·· button → view full size / align / wrap toggle / alt-text popover / copy / download / delete.

**Invariants / do-not-break rules:** allowBase64: true (paste path breaks without it). float defaults true for left/right. width is always a percentage.

**Edge cases and gotchas:** TipTap default drops data: URIs on paste — allowBase64 exists for this. float:left requires the paragraph after it to exist.

**Tests:** paste tests cover image parsing. Missing: resize commit unit test.

**Known issues:** None known.

**Open questions:** None.
