# Savoir

Build AI agents with real-time knowledge access.

Savoir provides the infrastructure to create file-based AI agents (chatbots, Discord bots, GitHub bots, etc.) that can search and read from frequently updated knowledge bases. It combines a self-hostable API for sandbox management with an SDK that provides AI SDK-compatible tools.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your AI Application                       │
│                     (Discord bot, GitHub bot, etc.)              │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          @savoir/sdk                             │
│              AI SDK compatible tools (searchAndRead, etc.)       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ API calls
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Savoir API                              │
│                    (Self-hostable Nitro server)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Sandbox   │  │   Content    │  │      Nitro Tasks       │  │
│  │   Manager   │  │     Sync     │  │   (scheduled sync)     │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────────┘  │
└─────────┼────────────────┼──────────────────────────────────────┘
          │                │
          ▼                ▼
   ┌────────────┐   ┌─────────────┐
   │   Vercel   │   │   GitHub    │
   │   Sandbox  │   │  Snapshot   │
   │            │   │    Repo     │
   └────────────┘   └─────────────┘
```

## Packages

| Package | Description |
|---------|-------------|
| [`@savoir/sdk`](./packages/sdk) | AI SDK compatible tools for agents |
| [`@savoir/config`](./packages/config) | Configuration management with multi-format support |
| [`apps/api`](./apps/api) | Self-hostable sandbox management API |

## Quick Start

### Using the SDK

```typescript
import { generateText, stepCountIs } from 'ai'
import { createSavoir } from '@savoir/sdk'

// Initialize Savoir client
const savoir = createSavoir({
  apiKey: process.env.SAVOIR_API_KEY,
  apiUrl: process.env.SAVOIR_API_URL || 'https://savoir.example.com'
})

// Use with AI SDK
const { text } = await generateText({
  model: 'google/gemini-3-flash',
  prompt: 'Tell me the latest developments in Nuxt',
  tools: {
    ...savoir.tools,
  }
})

console.log(text)
```

### Self-hosting the API

```bash
# Clone the repository
git clone https://github.com/HugoRCD/savoir.git
cd savoir

# Install dependencies
pnpm install

# Configure environment variables
cp apps/api/.env.example apps/api/.env
# Edit .env with your configuration

# Start the API
pnpm dev:api
```

**Required environment variables:**

```bash
# GitHub token for cloning snapshot repository
GITHUB_TOKEN=ghp_...

# Repository containing the content snapshot
GITHUB_SNAPSHOT_REPO=your-org/your-content-repo

# Optional: API key for securing endpoints
SAVOIR_SECRET_KEY=your-secret-key
```

## Configuration

Sources are configured in `savoir.config.ts` at the project root:

```typescript
import { defineConfig } from '@savoir/config'

export default defineConfig({
  sources: {
    github: [
      { id: 'nuxt', repo: 'nuxt/nuxt', contentPath: 'docs' },
      { id: 'nitro', repo: 'nitrojs/nitro', branch: 'v3' },
    ],
    youtube: [
      { id: 'alex-lichter', channelId: 'UCqFPgMzGbLjd-MX-h3Z5aQA' },
    ],
  },
})
```

Supported formats: `.ts`, `.js`, `.json`, `.yaml`

See [SOURCES.md](./docs/SOURCES.md) for detailed source configuration options.

## How It Works

1. **Content Aggregation**: Sources (GitHub docs, YouTube transcripts, etc.) are synced to a snapshot repository via Vercel Workflow
2. **Sandbox Creation**: When an agent needs to search, the API creates/recovers a Vercel Sandbox with the snapshot repo cloned
3. **File-based Search**: The SDK tools execute grep/find commands in the sandbox to search and read content
4. **AI Integration**: Tools are compatible with the Vercel AI SDK for seamless integration with any LLM

## Development

```bash
# Install dependencies
pnpm install

# Start all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint and fix
pnpm lint:fix
```

## Related Projects

- [Vercel AI SDK](https://ai-sdk.dev) - The AI SDK that Savoir integrates with
- [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) - Sandboxed execution environment
- [Nitro](https://v3.nitro.build) - The server framework powering the API

## License

[MIT](./LICENSE)
