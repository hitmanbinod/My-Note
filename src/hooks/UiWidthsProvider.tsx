import { useEffect, useMemo, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useDragResize } from '@/hooks/useDragResize';
import { UiWidthsContext } from '@/hooks/useUiWidths';

const SIDEBAR_MIN = 56;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 260;
const SIDEBAR_RAIL = 56;
/** Full layout holds until this width; below it the sidebar snaps to the rail. */
const SIDEBAR_RAIL_BELOW = 140;
const LIST_MIN = 260;
const LIST_MAX = 480;
const LIST_DEFAULT = 320;

/** Stored widths from older versions are clamped into the current range. */
const clampListWidth = (width: number | undefined) => Math.max(LIST_MIN, Math.min(LIST_MAX, width ?? LIST_DEFAULT));

/**
 * Persisted, draggable widths for the sidebar and note-list panes.
 * Widths live as CSS variables on <html> so dragging never re-renders React.
 */
export function UiWidthsProvider({ children }: { children: React.ReactNode }) {
  const { settings, update } = useSettings();
  const [hydrated, setHydrated] = useState(false);

  // Adopt stored widths once settings are available
  useEffect(() => {
    if (hydrated || !settings) return;
    const root = document.documentElement;
    root.style.setProperty('--sidebar-w', `${settings.sidebarWidth ?? SIDEBAR_DEFAULT}px`);
    root.style.setProperty('--list-w', `${clampListWidth(settings.listWidth)}px`);
    setHydrated(true);
  }, [settings, hydrated]);

  const sidebar = useMemo(
    () => ({
      getWidth: () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w')) || SIDEBAR_DEFAULT,
      setWidth: (width: number) => document.documentElement.style.setProperty('--sidebar-w', `${width}px`),
      commit: (width: number) => void update({ sidebarWidth: width })
    }),
    [update]
  );
  const list = useMemo(
    () => ({
      getWidth: () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--list-w')) || LIST_DEFAULT,
      setWidth: (width: number) => document.documentElement.style.setProperty('--list-w', `${width}px`),
      commit: (width: number) => void update({ listWidth: width })
    }),
    [update]
  );

  const sidebarResize = useDragResize(sidebar.getWidth, sidebar.setWidth, sidebar.commit, SIDEBAR_MIN, SIDEBAR_MAX, '--sidebar-w', { below: SIDEBAR_RAIL_BELOW, to: SIDEBAR_RAIL }, 'sidebar', SIDEBAR_DEFAULT);
  const listResize = useDragResize(list.getWidth, list.setWidth, list.commit, LIST_MIN, LIST_MAX, '--list-w', undefined, 'list', LIST_DEFAULT);

  const value = useMemo(
    () => ({
      beginSidebarResize: sidebarResize.onPointerDown,
      beginListResize: listResize.onPointerDown,
      resetSidebar: sidebarResize.onDoubleClick,
      resetList: listResize.onDoubleClick
    }),
    [sidebarResize.onPointerDown, listResize.onPointerDown, sidebarResize.onDoubleClick, listResize.onDoubleClick]
  );

  return <UiWidthsContext.Provider value={value}>{children}</UiWidthsContext.Provider>;
}
