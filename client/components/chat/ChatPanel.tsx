import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUIStore } from '../../store/uiStore';
import { useChatStore } from '../../store/chatStore';
import { useSheetStore } from '../../store/sheetStore';
import { sendChat } from '../../api/chat';
import { ToolCallCard } from './ToolCallCard';
import type { ChatRequest, ChatMessage } from '@shared/chat';

const MODELS = [
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'google/gemini-2.0-flash-001', label: 'Gemini Flash' },
  { value: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
];

export function ChatPanel() {
  const chatPanelOpen = useUIStore((s) => s.chatPanelOpen);
  const setChatPanelOpen = useUIStore((s) => s.setChatPanelOpen);

  const messages = useChatStore((s) => s.messages);
  const streaming = useChatStore((s) => s.streaming);
  const model = useChatStore((s) => s.model);
  const apiKey = useChatStore((s) => s.apiKey);
  const addMessage = useChatStore((s) => s.addMessage);
  const appendDelta = useChatStore((s) => s.appendDelta);
  const addToolCallToLast = useChatStore((s) => s.addToolCallToLast);
  const addToolResult = useChatStore((s) => s.addToolResult);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setModel = useChatStore((s) => s.setModel);
  const setApiKey = useChatStore((s) => s.setApiKey);
  const clearMessages = useChatStore((s) => s.clearMessages);

  const activeSheetId = useSheetStore((s) => s.activeSheetId);
  const activeSheetMeta = useSheetStore((s) => s.activeSheetMeta);
  const sheets = useSheetStore((s) => s.sheets);
  const loadSheet = useSheetStore((s) => s.loadSheet);
  const fetchSheets = useSheetStore((s) => s.fetchSheets);

  const [input, setInput] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (chatPanelOpen) textareaRef.current?.focus();
  }, [chatPanelOpen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);
    setInput('');

    // Create assistant placeholder
    const assistantMsg: ChatMessage = {
      id: `asst_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(assistantMsg);
    setStreaming(true);

    // Build request: include all user+assistant messages, excluding the empty assistant placeholder
    const chatMessages = [...useChatStore.getState().messages]
      .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
      .map((m) => ({ role: m.role, content: m.content }));

    const request: ChatRequest = {
      messages: chatMessages,
      model,
      context: {
        activeSheetId,
        activeSheetMeta: activeSheetMeta
          ? {
              id: activeSheetMeta.id,
              name: activeSheetMeta.name,
              columns: activeSheetMeta.columns.map((c) => ({
                id: c.id,
                name: c.name,
                cellType: c.cellType,
              })),
            }
          : null,
        sheetNames: sheets.map((s) => ({ id: s.id, name: s.name })),
      },
    };

    abortRef.current = sendChat(request, apiKey, {
      onTextDelta: (content) => appendDelta(content),
      onToolCallStart: (id, name) =>
        addToolCallToLast({ id, name, arguments: {} }),
      onToolResult: (result) => addToolResult(result),
      onRefresh: () => {
        // Refresh sheet data
        if (activeSheetId) loadSheet(activeSheetId);
        fetchSheets();
      },
      onError: (msg) => appendDelta(`\n\n**Error:** ${msg}`),
      onDone: () => {
        setStreaming(false);
        abortRef.current = null;
      },
    });
  }, [input, streaming, model, apiKey, activeSheetId, activeSheetMeta, sheets, addMessage, appendDelta, addToolCallToLast, addToolResult, setStreaming, loadSheet, fetchSheets]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const saveApiKey = () => {
    setApiKey(apiKeyDraft.trim());
    setShowApiKeyInput(false);
    setApiKeyDraft('');
  };

  if (!chatPanelOpen) return null;

  return (
    <div
      className="w-96 border-l border-gray-200 bg-white flex flex-col shrink-0"
      data-testid="chat-panel"
    >
      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center px-3 gap-2 shrink-0">
        <span className="font-semibold text-sm text-gray-800">AI Assistant</span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="ml-auto text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
          data-testid="model-selector"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <button
          onClick={clearMessages}
          className="text-xs text-gray-500 hover:text-gray-700 px-1"
          title="Clear messages"
          data-testid="clear-chat"
        >
          Clear
        </button>
        <button
          onClick={() => setChatPanelOpen(false)}
          className="text-gray-400 hover:text-gray-600 p-0.5"
          aria-label="Close chat panel"
          data-testid="close-chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* API Key Banner */}
      {!apiKey && (
        <div className="px-3 py-2 bg-yellow-50 border-b border-yellow-200" data-testid="api-key-banner">
          {showApiKeyInput ? (
            <div className="flex gap-1">
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveApiKey()}
                placeholder="sk-or-..."
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
                data-testid="api-key-input"
                autoFocus
              />
              <button
                onClick={saveApiKey}
                className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                data-testid="save-api-key"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="text-xs text-yellow-800 hover:text-yellow-900 underline"
              data-testid="set-api-key-btn"
            >
              Set OpenRouter API key to use AI
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-8">
            Ask me to manage your spreadsheets!
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div
                  className="bg-blue-100 text-gray-800 rounded-lg px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap"
                  data-testid="user-message"
                >
                  {msg.content}
                </div>
              </div>
            )}
            {msg.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="max-w-[95%] text-sm" data-testid="assistant-message">
                  {/* Tool calls */}
                  {msg.toolCalls?.map((tc) => {
                    const result = msg.toolResults?.find(
                      (r) => r.toolCallId === tc.id
                    );
                    return (
                      <ToolCallCard
                        key={tc.id}
                        toolCall={tc}
                        result={result}
                      />
                    );
                  })}
                  {/* Text content */}
                  {msg.content && (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {streaming && msg.id === messages[messages.length - 1]?.id && !msg.content && !msg.toolCalls?.length && (
                    <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse" />
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3" data-testid="chat-input-area">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data..."
            rows={1}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={streaming}
            data-testid="chat-input"
          />
          {streaming ? (
            <button
              onClick={handleStop}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm shrink-0"
              data-testid="stop-btn"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shrink-0"
              data-testid="send-btn"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
