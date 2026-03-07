interface QueryTemplatesProps {
  onInsert: (sql: string) => void;
}

const TEMPLATES = [
  { label: 'Select All', sql: 'SELECT * FROM current_sheet' },
  { label: 'Count', sql: 'SELECT COUNT(*) as total FROM current_sheet' },
  { label: 'Group By', sql: 'SELECT column_name, COUNT(*) as cnt FROM current_sheet GROUP BY column_name ORDER BY cnt DESC' },
  { label: 'Filter', sql: "SELECT * FROM current_sheet WHERE column_name = 'value'" },
];

export function QueryTemplates({ onInsert }: QueryTemplatesProps) {
  return (
    <div className="flex gap-1.5 flex-wrap" data-testid="query-templates">
      {TEMPLATES.map((t) => (
        <button
          key={t.label}
          onClick={() => onInsert(t.sql)}
          className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
          data-testid={`template-${t.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
