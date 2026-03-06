import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useResponsive } from '../../hooks/useResponsive';
import { useUIStore } from '../../store/uiStore';

export function AppShell({ children }: { children: ReactNode }) {
  useResponsive();
  const isMobile = useUIStore((s) => s.isMobile);

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
    </div>
  );
}
