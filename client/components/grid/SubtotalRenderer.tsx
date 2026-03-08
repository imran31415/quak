interface SubtotalRendererProps {
  value: unknown;
  colDef: { field?: string };
}

export function SubtotalRenderer({ value }: SubtotalRendererProps) {
  return (
    <div className="font-medium text-gray-600 dark:text-gray-300 italic text-sm" data-testid="subtotal-cell">
      {value !== null && value !== undefined ? String(value) : ''}
    </div>
  );
}
