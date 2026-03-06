import { useEffect } from 'react';
import { useUIStore } from '../store/uiStore';

export function useResponsive() {
  const setIsMobile = useUIStore((s) => s.setIsMobile);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [setIsMobile]);
}
