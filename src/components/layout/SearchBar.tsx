import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentQuery = new URLSearchParams(location.search).get('search') || '';
  const [query, setQuery] = useState(currentQuery);
  useEffect(() => setQuery(currentQuery), [currentQuery]);
  useEffect(() => {
    if (query === currentQuery) return undefined;
    const timeout = window.setTimeout(() => {
      const trimmed = query.trim();
      navigate(trimmed ? `/notes?search=${encodeURIComponent(trimmed)}` : '/notes');
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [currentQuery, navigate, query]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const submit = (value: string) => {
    const trimmed = value.trim();
    navigate(trimmed ? `/notes?search=${encodeURIComponent(trimmed)}` : '/notes');
  };
  return (
    <form className="relative w-full max-w-md" onSubmit={(event) => { event.preventDefault(); submit(query); }} role="search">
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
      <input id="global-search" aria-label="Search your notes" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); submit(''); } }} placeholder="Search notes" className="h-9 w-full rounded-md border border-transparent bg-[var(--panel-soft)] pl-9 pr-3 text-[13px] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)]/40 focus:bg-[var(--panel)]" />
    </form>
  );
}
export default SearchBar;
