import { useEffect, useState } from 'react';

interface WindowControlsOverlayLike {
  visible: boolean;
  getTitlebarAreaRect(): DOMRect;
  addEventListener(type: 'geometrychange', listener: () => void): void;
  removeEventListener(type: 'geometrychange', listener: () => void): void;
}

/**
 * Right-side inset (px) reserved for the native window control buttons
 * (minimize / maximize / close) when the Electron titlebar overlay is active.
 * Uses the Window Controls Overlay API — correct at every DPI scale, unlike a
 * fixed guess. Returns 0 in the browser or when the overlay is absent.
 */
export function useWindowControlsInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const wco = (navigator as Navigator & { windowControlsOverlay?: WindowControlsOverlayLike }).windowControlsOverlay;
    if (!wco || !wco.visible) return undefined;

    const update = () => {
      try {
        const rect = wco.getTitlebarAreaRect();
        if (rect) setInset(Math.max(0, window.innerWidth - (rect.x + rect.width)));
      } catch {
        setInset(0);
      }
    };

    update();
    wco.addEventListener('geometrychange', update);
    return () => wco.removeEventListener('geometrychange', update);
  }, []);

  return inset;
}
