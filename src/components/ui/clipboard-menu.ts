import type { ContextMenuItem } from '@/components/ui/ContextMenu';

/** Edit commands that work in Electron (native bridge) and the browser (execCommand). */
export const editCommands = {
  cut: () => {
    if (window.electronAPI) return void window.electronAPI.editCut();
    document.execCommand('cut');
  },
  copy: () => {
    if (window.electronAPI) return void window.electronAPI.editCopy();
    document.execCommand('copy');
  },
  paste: () => {
    if (window.electronAPI) return void window.electronAPI.editPaste();
    document.execCommand('paste');
  },
  pasteAndMatchStyle: () => {
    if (window.electronAPI) return void window.electronAPI.editPasteAndMatchStyle();
    document.execCommand('pasteAndMatchStyle');
  },
  selectAll: () => {
    if (window.electronAPI) return void window.electronAPI.editSelectAll();
    document.execCommand('selectAll');
  },
  copyRich: (html: string, text: string) => {
    if (window.electronAPI) return void window.electronAPI.copyRich(html, text);
    void navigator.clipboard.writeText(text || html).catch(() => undefined);
  }
};

/** Standard clipboard items for inputs and the editor. */
export function clipboardMenuItems(): ContextMenuItem[] {
  return [
    { label: 'Cut', shortcut: 'Ctrl+X', run: editCommands.cut },
    { label: 'Copy', shortcut: 'Ctrl+C', run: editCommands.copy },
    { label: 'Paste', shortcut: 'Ctrl+V', run: editCommands.paste },
    { label: 'Paste and match style', shortcut: 'Ctrl+Shift+V', run: editCommands.pasteAndMatchStyle },
    { separator: true, label: '' },
    { label: 'Select all', shortcut: 'Ctrl+A', run: editCommands.selectAll }
  ];
}

/** Menu items for plain inputs/textareas (title, tags, search…). */
export function inputMenuItems(): ContextMenuItem[] {
  return clipboardMenuItems();
}
