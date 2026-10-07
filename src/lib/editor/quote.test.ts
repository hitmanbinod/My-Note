import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { makeQuote } from './quote';

/**
 * Quote blocks never add quotation marks — the left bar + tint already say
 * "quote" (see the UI polish guide). makeQuote may strip one wrapping pair,
 * never insert characters.
 */
function editorWith(text: string) {
  const editor = new Editor({
    extensions: [Document, Paragraph, Text, Blockquote],
    content: `<p>${text}</p>`
  });
  editor.commands.setTextSelection({ from: 1, to: text.length + 1 });
  return editor;
}

describe('makeQuote', () => {
  it('adds no quote characters to plain text', () => {
    const editor = editorWith('plain sentence');
    makeQuote(editor);
    const quote = editor.getJSON().content?.find((n) => n.type === 'blockquote');
    expect(quote).toBeDefined();
    expect(editor.getText().trim()).toBe('plain sentence');
    expect(editor.getHTML()).not.toMatch(/["“”]/);
  });

  it('strips exactly one wrapping pair of straight quotes', () => {
    const editor = editorWith('"quoted sentence"');
    makeQuote(editor);
    expect(editor.getJSON().content?.some((n) => n.type === 'blockquote')).toBe(true);
    expect(editor.getText().trim()).toBe('quoted sentence');
  });

  it('leaves inner quotes untouched', () => {
    const editor = editorWith('he said "hi" loudly');
    makeQuote(editor);
    expect(editor.getText().trim()).toBe('he said "hi" loudly');
  });
});
