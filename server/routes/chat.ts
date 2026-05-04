import { Router, type Request, type Response } from 'express';
import { TOOL_DEFINITIONS, type ChatRequest, type ToolResult } from '../../shared/chat.js';
import { executeTool, isClientActionResult } from '../llm/tools.js';
import { streamChat } from '../llm/openrouter.js';
import { buildSystemPrompt } from '../llm/systemPrompt.js';
import {
  HAS_DEFAULT_LLM,
  LLM_DEFAULT_API_KEY,
  LLM_DEFAULT_BASE_URL,
  LLM_DEFAULT_MODEL,
  LLM_OPENROUTER_BASE_URL,
} from '../config.js';
import { logger } from '../logger.js';

const router = Router();

const MOCK_LLM = process.env.MOCK_LLM === 'true';
const MAX_TOOL_ROUNDS = 10;

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`data: ${JSON.stringify({ type: event, data })}\n\n`);
}

// Mock LLM responses for E2E testing
async function handleMockChat(req: Request, res: Response) {
  const { messages } = req.body as ChatRequest;
  const lastMsg = messages[messages.length - 1]?.content || '';

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  // Simulate a delay
  await new Promise((r) => setTimeout(r, 100));

  const context = (req.body as ChatRequest).context;
  const sheetId = context?.activeSheetId || 'unknown';

  if (lastMsg.toLowerCase().includes('add') && lastMsg.toLowerCase().includes('row')) {
    // Mock: tool call to add rows
    const toolCallId = 'mock_tc_1';

    sendSSE(res, 'tool_call_start', { id: toolCallId, name: 'add_rows' });

    const toolArgs = {
      sheetId,
      rows: [
        { Name: 'Mock Task 1', Status: 'Todo' },
        { Name: 'Mock Task 2', Status: 'Done' },
      ],
    };

    // Execute the tool for real
    const result = await executeTool('add_rows', toolArgs);
    const toolResult: ToolResult = {
      toolCallId,
      name: 'add_rows',
      result: result.data,
      error: result.error,
    };

    sendSSE(res, 'tool_result', toolResult);
    sendSSE(res, 'refresh', {});

    // Send follow-up text
    const text = "I've added 2 sample rows to your sheet.";
    for (const char of text) {
      sendSSE(res, 'text_delta', { content: char });
    }
  } else if (lastMsg.toLowerCase().includes('summarize') || lastMsg.toLowerCase().includes('summary')) {
    // Mock: tool call to summarize_data
    const toolCallId = 'mock_tc_summarize';

    sendSSE(res, 'tool_call_start', { id: toolCallId, name: 'summarize_data' });

    const result = await executeTool('summarize_data', { sheetId });
    const toolResult: ToolResult = {
      toolCallId,
      name: 'summarize_data',
      result: result.data,
      error: result.error,
    };

    sendSSE(res, 'tool_result', toolResult);

    const text = "Here's a summary of your data.";
    for (const char of text) {
      sendSSE(res, 'text_delta', { content: char });
    }
  } else if (lastMsg.toLowerCase().includes('sort')) {
    // Mock: tool call to sort_sheet
    const toolCallId = 'mock_tc_sort';

    // Find the first column name from context
    const firstCol = context?.activeSheetMeta?.columns[0]?.name || 'Name';

    sendSSE(res, 'tool_call_start', { id: toolCallId, name: 'sort_sheet' });

    const result = await executeTool('sort_sheet', { sheetId, column: firstCol, direction: 'asc' });
    const toolResult: ToolResult = {
      toolCallId,
      name: 'sort_sheet',
      result: result.data,
      error: result.error,
    };

    sendSSE(res, 'tool_result', toolResult);
    sendSSE(res, 'refresh', {});

    const text = `I've sorted the sheet by ${firstCol} in ascending order.`;
    for (const char of text) {
      sendSSE(res, 'text_delta', { content: char });
    }
  } else {
    // Simple text response
    const text = 'Hello! I can help you manage your spreadsheets. Try asking me to create a sheet or add rows.';
    for (const char of text) {
      sendSSE(res, 'text_delta', { content: char });
    }
  }

  sendSSE(res, 'done', {});
  res.end();
}

// Real LLM chat with agentic loop
async function handleRealChat(req: Request, res: Response) {
  const { messages: userMessages, model, context } = req.body as ChatRequest;
  const userApiKey = (req.headers['x-api-key'] as string) || '';

  // Pick the provider: user-supplied OpenRouter key takes precedence over the
  // server-configured default (e.g. self-hosted Ollama).
  const useOpenRouter = userApiKey.length > 0;
  if (!useOpenRouter && !HAS_DEFAULT_LLM) {
    res.status(503).json({
      error: 'No LLM configured. Set an OpenRouter API key, or configure LLM_DEFAULT_BASE_URL/LLM_DEFAULT_MODEL on the server.',
    });
    return;
  }

  const llmConfig = useOpenRouter
    ? {
        provider: 'openrouter' as const,
        baseUrl: LLM_OPENROUTER_BASE_URL,
        apiKey: userApiKey,
        model,
        extraHeaders: { 'HTTP-Referer': 'https://quak.app' },
      }
    : {
        provider: 'default' as const,
        baseUrl: LLM_DEFAULT_BASE_URL,
        apiKey: LLM_DEFAULT_API_KEY || undefined,
        model: LLM_DEFAULT_MODEL,
        extraHeaders: undefined,
      };

  logger.info({ provider: llmConfig.provider, model: llmConfig.model }, 'chat_request');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  sendSSE(res, 'provider', { provider: llmConfig.provider, model: llmConfig.model });

  try {
    const systemPrompt = buildSystemPrompt(context);

    // Build message history in OpenAI format
    const openAIMessages: {
      role: string;
      content?: string | null;
      tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];
      tool_call_id?: string;
    }[] = [
      { role: 'system', content: systemPrompt },
      ...userMessages.map((m) => ({ role: m.role, content: m.content })),
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      // Accumulate streamed response
      let contentBuffer = '';
      const toolCalls: Map<number, { id: string; name: string; args: string }> = new Map();

      for await (const chunk of streamChat({
        baseUrl: llmConfig.baseUrl,
        apiKey: llmConfig.apiKey,
        model: llmConfig.model,
        messages: openAIMessages,
        extraHeaders: llmConfig.extraHeaders,
      })) {
        if (chunk.type === 'content') {
          contentBuffer += chunk.delta;
          sendSSE(res, 'text_delta', { content: chunk.delta });
        } else if (chunk.type === 'tool_call') {
          const existing = toolCalls.get(chunk.index);
          if (existing) {
            existing.args += chunk.argsDelta;
          } else {
            toolCalls.set(chunk.index, {
              id: chunk.id || `tc_${round}_${chunk.index}`,
              name: chunk.name || '',
              args: chunk.argsDelta,
            });
            if (chunk.id && chunk.name) {
              sendSSE(res, 'tool_call_start', { id: chunk.id, name: chunk.name });
            }
          }
        }
      }

      // If no tool calls, we're done
      if (toolCalls.size === 0) break;

      // Build the assistant message with tool calls
      const assistantToolCalls = Array.from(toolCalls.values()).map((tc) => ({
        id: tc.id,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args },
      }));

      openAIMessages.push({
        role: 'assistant',
        content: contentBuffer || null,
        tool_calls: assistantToolCalls,
      });

      // Execute each tool call
      let anyServerMutates = false;
      for (const tc of toolCalls.values()) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.args);
        } catch {
          // If args can't be parsed, pass empty
        }

        // Stream parsed args to the client so the chat UI can show them
        sendSSE(res, 'tool_call_args', { id: tc.id, arguments: parsedArgs });

        const result = await executeTool(tc.name, parsedArgs);

        // Unwrap client-action results: emit a client_action SSE event and
        // strip the marker before sending to client / LLM.
        let visibleResult: unknown = result.data;
        if (!result.error && isClientActionResult(result.data)) {
          sendSSE(res, 'client_action', result.data.__clientAction);
          visibleResult = result.data.result;
        }

        const toolResult: ToolResult = {
          toolCallId: tc.id,
          name: tc.name,
          result: visibleResult,
          error: result.error,
        };
        sendSSE(res, 'tool_result', toolResult);

        const def = TOOL_DEFINITIONS.find((d) => d.name === tc.name);
        // A server-side data mutation requires a sheet refresh; client-action
        // tools modify only client state and do not.
        if (def?.mutates && !def?.clientAction) anyServerMutates = true;

        // Append tool result message for next round
        openAIMessages.push({
          role: 'tool',
          content: JSON.stringify(visibleResult ?? { error: result.error }),
          tool_call_id: tc.id,
        });
      }

      if (anyServerMutates) {
        sendSSE(res, 'refresh', {});
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendSSE(res, 'error', { message });
  }

  sendSSE(res, 'done', {});
  res.end();
}

router.post('/api/chat', (req: Request, res: Response) => {
  if (MOCK_LLM) {
    handleMockChat(req, res);
  } else {
    handleRealChat(req, res);
  }
});

export default router;
