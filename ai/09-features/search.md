# Search.Md

**Purpose:** Instant full-text search across notes.

**Key files:** src/hooks/useSearch.ts, minisearch.

**Data:** Index built over plainTextContent + title; queried from the ?search= param.

**How it works:**
1. Type in the search bar → useSearch re-queries the index → list swaps to results. 2. Clearing restores the list.

**Invariants / do-not-break rules:** Search never writes to the notes table.

**Edge cases and gotchas:** A 4-digit query is treated as the PIN attempt for the password-manager reveal (NotesPage) — search results still render.

**Tests:** useSearch covered indirectly. Missing: minisearch edge-case tests.

**Known issues:** None known.

**Open questions:** None.
