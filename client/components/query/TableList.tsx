import { useSheetStore } from '../../store/sheetStore';

function sanitizeTableName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

interface TableListProps {
  onInsert: (tableName: string) => void;
}

export function TableList({ onInsert }: TableListProps) {
  const { sheets, activeSheetId } = useSheetStore();

  if (sheets.length === 0) return null;

  return (
    <div className="border-t border-gray-200 pt-2 mt-2" data-testid="table-list">
      <h4 className="text-xs font-medium text-gray-500 uppercase mb-1 px-1">Tables</h4>
      <div className="space-y-0.5">
        {sheets.map((sheet) => {
          const tableName = sanitizeTableName(sheet.name);
          const isActive = sheet.id === activeSheetId;
          return (
            <button
              key={sheet.id}
              onClick={() => onInsert(tableName)}
              className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-100 ${
                isActive ? 'text-blue-700 font-medium' : 'text-gray-600'
              }`}
              title={`Click to insert "${tableName}"`}
              data-testid={`table-${sheet.id}`}
            >
              <span className="font-mono">{tableName}</span>
              {isActive && <span className="ml-1 text-gray-400">(current_sheet)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { sanitizeTableName };
