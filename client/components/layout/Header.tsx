import { useUIStore } from '../../store/uiStore';
import { useTheme } from '../../hooks/useTheme';

export function Header() {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleQueryPanel = useUIStore((s) => s.toggleQueryPanel);
  const toggleChatPanel = useUIStore((s) => s.toggleChatPanel);
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(next);
  };

  return (
    <header className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 shrink-0" data-testid="header">
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 mr-3 text-gray-700 dark:text-gray-200"
        aria-label="Toggle sidebar"
        data-testid="toggle-sidebar"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Quak</h1>
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={cycleTheme}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
          aria-label="Toggle theme"
          data-testid="theme-toggle"
          title={`Theme: ${theme}`}
        >
          {theme === 'light' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
          {theme === 'dark' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
          {theme === 'system' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleQueryPanel}
          className="px-3 py-1.5 text-sm bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
          aria-label="Toggle SQL panel"
          data-testid="toggle-query"
        >
          SQL
        </button>
        <button
          onClick={toggleChatPanel}
          className="px-3 py-1.5 text-sm bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600"
          aria-label="Toggle AI chat panel"
          data-testid="toggle-chat"
        >
          AI
        </button>
      </div>
    </header>
  );
}
