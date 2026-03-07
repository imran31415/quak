# AI Chat Assistant

Quak includes a built-in AI chat assistant that lets you manage your spreadsheets using natural language. Instead of clicking through the UI, just say what you want: "create a Tasks sheet with Name and Status columns and add 5 sample rows."

## Opening the Chat Panel

Click the purple **AI** button in the top-right corner of the header (next to the SQL button). A chat panel slides in from the right side.

## Setting Up

The AI assistant uses [OpenRouter](https://openrouter.ai) to connect to various LLM providers. You'll need an OpenRouter API key:

1. Sign up at [openrouter.ai](https://openrouter.ai) and create an API key
2. Click the **AI** button to open the chat panel
3. Click "Set OpenRouter API key to use AI" and paste your key
4. Your key is saved in your browser's local storage

## Supported Models

Select a model from the dropdown in the chat panel header:

| Model | Best For |
|-------|----------|
| Claude Sonnet (default) | Best overall quality and tool use |
| GPT-4o | Strong general-purpose model |
| GPT-4o Mini | Fast, cost-effective for simple tasks |
| Gemini Flash | Very fast responses |
| Llama 3.3 70B | Open-source alternative |

## What You Can Do

The assistant has access to 11 tools that cover all spreadsheet operations:

### Sheet Management
- **"List all my sheets"** — see all sheets with their columns
- **"Create a sheet called Projects with Name, Status, and Due Date columns"** — creates with proper column types
- **"Delete the old test sheet"** — removes a sheet and its data

### Data Operations
- **"Add 5 sample tasks"** — inserts rows with realistic data
- **"Update row 3's Status to Done"** — modifies specific cells
- **"Delete all completed rows"** — removes rows matching criteria

### Column Operations
- **"Add a Priority column with type dropdown"** — adds columns with correct types
- **"Rename the Name column to Task Name"** — renames columns
- **"Delete the Notes column"** — removes columns

### SQL Queries
- **"How many tasks are marked as Done?"** — runs read-only SQL
- **"Show me the average budget by category"** — complex aggregations

## How It Works

The chat assistant uses an **agentic loop** with tool calling:

1. You send a message describing what you want
2. The LLM receives your message along with context about your current sheet
3. The LLM decides which tools to call (if any) and executes them
4. Tool results are shown as collapsible cards in the chat
5. The LLM summarizes what it did
6. If the tool modified data, the spreadsheet grid automatically refreshes

The agentic loop supports up to 10 consecutive tool calls per message, allowing complex multi-step operations.

## Tool Call Cards

When the assistant uses a tool, you'll see a collapsible card showing:
- **Tool name** (e.g., `add_rows`, `create_sheet`)
- **Status** — "running...", "done", or "error"
- Click to expand and see the **arguments** and **result** JSON

## Auto-Context

The assistant automatically knows about:
- All your sheets (names and IDs)
- The currently active sheet's columns and types
- This context is sent with every message so the AI can reference your data accurately

## Architecture

All LLM communication happens server-side:
- API keys are sent via HTTP header (not stored on the server)
- The server uses Server-Sent Events (SSE) for streaming responses
- Tool execution runs directly against DuckDB (no HTTP round-trips)
- Responses stream in real-time as the LLM generates them

<img src="/screenshots/ai-chat.png" alt="AI Chat Assistant panel" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

*AI Chat panel with a tool call card showing the add_rows operation*
