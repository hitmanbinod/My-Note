export function Glyph({ d, dots, faded, fill }: { d: string; dots?: boolean; faded?: boolean; fill?: boolean }) {
  return (
    <svg className="h-4 w-4" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={faded ? { opacity: 0.4 } : undefined}>
      <path d={d} />
      {dots && <><circle cx="4.7" cy="6.5" r="1" fill="currentColor" stroke="none" /><circle cx="4.7" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.7" cy="17.5" r="1" fill="currentColor" stroke="none" /></>}
    </svg>
  );
}
