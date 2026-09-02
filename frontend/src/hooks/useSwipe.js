/**
 * hooks/useSwipe.js
 * Touch swipe gesture hook — returns a ref to attach to a DOM element.
 * Calls onLeft when swiped left, onRight when swiped right.
 */
import { useRef, useEffect } from 'react';

export function useSwipe(onLeft, onRight, threshold = 60) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    const handleTouchStart = (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    };

    const handleTouchEnd = (e) => {
      if (!active) return;
      active = false;
      const dx = (e.changedTouches[0]?.clientX ?? 0) - startX;
      const dy = (e.changedTouches[0]?.clientY ?? 0) - startY;
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onLeft?.();
        else onRight?.();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onLeft, onRight, threshold]);

  return ref;
}
