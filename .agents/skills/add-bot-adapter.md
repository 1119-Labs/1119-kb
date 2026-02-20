# Add Bot Adapter

Guide for adding a new platform adapter (Slack, Linear, etc.) to the Savoir bot system.

## Architecture

The bot system uses the [Vercel Chat SDK](https://github.com/vercel-labs/chat) for platform abstraction. Each adapter implements the Chat SDK interface.

## Reference: Existing Adapters

- **Discord**: Uses `@chat-adapter/discord` (official adapter)
- **GitHub**: Uses `SavoirGitHubAdapter` (custom, in `apps/chat/server/utils/bot/`)

The GitHub adapter is a good reference for building custom adapters.

## Steps

### 1. Create the Adapter

Create `apps/chat/server/utils/bot/adapters/my-platform.ts`:

```typescript
import type { Adapter } from 'chat'

export class MyPlatformAdapter implements Adapter {
  name = 'my-platform'

  // Implement required methods:
  // - sendMessage(threadId, message)
  // - editMessage(threadId, messageId, message)
  // - deleteMessage(threadId, messageId)
  // etc.
}
```

See the Chat SDK documentation for the full `Adapter` interface.

### 2. Register the Adapter

In `apps/chat/server/utils/bot/index.ts`, add your adapter to the Chat instance:

```typescript
import { MyPlatformAdapter } from './adapters/my-platform'

// Add to the Chat instance
chat.addAdapter(new MyPlatformAdapter())
```

### 3. Create the Webhook Endpoint

Create `apps/chat/server/api/webhooks/my-platform.post.ts`:

```typescript
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  // Verify webhook signature (platform-specific)
  // Parse the incoming event
  // Forward to the Chat SDK for processing

  return { ok: true }
})
```

### 4. Add Environment Variables

Add platform-specific env vars to:
- `apps/chat/.env.example`
- `docs/ENVIRONMENT.md`
- `apps/chat/nuxt.config.ts` (in `runtimeConfig`)

### 5. Add Documentation

Create `apps/chat/app/content/docs/my-platform-bot.md` following the pattern of `discord-bot.md` or `bot-setup.md`.

## Thread ID Format

Follow the convention: `{platform}:{identifier}:{type}:{id}`

Examples:
- GitHub: `github:owner/repo:issue:123`
- Discord: `discord:guild:channel:thread`
- Your platform: `my-platform:{workspace}:{channel}:{thread}`
