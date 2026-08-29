import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import WhiteboardPreview from '@/components/whiteboards/WhiteboardPreview';

function WhiteboardNodeView({ node, selected }: NodeViewProps) {
  return (
    <NodeViewWrapper>
      <WhiteboardPreview boardId={node.attrs.boardId as string} selected={selected} />
    </NodeViewWrapper>
  );
}

export const WhiteboardPreviewExtension = Node.create({
  name: 'whiteboardPreview',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      boardId: {
        default: '',
        parseHTML: element => element.getAttribute('data-whiteboard-id'),
        renderHTML: attributes => ({ 'data-whiteboard-id': attributes.boardId })
      }
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-whiteboard-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(WhiteboardNodeView);
  }
});
