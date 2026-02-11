# Savoir SDK

The `@savoir/sdk` package provides a TypeScript client for interacting with Savoir programmatically.

## Installation

```bash
pnpm add @savoir/sdk
```

## Configuration

```typescript
import { createSavoir } from '@savoir/sdk'

const savoir = createSavoir({
  apiUrl: 'https://savoir.example.com',
  apiKey: 'sk_live_...'
})
```

## AI SDK Tools

The SDK exposes tools compatible with the [AI SDK](https://sdk.vercel.ai). Use them with `generateText` or `streamText` to give any AI model access to your Savoir knowledge base.

```typescript
import { generateText } from 'ai'
import { createSavoir } from '@savoir/sdk'

const savoir = createSavoir({
  apiUrl: 'https://savoir.example.com',
  apiKey: 'sk_live_...'
})

const { text } = await generateText({
  model: yourModel,
  tools: {
    bash: savoir.tools.bash,
    bash_batch: savoir.tools.bash_batch,
  },
  prompt: 'How do I configure authentication?'
})
```

### Available Tools

| Tool | Description |
|------|-------------|
| `bash` | Execute a single query against the knowledge base |
| `bash_batch` | Execute multiple queries in a single request |

## Client Methods

You can also use the client directly for lower-level operations:

```typescript
// List all indexed sources
const sources = await savoir.getSources()

// Get the current agent configuration
const config = await savoir.getAgentConfig()

// Report token usage from an external integration
await savoir.reportUsage({
  source: 'my-bot',
  model: 'openai/gpt-4o',
  inputTokens: 500,
  outputTokens: 200,
  durationMs: 1200
})
```

## Full Example

```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createSavoir } from '@savoir/sdk'

const savoir = createSavoir({
  apiUrl: process.env.SAVOIR_URL!,
  apiKey: process.env.SAVOIR_API_KEY!
})

async function ask(question: string) {
  const { text, usage } = await generateText({
    model: openai('gpt-4o'),
    tools: savoir.tools,
    maxSteps: 5,
    prompt: question
  })

  await savoir.reportUsage({
    source: 'my-app',
    model: 'openai/gpt-4o',
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    durationMs: 0
  })

  return text
}
```
