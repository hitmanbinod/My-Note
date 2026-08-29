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
    <form className="group relative w-full max-w-xl" onSubmit={(event) => { event.preventDefault(); submit(query); }} role="search">
      <svg className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
      <input id="global-search" aria-label="Search your notes" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { setQuery(''); submit(''); } }} placeholder="Search your notes" className="h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--panel-soft)] pl-10 pr-16 text-sm text-[var(--ink)] outline-none transition-[background-color,border-color,box-shadow] duration-150 placeholder:text-[var(--muted)] focus:border-primary-400 focus:bg-[var(--panel)] focus:ring-4 focus:ring-primary-500/10" />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--muted)] sm:block">⌘ K</kbd>
    </form>
  );
}
export default SearchBar;
