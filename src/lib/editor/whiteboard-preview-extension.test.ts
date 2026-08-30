import { Editor } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';
import { getEditorExtensions } from './extensions';

describe('WhiteboardPreviewExtension', () => {
  it('serializes an inserted board and emits an editor update', () => {
    const onUpdate = vi.fn();
    const editor = new Editor({ extensions: getEditorExtensions(), onUpdate });

    editor.commands.insertContent({ type: 'whiteboardPreview', attrs: { boardId: 'board-1' } });

    expect(editor.getJSON()).toEqual({
      type: 'doc',
      content: [{ type: 'whiteboardPreview', attrs: { boardId: 'board-1' } }]
    });
    expect(onUpdate).toHaveBeenCalledOnce();
    editor.destroy();
  });
});
