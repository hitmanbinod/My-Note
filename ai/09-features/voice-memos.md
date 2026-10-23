# Voice Memos.Md

**Purpose:** Record audio notes inline; they live in the note content.

**Key files:** src/components/editor/VoiceMemoView.tsx, src/lib/editor/voice-peaks.ts, EditorToolbar.tsx (recorder), extensions.ts (voiceMemo node).

**Data:** voiceMemo attrs: dataUrl (base64 audio), duration (s), createdAt, transcript (Web Speech, optional), peaks (48 ints 0-100, optional).

**How it works:**
1. Record: MediaRecorder → chunks → Blob → peaks computed (decodeAudioData, 48 max-abs blocks, pow 0.6 curve) → insert with dataUrl + peaks. 2. Play: Blob URL playback (dataUrl converted once, revoked on unmount); rAF loop writes --p + time. 3. Seek: pointer drag / arrow keys. 4. Old memos: peaks decoded lazily into an in-memory cache, never saved.

**Invariants / do-not-break rules:** Only one memo plays at a time (module-level audio ref). duration: Infinity fallback uses stored duration. Peaks never written back for old memos (would bump updatedAt).

**Edge cases and gotchas:** MediaRecorder webm often reports duration Infinity. decodeAudioData fails on unsupported codecs → deterministic fallback bars.

**Tests:** None. Missing: peaks computation unit test.

**Known issues:** None known.

**Open questions:** UNVERIFIED: transcription behavior on non-English locales.
