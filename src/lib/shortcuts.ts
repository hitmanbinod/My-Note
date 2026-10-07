/** Rebindable app-level keyboard shortcuts (editor formatting stays on Tiptap defaults). */

export interface ShortcutDef {
  id: string;
  label: string;
  combo: string; // canonical form: Mod / Shift / Alt / Key, e.g. "Mod+Shift+F"
}

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  { id: 'new-note', label: 'New note', combo: 'Mod+N' },
  { id: 'search', label: 'Search notes', combo: 'Mod+F' },
  { id: 'focus', label: 'Focus mode', combo: 'Mod+Shift+F' },
  { id: 'split', label: 'Split view', combo: 'Mod+Alt+V' },
  { id: 'sync', label: 'Sync with Drive', combo: 'Mod+Shift+S' },
  { id: 'settings', label: 'Open settings', combo: 'Mod+,' }
];

export function resolveShortcuts(custom?: Record<string, string>): ShortcutDef[] {
  return DEFAULT_SHORTCUTS.map((def) => ({ ...def, combo: custom?.[def.id] ?? def.combo }));
}

/** Canonical combo string from a keyboard event, e.g. "Mod+Shift+F". */
export function comboFromEvent(event: KeyboardEvent): string | null {
  const key = event.key;
  if (['Control', 'Meta', 'Shift', 'Alt', 'CapsLock', 'Tab', 'Escape'].includes(key)) return null;
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('Mod');
  if (event.shiftKey) parts.push('Shift');
  if (event.altKey) parts.push('Alt');
  const named: Record<string, string> = {
    ',': 'Comma', '.': 'Period', ' ': 'Space', '+': 'Plus', '-': 'Minus'
  };
  const normalized = named[key] ?? (key.length === 1 ? key.toUpperCase() : key);
  parts.push(normalized);
  return parts.join('+');
}

/** "Mod+Shift+F" → "Ctrl + Shift + F" for display. */
export function formatCombo(combo: string): string {
  return combo
    .split('+')
    .map((part) => (part === 'Mod' ? 'Ctrl' : part === 'Comma' ? ',' : part === 'Period' ? '.' : part))
    .join(' + ');
}

export function combosEqual(a: KeyboardEvent, combo: string): boolean {
  return comboFromEvent(a) === combo;
}
