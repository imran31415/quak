import { useRef } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

const SWATCH_COLORS = [
  '#991b1b', '#9a3412', '#854d0e', '#166534', '#1e40af', '#6b21a8', '#9d174d', '#374151',
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#6b7280',
  '#fca5a5', '#fdba74', '#fde047', '#86efac', '#93c5fd', '#d8b4fe', '#f9a8d4', '#d1d5db',
  '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fbcfe8', '#e5e7eb',
];

interface ColorPickerPopoverProps {
  onSelect: (color: string | undefined) => void;
  onClose: () => void;
  currentColor?: string;
}

export function ColorPickerPopover({ onSelect, onClose, currentColor }: ColorPickerPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  return (
    <div
      ref={ref}
      className="absolute top-full mt-1 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg"
      data-testid="color-picker-popover"
    >
      <button
        onClick={() => { onSelect(undefined); onClose(); }}
        className="w-full text-left px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded mb-1"
        data-testid="color-none"
      >
        None
      </button>
      <div className="grid grid-cols-8 gap-1">
        {SWATCH_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => { onSelect(color); onClose(); }}
            className={`w-5 h-5 rounded border-2 ${currentColor === color ? 'border-blue-500' : 'border-transparent hover:border-gray-400'}`}
            style={{ backgroundColor: color }}
            title={color}
            data-testid={`color-swatch-${color.replace('#', '')}`}
          />
        ))}
      </div>
    </div>
  );
}
