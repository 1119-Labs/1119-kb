---
name: add-tool
description: Adds a new AI SDK tool to @savoir/agent with generator pattern and status yields. Use when adding a new tool, AI SDK tool, or agent tool.
---

# Add AI Tool

Guide for adding a new AI SDK tool to the `@savoir/agent` package.

## Steps

### 1. Create the Tool

Create `packages/agent/src/tools/my-tool.ts`.

Tools **must use `async function*` (generator)** and yield status updates so the frontend can display loading state and results automatically.

```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const myTool = tool({
  description: 'Clear description of what this tool does — the AI model reads this to decide when to use it',
  inputSchema: z.object({
    query: z.string().describe('What the parameter is for'),
  }),
  execute: async function* ({ query }) {
    yield { status: 'loading' as const }
    const start = Date.now()

    try {
      const result = await doSomething(query)
      yield {
        status: 'done' as const,
        durationMs: Date.now() - start,
        text: result,
        commands: [
          {
            title: `My tool: "${query}"`,
            command: '',
            stdout: result,
            stderr: '',
            exitCode: 0,
            success: true,
          },
        ],
      }
    } catch (error) {
      yield {
        status: 'done' as const,
        durationMs: Date.now() - start,
        text: '',
        commands: [
          {
            title: `My tool: "${query}"`,
            command: '',
            stdout: '',
            stderr: error instanceof Error ? error.message : 'Failed',
            exitCode: 1,
            success: false,
          },
        ],
      }
    }
  },
})
```

**Yield rules**: Yield `{ status: 'loading' }` first; yield `{ status: 'done', ... }` last. The `commands` array format matches the sandbox bash tool so the UI renders consistently. See `packages/agent/src/tools/web-search.ts` for a full example.

### 2. Export the Tool

In `packages/agent/src/index.ts` add:

```typescript
export { myTool } from './tools/my-tool'
```

### 3. Register in the Agent

In the agent creation (e.g. `apps/app/server/utils/chat/`), add the tool to the tools object:

```typescript
import { myTool } from '@savoir/agent'

const tools = {
  ...savoir.tools,
  my_tool: myTool,
}
```

### 4. Update Prompts (optional)

If the tool needs specific instructions, update the relevant prompt in `packages/agent/src/prompts/` (e.g. chat.ts or bot.ts) in the Available Tools section.

## Existing Tools

| Tool | File | Description |
|------|------|-------------|
| `webSearchTool` | `tools/web-search.ts` | Web search for information not in the sandbox |
| `bash` | `@savoir/sdk` | Execute bash commands in the sandbox |
| `bash_batch` | `@savoir/sdk` | Execute multiple bash commands |
