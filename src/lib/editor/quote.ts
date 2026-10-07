import { Editor } from '@tiptap/core';

/**
 * Turning text into a quote block makes the quotation marks redundant — the
 * block itself says "quote". Strip one wrapping pair of straight or curly
 * quotes (plus surrounding whitespace) before toggling, so `"sdfsf"` becomes
 * sdfsf inside the block. Text without wrapping quotes is untouched.
 */
export function makeQuote(editor: Editor) {
  const { from, to } = editor.state.selection;
  const raw = editor.state.doc.textBetween(from, to, '\n');
  const match = /^["“””](.*)["“””]$/s.exec(raw.trim());
  if (match && match[1]) {
    editor.chain().focus().insertContentAt({ from, to }, match[1]).toggleBlockquote().run();
  } else {
    editor.chain().focus().toggleBlockquote().run();
  }
}
