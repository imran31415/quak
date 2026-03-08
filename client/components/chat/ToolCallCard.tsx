import { useState } from 'react';
import type { ToolCall, ToolResult } from '@shared/chat';

interface ToolCallCardProps {
  toolCall: ToolCall;
  result?: ToolResult;
}

export function ToolCallCard({ toolCall, result }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasError = result?.error;

  return (
    <div
      className={`my-1 border rounded text-xs ${hasError ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}
      data-testid="tool-call-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
      >
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-mono font-medium text-purple-700 dark:text-purple-400">{toolCall.name}</span>
        {result && !hasError && (
          <span className="ml-auto text-green-600 dark:text-green-400">done</span>
        )}
        {hasError && (
          <span className="ml-auto text-red-600 dark:text-red-400">error</span>
        )}
        {!result && (
          <span className="ml-auto text-gray-400 dark:text-gray-500 animate-pulse">running...</span>
        )}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Args:</span>
            <pre className="mt-0.5 p-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[11px] overflow-x-auto max-h-32 overflow-y-auto text-gray-800 dark:text-gray-200">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">{hasError ? 'Error:' : 'Result:'}</span>
              <pre className={`mt-0.5 p-1 rounded border text-[11px] overflow-x-auto max-h-32 overflow-y-auto ${hasError ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'} text-gray-800 dark:text-gray-200`}>
                {hasError
                  ? result.error
                  : JSON.stringify(result.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
