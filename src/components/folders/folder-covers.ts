/** UpNote-inspired notebook covers — gradient swatches derived from a base color. */
export const FOLDER_COVERS = [
  '#0e8fc4', '#12915f', '#d8c500', '#d64283', '#8c5a2b',
  '#d84343', '#e08b1d', '#7d52c9', '#4f5fb8', '#3f8f7a'
];

export function coverGradient(color: string | null): string {
  const base = color || '#8c8a84';
  return `linear-gradient(135deg, ${base} 0%, color-mix(in srgb, ${base} 60%, #1a1a2e) 100%)`;
}
