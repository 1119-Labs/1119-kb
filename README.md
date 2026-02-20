<p align="center">
  <br>
  <b>Savoir</b>
  <br>
  <i>Build AI agents with real-time knowledge access.</i>
  <br>
  <br>
</p>

<p align="center">
  <a href="https://github.com/vercel-labs/savoir/actions/workflows/ci.yml"><img src="https://github.com/vercel-labs/savoir/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <a href="https://github.com/vercel-labs/savoir/actions/workflows/build.yml"><img src="https://github.com/vercel-labs/savoir/actions/workflows/build.yml/badge.svg" alt="Build"></a>
  <a href="https://www.npmjs.com/package/@savoir/sdk"><img src="https://img.shields.io/npm/v/@savoir/sdk?color=0284c7&label=@savoir/sdk" alt="npm @savoir/sdk"></a>
  <a href="https://www.npmjs.com/package/@savoir/agent"><img src="https://img.shields.io/npm/v/@savoir/agent?color=0284c7&label=@savoir/agent" alt="npm @savoir/agent"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/vercel-labs/savoir?color=0284c7" alt="License"></a>
  <a href="https://github.com/vercel-labs/savoir/stargazers"><img src="https://img.shields.io/github/stars/vercel-labs/savoir?style=flat&color=0284c7" alt="GitHub Stars"></a>
</p>

<p align="center">
  <b>Template.</b> Fork it, customize it, and deploy your own AI documentation assistant.
</p>

---

Savoir provides the infrastructure to create file-based AI agents (chatbots, Discord bots, GitHub bots, etc.) that can search and read from frequently updated knowledge bases. It combines a unified [Nuxt](https://nuxt.com) application for the chat interface and API with an SDK that provides [AI SDK](https://ai-sdk.dev)-compatible tools.

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
│              AI SDK compatible tools (bash, bash_batch)          │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ API calls
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         apps/chat                                │
│                    (Unified Nuxt Application)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │   Sandbox   │  │   Content    │  │   Vercel Workflows     │  │
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
| [`@savoir/sdk`](./packages/sdk) | [AI SDK](https://ai-sdk.dev) compatible tools for agents |
| [`@savoir/agent`](./packages/agent) | Agent core: router, prompts, tools, types |
| [`apps/chat`](./apps/chat) | Unified [Nuxt](https://nuxt.com) app (chat UI + API + bots) |

## Quick Start

### Using the SDK

```typescript
import { generateText } from 'ai'
import { createSavoir } from '@savoir/sdk'

const savoir = createSavoir({
  apiUrl: process.env.SAVOIR_API_URL!,
  apiKey: process.env.SAVOIR_API_KEY,
})

const { text } = await generateText({
  model: yourModel, // any AI SDK compatible model
  tools: savoir.tools, // bash and bash_batch tools
  maxSteps: 10,
  prompt: 'How do I configure authentication?',
})

console.log(text)
```

### Self-hosting

```bash
# Clone the repository
git clone https://github.com/vercel-labs/savoir.git
cd savoir

# Install dependencies
bun install

# Configure environment variables
cp apps/chat/.env.example apps/chat/.env
# Edit .env with your configuration

# Start the app
bun run dev
```

**Required environment variables:**

```bash
# Authentication
BETTER_AUTH_SECRET=your-secret        # Secret for signing sessions/tokens
GITHUB_CLIENT_ID=...                  # GitHub OAuth app client ID
GITHUB_CLIENT_SECRET=...              # GitHub OAuth app client secret

# AI
AI_GATEWAY_API_KEY=...                # Vercel AI Gateway API key

# Admin
NUXT_ADMIN_USERS=user1,user2          # Comma-separated admin emails/usernames

# Sandbox
NUXT_GITHUB_TOKEN=ghp_...             # GitHub token for repo access
NUXT_GITHUB_SNAPSHOT_REPO=org/repo    # Snapshot repository (owner/repo)

# Site
NUXT_PUBLIC_SITE_URL=https://...      # Public URL of your instance
```

See [ENVIRONMENT.md](./docs/ENVIRONMENT.md) for the full list of environment variables.

## Customization

Savoir is designed as a **reusable template**. See the [Customization Guide](./docs/CUSTOMIZATION.md) for how to:

- Rename your instance (name, icon, description)
- Add documentation sources (GitHub repos, YouTube channels)
- Add custom AI tools
- Add bot adapters (Slack, Linear, etc.)
- Customize AI prompts
- Theme the UI
- Deploy to production

## Configuration

Sources are managed through the **admin interface** at `/admin`. You can add GitHub repositories and YouTube channels as knowledge sources, then trigger a sync from the UI.

Sources can also be listed programmatically via the SDK (`savoir.client.getSources()`).

See [SOURCES.md](./docs/SOURCES.md) for detailed source configuration options.

## How It Works

1. **Sources in Database**: Sources are stored in SQLite via [NuxtHub](https://hub.nuxt.com), managed through the admin interface
2. **Content Aggregation**: Sources (GitHub docs, YouTube transcripts, etc.) are synced to a snapshot repository via [Vercel Workflow](https://useworkflow.dev)
3. **Sandbox Creation**: When an agent needs to search, the API creates/recovers a [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) with the snapshot repo cloned
4. **File-based Search**: The SDK `bash` and `bash_batch` tools execute grep/find/cat commands in the sandbox to search and read content
5. **AI Integration**: Tools are compatible with the [Vercel AI SDK](https://ai-sdk.dev) for seamless integration with any LLM

## Bots

Savoir includes built-in bot integrations powered by the [Vercel Chat SDK](https://github.com/vercel-labs/chat):

- **GitHub Bot**: Responds to mentions in GitHub issues and PRs. Uses a [GitHub App](https://docs.github.com/en/apps) for authentication and webhooks.
- **Discord Bot**: Responds to mentions and continues conversations in threads. Uses the [Discord API](https://discord.com/developers/docs).

Both bots use the same AI agent and knowledge base as the chat interface.

## Development

```bash
# Install dependencies
bun install

# Start the app in dev mode
bun run dev

# Build all packages
bun run build

# Run tests
bun run test

# Lint and fix
bun run lint:fix
```

## Built With

- [Nuxt](https://nuxt.com) - Full-stack Vue framework
- [NuxtHub](https://hub.nuxt.com) - Database, KV, and blob storage
- [Vercel AI SDK](https://ai-sdk.dev) - AI model integration and tool system
- [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox) - Isolated execution environment
- [Vercel Workflow](https://useworkflow.dev) - Durable workflow execution
- [Better Auth](https://www.better-auth.com) - Authentication framework
- [Drizzle ORM](https://orm.drizzle.team) - Type-safe database queries
- [Vercel Chat SDK](https://github.com/vercel-labs/chat) - Bot framework for GitHub and Discord

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to get involved.

## License

[MIT](./LICENSE)
