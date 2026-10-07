import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Fragment } from '@tiptap/pm/model';
import { getHTMLFromFragment } from '@tiptap/core';
import { useState } from 'react';
import { ContextMenu, type ContextMenuItem } from '@/components/ui/ContextMenu';
import { editCommands } from '@/components/ui/clipboard-menu';
import { MARK_COLORS } from '@/lib/theme/palette';

const MORE_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
);

export function QuoteNodeView({ node, updateAttributes, deleteNode, editor }: NodeViewProps) {
  const editable = editor?.isEditable ?? true;
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const bgColor = (node.attrs.bgColor as string | null) ?? null;

  const copyQuote = () => {
    if (!editor) return;
    const html = getHTMLFromFragment(Fragment.from(node), editor.schema);
    editCommands.copyRich(html, node.textContent);
  };

  const items: ContextMenuItem[] = [
    { label: 'Copy', run: copyQuote },
    { label: 'Cut', run: () => { copyQuote(); deleteNode(); } },
    { separator: true, label: '' },
    {
      label: 'Background color',
      children: [
        ...MARK_COLORS.map((c) => ({
          label: c.label,
          dot: c.solid,
          active: bgColor === c.key,
          run: () => updateAttributes({ bgColor: c.key })
        })),
        { label: 'None', active: !bgColor, run: () => updateAttributes({ bgColor: null }) }
      ]
    },
    { separator: true, label: '' },
    { label: 'Delete', danger: true, run: () => deleteNode() }
  ];

  return (
    <NodeViewWrapper className="quote-node relative">
      <NodeViewContent as="blockquote" data-bg={bgColor ?? undefined} />
      {editable && (
        <button
          type="button"
          className="embed-tool embed-tool--menu"
          title="Quote options"
          aria-label="Quote options"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            setMenuPos({ x: rect.left + rect.width / 2, y: rect.bottom + 6 });
          }}
        >
          {MORE_SVG}
        </button>
      )}
      {menuPos && <ContextMenu x={menuPos.x} y={menuPos.y} items={items} onClose={() => setMenuPos(null)} />}
    </NodeViewWrapper>
  );
}
