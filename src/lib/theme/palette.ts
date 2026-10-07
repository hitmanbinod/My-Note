/**
 * Shared mark palette (UpNote-style): quote backgrounds, reader highlights,
 * pen strokes and sticky notes all draw from this one set so the tools look
 * and feel consistent. `solid` is the ink/stroke color; background tints come
 * from the `--mark-<key>` CSS variables (theme-aware, see index.css).
 */
export interface MarkColor {
  key: string;
  label: string;
  solid: string;
}

export const MARK_COLORS: MarkColor[] = [
  { key: 'red', label: 'Red', solid: '#e5484d' },
  { key: 'orange', label: 'Orange', solid: '#f0762b' },
  { key: 'yellow', label: 'Yellow', solid: '#d9a514' },
  { key: 'green', label: 'Green', solid: '#3fa860' },
  { key: 'blue', label: 'Blue', solid: '#4f8ef7' },
  { key: 'pink', label: 'Pink', solid: '#ec6aa8' },
  { key: 'purple', label: 'Purple', solid: '#9b6ede' },
  { key: 'gray', label: 'Gray', solid: '#98a0a8' }
];

export const markColor = (key: string): MarkColor | undefined => MARK_COLORS.find((c) => c.key === key);
