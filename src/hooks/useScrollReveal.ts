import { useEffect, useRef, useState } from 'react';
import { shouldRevealFromEntries } from '@/src/lib/reveal';

export interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useScrollReveal<T extends HTMLElement>({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T>(null);
  const [isRevealed, setIsRevealed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    const hasObserver = typeof window.IntersectionObserver !== 'undefined';
    return prefersReducedMotion || !hasObserver;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element || (triggerOnce && isRevealed)) {
      return;
    }

    if (typeof window.IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const intersecting = shouldRevealFromEntries(entries);
        if (intersecting) {
          setIsRevealed(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsRevealed(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, isRevealed]);

  return { ref, isRevealed };
}
