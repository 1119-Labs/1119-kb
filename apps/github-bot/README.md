# GitHub Bot Example

Example bot demonstrating how to integrate [chat-sdk](https://github.com/example/chat-sdk) with the Savoir AI platform to build an intelligent documentation assistant.

## What This Example Demonstrates

1. **Custom Platform Adapter** - How to implement chat-sdk's `Adapter` interface for a new platform (GitHub)
2. **StateAdapter with NuxtHub KV** - Persistent state management without Redis
3. **AI Integration** - Calling the Savoir API for documentation search
4. **Webhook Security** - GitHub signature verification using HMAC-SHA256

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment file and configure
cp .env.example .env

# Start the dev server (runs on port 3001)
bun run dev

# Expose via ngrok for testing with GitHub webhooks
ngrok http 3001
```

## Configuration

Create a `.env` file with:

```bash
# GitHub App/Webhook credentials
NUXT_GITHUB_WEBHOOK_SECRET=your_webhook_secret
NUXT_GITHUB_TOKEN=ghp_xxx  # or use GitHub App installation token

# Savoir API (the main chat app)
NUXT_SAVOIR_API_URL=http://localhost:3000
NUXT_SAVOIR_API_KEY=your_api_key

# Bot trigger (public)
NUXT_PUBLIC_BOT_TRIGGER=@your-bot-name
```

## GitHub Setup

1. **Create a GitHub App** (or configure repository webhooks directly)
   - Go to Settings → Developer settings → GitHub Apps → New GitHub App

2. **Configure Webhook**
   - Webhook URL: `https://your-domain.com/api/webhook`
   - Webhook Secret: Generate a random string
   - Events: Subscribe to "Issue comments"

3. **Permissions**
   - Issues: Read & Write
   - Pull requests: Read & Write (if you want PR comment support)

4. **Install the App**
   - Install on your target repositories

## Project Structure

```
apps/github-bot/
├── nuxt.config.ts              # Nuxt configuration with NuxtHub KV
├── package.json                # Dependencies including chat-sdk
├── .env.example                # Environment variables template
└── server/
    ├── api/
    │   └── webhook.post.ts     # GitHub webhook endpoint
    └── utils/
        ├── adapter.ts          # GitHubAdapter - platform adapter
        ├── state-kv.ts         # KVStateAdapter - state management
        ├── markdown.ts         # GitHub Flavored Markdown converter
        ├── chat.ts             # Chat instance & message handlers
        └── ai.ts               # AI response generation
```

## How It Works

```
GitHub Issue Comment
        ↓
    Webhook POST
        ↓
  Signature Verification
        ↓
    GitHubAdapter
        ↓
  Chat.processMessage()
        ↓
   onNewMention Handler
        ↓
  Savoir API Search
        ↓
   Post Response
```

1. User mentions `@bot-name` in an issue comment
2. GitHub sends a webhook to `/api/webhook`
3. `GitHubAdapter` verifies the signature and parses the payload
4. The `Chat` instance routes to the `onNewMention` handler
5. Handler searches docs via Savoir API and posts a response

## Creating Your Own Bot

Use this example as a template:

### 1. Copy This Folder

```bash
cp -r apps/github-bot apps/my-new-bot
```

### 2. Create Your Platform Adapter

Implement the `Adapter` interface from chat-sdk:

```typescript
// server/utils/adapter.ts
export class MyAdapter implements Adapter<MyThreadId, MyRawMessage> {
  readonly name = 'myplatform'
  
  async handleWebhook(request: Request): Promise<Response> {
    // Verify signature, parse payload, call chat.processMessage()
  }
  
  async postMessage(threadId: string, message): Promise<RawMessage> {
    // Post message to your platform
  }
  
  // ... implement other required methods
}
```

### 3. Configure Message Handlers

```typescript
// server/utils/chat.ts
chat.onNewMention(async (thread, message) => {
  // React to @mentions
  const response = await generateResponse(message.text)
  await thread.post({ markdown: response })
})

chat.onSubscribedMessage(async (thread, message) => {
  // Handle follow-up messages in subscribed threads
})
```

### 4. Deploy

The bot can be deployed anywhere that supports Nuxt/Nitro:
- Cloudflare Workers (with KV)
- Vercel
- Railway
- Self-hosted

## Key Concepts

### Thread IDs

chat-sdk uses a standard format for thread IDs: `{adapter}:{channel}:{thread}`

For GitHub: `github:{owner}/{repo}:issue:{number}`

Example: `github:nuxt/nuxt:issue:12345`

### StateAdapter

The `KVStateAdapter` demonstrates how to implement persistent state:
- **Subscriptions**: Track which threads the bot is watching
- **Locks**: Prevent concurrent processing of the same thread
- **Cache**: Store temporary data with TTL

### Message Handlers

- `onNewMention`: Called when bot is @mentioned in an unsubscribed thread
- `onSubscribedMessage`: Called for any message in a subscribed thread
- `onReaction`: Handle emoji reactions
- `onAction`: Handle button clicks (cards)

## Extending the Bot

### Add AI-Powered Responses

Replace the simple search with AI SDK:

```typescript
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const response = await generateText({
  model: openai('gpt-4'),
  system: 'You are a helpful documentation assistant...',
  prompt: message.text,
  tools: {
    searchDocs: savoir.tools.searchAndRead,
  },
})
```

### Support More Events

Extend the adapter to handle:
- `pull_request_review_comment` - PR review comments
- `discussion_comment` - GitHub Discussions
- `issues` - Issue opened/closed events

### Add Subscription Mode

Enable follow-up conversations:

```typescript
chat.onNewMention(async (thread, message) => {
  await thread.subscribe() // Watch this thread
  await thread.post('I\'ll continue helping in this thread!')
})

chat.onSubscribedMessage(async (thread, message) => {
  // Handle follow-up questions
})
```

## License

MIT
