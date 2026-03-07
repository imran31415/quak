import { useState, useEffect, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ShortcutPalette } from './ShortcutPalette';
import { useResponsive } from '../../hooks/useResponsive';
import { useUIStore } from '../../store/uiStore';

export function AppShell({ children }: { children: ReactNode }) {
  useResponsive();
  const isMobile = useUIStore((s) => s.isMobile);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // ? key (when not in input) or Ctrl+/
      if ((e.key === '?' && !isInput) || (e.key === '/' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }

      // Escape closes shortcuts
      if (e.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showShortcuts]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-auto ${isMobile ? 'pb-14' : ''}`} data-testid="main-content">
          {children}
        </main>
      </div>
      <MobileNav />
      {showShortcuts && <ShortcutPalette onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
