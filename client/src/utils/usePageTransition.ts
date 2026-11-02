import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Fades the page content in on every route change without remounting it.
export const usePageTransition = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = el.animate(
      [
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
    );
    return () => animation.cancel();
  }, [pathname]);

  return ref;
};
