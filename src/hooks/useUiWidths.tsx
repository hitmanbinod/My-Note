import { createContext, useContext } from 'react';

export interface UiWidths {
  beginSidebarResize: (event: React.PointerEvent) => void;
  beginListResize: (event: React.PointerEvent) => void;
  resetSidebar: () => void;
  resetList: () => void;
}

export const UiWidthsContext = createContext<UiWidths | null>(null);

export function useUiWidths(): UiWidths {
  const context = useContext(UiWidthsContext);
  if (!context) throw new Error('useUiWidths must be used inside UiWidthsProvider');
  return context;
}
