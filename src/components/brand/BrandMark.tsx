/**
 * Tipot brand mark — three stacked stones (a cairn) inlined from
 * src/assets/brand/mark.svg so it follows theme colors. Geometry source of
 * truth lives in the rebrand guide; keep both in sync if it ever changes.
 */
export function BrandMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="currentColor" className={className} aria-hidden="true">
      <rect x="36.4" y="22.4" width="32.2" height="15" rx="7.5" opacity=".7" />
      <rect x="22" y="40.8" width="52.9" height="16.1" rx="8" opacity=".85" />
      <rect x="15.5" y="60.4" width="69" height="17.3" rx="8.6" />
    </svg>
  );
}
