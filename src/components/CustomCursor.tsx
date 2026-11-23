import { useEffect, useRef } from 'react';
import {
  getCursorScale,
  hasCursorConverged,
  lerpCursor,
  type CursorPoint,
} from '@/src/lib/cursor';

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, [role="button"], [role="link"]';

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(pointer: fine)');
    if (!finePointerQuery.matches) {
      return;
    }

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dot = dotRef.current;
    if (!dot) {
      return;
    }

    let isVisible = false;
    let isHoveringInteractive = false;
    let isPressed = false;
    let rafId: number | null = null;

    const current: CursorPoint = { x: -100, y: -100 };
    const target: CursorPoint = { x: -100, y: -100 };

    const applyTransform = () => {
      const scale = getCursorScale({ isHoveringInteractive, isPressed });
      dot.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%) scale(${scale})`;
    };

    const tick = () => {
      const factor = reducedMotionQuery.matches ? 1 : 0.24;
      const next = lerpCursor(current, target, factor);
      current.x = next.x;
      current.y = next.y;
      applyTransform();

      if (hasCursorConverged(current, target)) {
        current.x = target.x;
        current.y = target.y;
        applyTransform();
        rafId = null;
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const scheduleTick = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') {
        return;
      }

      target.x = event.clientX;
      target.y = event.clientY;

      if (!isVisible) {
        current.x = event.clientX;
        current.y = event.clientY;
        isVisible = true;
        dot.style.opacity = '1';
      }

      const eventTarget = event.target as Element | null;
      isHoveringInteractive = Boolean(eventTarget?.closest(INTERACTIVE_SELECTOR));

      scheduleTick();
    };

    const handlePointerDown = () => {
      if (!isVisible) return;
      isPressed = true;
      applyTransform();
    };

    const handlePointerUp = () => {
      if (!isVisible) return;
      isPressed = false;
      applyTransform();
    };

    const handleMouseLeave = () => {
      isVisible = false;
      dot.style.opacity = '0';
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    document.documentElement.classList.add('custom-cursor-active');
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <div
      ref={dotRef}
      data-testid="custom-cursor"
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[100] size-2.5 rounded-full bg-white/90 shadow-[0_1px_6px_rgba(0,0,0,0.35)] opacity-0 transition-opacity duration-200 will-change-transform"
    />
  );
}
