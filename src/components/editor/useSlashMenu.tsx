import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '@tiptap/react';

export interface SlashItem {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  command: (editor: Editor) => void;
}

export interface SlashMenuState {
  open: boolean;
  top: number;
  left: number;
  query: string;
  startPos: number | null;
  activeIndex: number;
}

/**
 * UpNote-style "/" menu: typing a slash opens a formatting menu anchored at
 * the caret; filter by typing, pick with mouse or arrow keys + Enter.
 */
export function useSlashMenu(editor: Editor | null, items: SlashItem[]) {
  const [state, setState] = useState<SlashMenuState>({ open: false, top: 0, left: 0, query: '', startPos: null, activeIndex: 0 });
  const stateRef = useRef(state);
  stateRef.current = state;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const close = useCallback(() => {
    setState((prev) => (prev.open ? { ...prev, open: false, startPos: null, query: '' } : prev));
  }, []);

  // Track "/" + query at the caret on every transaction
  useEffect(() => {
    if (!editor) return undefined;

    const update = () => {
      const { selection } = editor.state;
      if (!selection.empty) { close(); return; }
      const { $head } = selection;
      const textBefore = $head.parent.textBetween(0, $head.parentOffset, '\u0000', '\u0000');
      const match = /(?:^|\s)\/([a-zA-Z]*)$/.exec(textBefore);
      if (!match || match[1] === undefined) { close(); return; }
      const query = match[1];
      const startPos = $head.pos - query.length - 1;
      const coords = editor.view.coordsAtPos($head.pos);
      setState((prev) => ({
        open: true,
        top: Math.min(coords.bottom + 6, window.innerHeight - 340),
        left: Math.min(Math.max(10, coords.left - 4), window.innerWidth - 270),
        query,
        startPos,
        activeIndex: prev.open && prev.query === query ? prev.activeIndex : 0
      }));
    };

    editor.on('transaction', update);
    return () => { editor.off('transaction', update); };
  }, [editor, close]);

  const applyAt = useCallback((index: number) => {
    const current = stateRef.current;
    const item = itemsRef.current[index] ?? itemsRef.current[0];
    if (!editor || !item || current.startPos === null) return;
    const from = current.startPos;
    const to = editor.state.selection.from;
    editor.chain().focus().deleteRange({ from, to }).run();
    item.command(editor);
    close();
  }, [editor, close]);

  // Keyboard handling runs in capture phase, before ProseMirror sees the keys
  useEffect(() => {
    if (!state.open) return undefined;
    const filtered = itemsRef.current.filter((item) => filterItem(item, stateRef.current.query));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || (event.key === 'Tab' && !event.shiftKey)) {
        event.preventDefault(); event.stopPropagation();
        setState((prev) => ({ ...prev, activeIndex: (prev.activeIndex + 1) % Math.max(filtered.length, 1) }));
      } else if (event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey)) {
        event.preventDefault(); event.stopPropagation();
        setState((prev) => ({ ...prev, activeIndex: (prev.activeIndex - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1) }));
      } else if (event.key === 'Enter') {
        event.preventDefault(); event.stopPropagation();
        applyAt(stateRef.current.activeIndex);
      } else if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state.open, applyAt, close]);

  const filtered = state.open ? items.filter((item) => filterItem(item, state.query)) : [];
  const setActive = useCallback((index: number) => {
    setState((prev) => ({ ...prev, activeIndex: index }));
  }, []);
  return { state: { ...state, filtered }, applyAt, setActive, close };
}

function filterItem(item: SlashItem, query: string): boolean {
  const lower = query.toLowerCase();
  return !lower || item.label.toLowerCase().includes(lower) || (item.hint?.toLowerCase().includes(lower) ?? false);
}

