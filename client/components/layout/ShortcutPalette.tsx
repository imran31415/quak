interface ShortcutPaletteProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl+Z', description: 'Undo' },
  { keys: 'Ctrl+Y', description: 'Redo' },
  { keys: 'Ctrl+Shift+Z', description: 'Redo (alternative)' },
  { keys: 'Ctrl+F', description: 'Search in sheet' },
  { keys: 'Ctrl+Enter', description: 'Run SQL query' },
  { keys: 'Escape', description: 'Close dialog / search' },
  { keys: '?', description: 'Show keyboard shortcuts' },
];

export function ShortcutPalette({ onClose }: ShortcutPaletteProps) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40"
      onClick={onClose}
      data-testid="shortcut-palette"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close shortcuts"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-600">{s.description}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded text-gray-700">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
