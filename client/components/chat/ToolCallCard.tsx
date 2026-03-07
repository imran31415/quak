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
      className={`my-1 border rounded text-xs ${hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
      data-testid="tool-call-card"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-gray-100 rounded"
      >
        <svg
          className={`w-3 h-3 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-mono font-medium text-purple-700">{toolCall.name}</span>
        {result && !hasError && (
          <span className="ml-auto text-green-600">done</span>
        )}
        {hasError && (
          <span className="ml-auto text-red-600">error</span>
        )}
        {!result && (
          <span className="ml-auto text-gray-400 animate-pulse">running...</span>
        )}
      </button>
      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          <div>
            <span className="text-gray-500">Args:</span>
            <pre className="mt-0.5 p-1 bg-white rounded border text-[11px] overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {result && (
            <div>
              <span className="text-gray-500">{hasError ? 'Error:' : 'Result:'}</span>
              <pre className={`mt-0.5 p-1 rounded border text-[11px] overflow-x-auto max-h-32 overflow-y-auto ${hasError ? 'bg-red-50' : 'bg-white'}`}>
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
