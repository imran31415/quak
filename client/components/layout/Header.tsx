import { useUIStore } from '../../store/uiStore';

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleQueryPanel = useUIStore((s) => s.toggleQueryPanel);

  return (
    <header className="h-12 bg-white border-b border-gray-200 flex items-center px-4 shrink-0" data-testid="header">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded hover:bg-gray-100 mr-3"
        aria-label="Toggle sidebar"
        data-testid="toggle-sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-gray-800">Quak</h1>
      <div className="ml-auto">
        <button
          onClick={toggleQueryPanel}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          data-testid="toggle-query"
        >
          SQL
        </button>
      </div>
    </header>
  );
}
