import { useUIStore } from '../../store/uiStore';

export function MobileNav() {
  const { isMobile, toggleSidebar, toggleQueryPanel } = useUIStore();

  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex items-center justify-around z-30"
      data-testid="mobile-nav"
    >
      <button
        onClick={toggleSidebar}
        className="flex flex-col items-center text-gray-600"
        data-testid="mobile-sheets-btn"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="text-xs mt-0.5">Sheets</span>
      </button>
      <button
        onClick={toggleQueryPanel}
        className="flex flex-col items-center text-gray-600"
        data-testid="mobile-query-btn"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs mt-0.5">SQL</span>
      </button>
    </nav>
  );
}
