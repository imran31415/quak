import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage, ToolCall, ToolResult } from '@shared/chat';

interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  model: string;
  apiKey: string;

  addMessage: (msg: ChatMessage) => void;
  appendDelta: (content: string) => void;
  addToolCallToLast: (tc: ToolCall) => void;
  addToolResult: (result: ToolResult) => void;
  setStreaming: (v: boolean) => void;
  setModel: (model: string) => void;
  setApiKey: (key: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      streaming: false,
      model: 'anthropic/claude-sonnet-4',
      apiKey: '',

      addMessage: (msg) =>
        set((s) => ({ messages: [...s.messages, msg] })),

      appendDelta: (content) =>
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            msgs[msgs.length - 1] = { ...last, content: last.content + content };
          }
          return { messages: msgs };
        }),

      addToolCallToLast: (tc) =>
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            const toolCalls = [...(last.toolCalls || []), tc];
            msgs[msgs.length - 1] = { ...last, toolCalls };
          }
          return { messages: msgs };
        }),

      addToolResult: (result) =>
        set((s) => {
          const msgs = [...s.messages];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant') {
            const toolResults = [...(last.toolResults || []), result];
            msgs[msgs.length - 1] = { ...last, toolResults };
          }
          return { messages: msgs };
        }),

      setStreaming: (v) => set({ streaming: v }),
      setModel: (model) => set({ model }),
      setApiKey: (key) => set({ apiKey: key }),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'quak-chat-store',
      partialize: (state) => ({
        messages: state.messages,
        model: state.model,
        apiKey: state.apiKey,
      }),
    }
  )
);
