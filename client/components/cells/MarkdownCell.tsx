import type { ICellRendererParams } from 'ag-grid-community';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownCell(props: ICellRendererParams) {
  const val = props.value;
  if (!val) return <span className="text-gray-400 dark:text-gray-500">—</span>;

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-tight" data-testid="markdown-cell">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(val)}</ReactMarkdown>
    </div>
  );
}
