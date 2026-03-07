import type { ChatRequest, ToolResult } from '@shared/chat';

interface ChatCallbacks {
  onTextDelta: (content: string) => void;
  onToolCallStart: (id: string, name: string) => void;
  onToolResult: (result: ToolResult) => void;
  onRefresh: () => void;
  onError: (msg: string) => void;
  onDone: () => void;
}

export function sendChat(
  request: ChatRequest,
  apiKey: string,
  callbacks: ChatCallbacks
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        callbacks.onError(body.error || `HTTP ${res.status}`);
        callbacks.onDone();
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError('No response body');
        callbacks.onDone();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          try {
            const event = JSON.parse(trimmed.slice(6));
            switch (event.type) {
              case 'text_delta':
                callbacks.onTextDelta(event.data.content);
                break;
              case 'tool_call_start':
                callbacks.onToolCallStart(event.data.id, event.data.name);
                break;
              case 'tool_result':
                callbacks.onToolResult(event.data);
                break;
              case 'refresh':
                callbacks.onRefresh();
                break;
              case 'error':
                callbacks.onError(event.data.message);
                break;
              case 'done':
                callbacks.onDone();
                return;
            }
          } catch {
            // skip unparseable
          }
        }
      }

      callbacks.onDone();
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError((err as Error).message);
      }
      callbacks.onDone();
    }
  })();

  return controller;
}
