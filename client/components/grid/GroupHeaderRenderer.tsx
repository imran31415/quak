interface GroupHeaderRendererProps {
  value: string;
  data: Record<string, unknown>;
  onToggle: (groupId: string) => void;
  collapsed: boolean;
}

export function GroupHeaderRenderer({ value, data, onToggle, collapsed }: GroupHeaderRendererProps) {
  const groupId = data.__groupId as string;

  return (
    <div
      className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100 cursor-pointer select-none"
      onClick={() => onToggle(groupId)}
      data-testid={`group-header-${groupId}`}
    >
      <svg
        className={`w-4 h-4 transition-transform ${collapsed ? '' : 'rotate-90'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M6 6L14 10L6 14V6Z" />
      </svg>
      <span>{value}</span>
    </div>
  );
}
