---
name: add-bot-adapter
description: Adds a new platform adapter (e.g. Slack, Linear) to the bot system. Use when adding a bot adapter, new platform, Slack, Discord, or webhook adapter.
---

# Add Bot Adapter

Guide for adding a new platform adapter to the bot system. The bot system uses the [Vercel Chat SDK](https://github.com/vercel-labs/chat); each adapter implements the Chat SDK interface.

**Reference adapters**: Discord uses `@chat-adapter/discord`; GitHub uses `SavoirGitHubAdapter` in `apps/app/server/utils/bot/`. The GitHub adapter is a good reference for custom adapters.

## Steps

### 1. Create the Adapter

Create `apps/app/server/utils/bot/adapters/my-platform.ts`:

```typescript
import type { Adapter } from 'chat'

export class MyPlatformAdapter implements Adapter {
  name = 'my-platform'

  // Implement required methods: sendMessage, editMessage, deleteMessage, etc.
}
```

See the Chat SDK documentation for the full `Adapter` interface.

### 2. Register the Adapter

In `apps/app/server/utils/bot/index.ts`, add your adapter to the Chat instance:

```typescript
import { MyPlatformAdapter } from './adapters/my-platform'
chat.addAdapter(new MyPlatformAdapter())
```

### 3. Create the Webhook Endpoint

Create `apps/app/server/api/webhooks/my-platform.post.ts`:

- Verify webhook signature (platform-specific)
- Parse the incoming event and forward to the Chat SDK for processing
- Return `{ ok: true }`

### 4. Add Environment Variables

Add platform-specific env vars to: `apps/app/.env.example`, `docs/ENVIRONMENT.md`, and `apps/app/nuxt.config.ts` (in `runtimeConfig`).

### 5. Add Documentation

Create `apps/app/app/content/docs/my-platform-bot.md` following the pattern of `discord-bot.md` or `bot-setup.md`.

## Thread ID Format

Use: `{platform}:{identifier}:{type}:{id}`

Examples: GitHub `github:owner/repo:issue:123`, Discord `discord:guild:channel:thread`, your platform `my-platform:{workspace}:{channel}:{thread}`.
