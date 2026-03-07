import { TOOL_DEFINITIONS, type ToolDefinition } from '../../shared/chat.js';

export type StreamChunk =
  | { type: 'content'; delta: string }
  | { type: 'tool_call'; index: number; id?: string; name?: string; argsDelta: string }
  | { type: 'done' };

interface OpenAIMessage {
  role: string;
  content?: string | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

function toolDefToOpenAI(def: ToolDefinition) {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, param] of Object.entries(def.parameters)) {
    if (param.type === 'array') {
      properties[key] = { type: 'array', description: param.description, items: {} };
    } else {
      properties[key] = { type: param.type, description: param.description };
    }
    if (param.required) required.push(key);
  }

  return {
    type: 'function' as const,
    function: {
      name: def.name,
      description: def.description,
      parameters: {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      },
    },
  };
}

export function getOpenAITools() {
  return TOOL_DEFINITIONS.map(toolDefToOpenAI);
}

export async function* streamChat(
  apiKey: string,
  model: string,
  messages: OpenAIMessage[],
): AsyncGenerator<StreamChunk> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://quak.app',
    },
    body: JSON.stringify({
      model,
      messages,
      tools: getOpenAITools(),
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

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
      const data = trimmed.slice(6);
      if (data === '[DONE]') {
        yield { type: 'done' };
        return;
      }

      try {
        const parsed = JSON.parse(data);
        const choice = parsed.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (!delta) continue;

        if (delta.content) {
          yield { type: 'content', delta: delta.content };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            yield {
              type: 'tool_call',
              index: tc.index,
              id: tc.id,
              name: tc.function?.name,
              argsDelta: tc.function?.arguments || '',
            };
          }
        }
      } catch {
        // skip unparseable lines
      }
    }
  }

  yield { type: 'done' };
}
