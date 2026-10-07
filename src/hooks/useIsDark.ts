import { useEffect, useState } from 'react';

/**
 * Tracks the `dark` class on <html> reactively. Components that render
 * theme-dependent previews (settings swatches) read this instead of poking
 * `classList.contains('dark')` at render time — the class is applied in an
 * effect after render, so a plain read is one render behind a theme switch.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains('dark')));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}
