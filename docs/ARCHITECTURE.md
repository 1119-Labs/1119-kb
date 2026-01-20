# Savoir Architecture

This document describes the technical architecture of Savoir, a platform for building AI agents with real-time knowledge access.

## System Overview

Savoir consists of two main components:

1. **Savoir API** (`apps/api`): A Nitro-based server that manages Vercel Sandboxes and content synchronization
2. **Savoir SDK** (`packages/sdk`): A client library providing AI SDK-compatible tools

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          User's AI Application                           │
│                    (Discord bot, GitHub bot, Chat app)                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  import { generateText } from 'ai'                                 │  │
│  │  import { createSavoir } from '@savoir/sdk'                        │  │
│  │                                                                    │  │
│  │  const savoir = createSavoir({ apiKey, apiUrl })                   │  │
│  │  const { text } = await generateText({                             │  │
│  │    model: 'google/gemini-3-flash',                               │  │
│  │    tools: { ...savoir.tools }                                      │  │
│  │  })                                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      │ HTTPS (API Key auth)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Savoir API                                    │
│                         (Nitro Server)                                   │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ /api/sandbox/*  │  │  /api/sync/*    │  │    Nitro Tasks          │  │
│  │                 │  │                 │  │                         │  │
│  │ - create        │  │ - POST /sync    │  │ - sync:content (cron)   │  │
│  │ - search        │  │ - GET /sources  │  │ - cleanup:sandboxes     │  │
│  │ - read          │  │                 │  │                         │  │
│  │ - searchAndRead │  │                 │  │                         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────┘  │
│           │                    │                                         │
│           ▼                    ▼                                         │
│  ┌─────────────────┐  ┌─────────────────┐                               │
│  │ Sandbox Manager │  │  Content Syncer │                               │
│  │                 │  │                 │                               │
│  │ - Lifecycle     │  │ - Fetch sources │                               │
│  │ - KV caching    │  │ - Transform     │                               │
│  │ - Command exec  │  │ - Push to repo  │                               │
│  └────────┬────────┘  └────────┬────────┘                               │
└───────────┼────────────────────┼────────────────────────────────────────┘
            │                    │
            ▼                    ▼
     ┌────────────┐       ┌────────────┐
     │   Vercel   │       │   GitHub   │
     │   Sandbox  │◄──────│  Snapshot  │
     │   API      │ clone │   Repo     │
     └────────────┘       └────────────┘
```

## Component Details

### 1. SDK (`@savoir/sdk`)

The SDK provides AI SDK-compatible tools that communicate with the Savoir API.

#### Module Structure

```
packages/sdk/
├── src/
│   ├── index.ts           # Main export: createSavoir()
│   ├── client.ts          # HTTP client for API communication
│   ├── types.ts           # TypeScript interfaces
│   └── tools/
│       ├── search.ts      # search tool definition
│       ├── read.ts        # read tool definition
│       └── search-and-read.ts  # combined tool
├── package.json
└── tsconfig.json
```

#### API Design

```typescript
// packages/sdk/src/index.ts
import { tool } from 'ai'
import { z } from 'zod'

export interface SavoirOptions {
  apiKey: string
  apiUrl: string
  /** Optional: reuse sandbox across calls */
  chatId?: string
}

export interface SavoirClient {
  /** Search and read files in one call (recommended) */
  searchAndRead: ReturnType<typeof tool>
  /** Search for files matching query */
  search: ReturnType<typeof tool>
  /** Read specific files by path */
  read: ReturnType<typeof tool>
}

export function createSavoir(options: SavoirOptions): SavoirClient {
  const client = createApiClient(options)

  return {
    searchAndRead: tool({
      description: 'Search documentation and read matching files. Use ONE simple keyword.',
      inputSchema: z.object({
        query: z.string().describe('ONE keyword to search'),
        limit: z.number().optional().describe('Max files (default 5)'),
      }),
      execute: async ({ query, limit }) => {
        return client.searchAndRead(query, limit)
      },
    }),

    search: tool({
      description: 'Search for file paths. Use searchAndRead for most cases.',
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().optional(),
      }),
      execute: async ({ query, limit }) => {
        return client.search(query, limit)
      },
    }),

    read: tool({
      description: 'Read specific files by path.',
      inputSchema: z.object({
        paths: z.array(z.string()),
      }),
      execute: async ({ paths }) => {
        return client.read(paths)
      },
    }),
  }
}
```

### 2. API (`apps/api`)

A Nitro server providing REST endpoints for sandbox management and content synchronization.

#### Module Structure

```
apps/api/
├── server/
│   ├── api/
│   │   ├── sandbox/
│   │   │   ├── create.post.ts
│   │   │   ├── [id]/
│   │   │   │   ├── search.post.ts
│   │   │   │   ├── read.post.ts
│   │   │   │   └── search-and-read.post.ts
│   │   └── sync/
│   │       ├── index.post.ts
│   │       └── [source].post.ts
│   ├── tasks/
│   │   ├── sync-content.ts      # Scheduled content sync
│   │   └── cleanup-sandboxes.ts # Cleanup stale sandboxes
│   ├── middleware/
│   │   └── auth.ts              # API key validation
│   └── utils/
│       ├── sandbox.ts           # Sandbox manager
│       ├── content-sync.ts      # Content synchronization
│       └── sources.ts           # Source configuration
├── nitro.config.ts
└── package.json
```

### 3. Sandbox Manager

Manages the lifecycle of Vercel Sandboxes.

#### Lifecycle States

```
┌─────────┐     create      ┌─────────┐
│  None   │ ───────────────▶│ Running │
└─────────┘                 └────┬────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
       ┌────────────┐     ┌───────────┐     ┌───────────┐
       │  Timeout   │     │  Stopped  │     │  Failed   │
       │  Extended  │     │           │     │           │
       └────────────┘     └───────────┘     └───────────┘
              │                  │
              │                  │ recover
              │                  ▼
              │           ┌───────────┐
              └──────────▶│  Reused   │
                          └───────────┘
```

#### Key Functions

```typescript
// apps/api/server/utils/sandbox.ts

interface SandboxRecord {
  sandboxId: string
  createdAt: number
  fileTree?: string
}

// Get or create sandbox for a chat session
export async function getSandbox(
  chatId: string,
  log: LogFn
): Promise<SandboxContext>

// Recover existing sandbox from KV
async function recoverSandbox(
  record: SandboxRecord,
  log: LogFn
): Promise<Sandbox | null>

// Create new sandbox with cloned repo
async function createNewSandbox(log: LogFn): Promise<Sandbox>

// Execute search with ranking
async function searchWithRanking(
  sandbox: Sandbox,
  query: string,
  limit: number
): Promise<string[]>

// Batch read multiple files efficiently
async function batchReadFiles(
  sandbox: Sandbox,
  paths: string[]
): Promise<Array<{ path: string; content: string }>>
```

### 4. Content Sync

Synchronizes content from various sources to a GitHub snapshot repository.

#### Sync Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Nitro Task: sync:content                      │
│                           (runs on schedule or trigger)                 │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                            Load Source Config                           │
│                         (from sources.ts or API)                        │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
       ┌────────────┐         ┌────────────┐         ┌────────────┐
       │   GitHub   │         │  YouTube   │         │   Other    │
       │   Fetcher  │         │  Fetcher   │         │  Fetchers  │
       └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
             │                      │                      │
             ▼                      ▼                      ▼
       ┌────────────┐         ┌────────────┐         ┌────────────┐
       │ Normalize  │         │ Normalize  │         │ Normalize  │
       │ to Markdown│         │ to Markdown│         │ to Markdown│
       └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  Aggregate &    │
                          │  Structure      │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Push to GitHub │
                          │  Snapshot Repo  │
                          └─────────────────┘
```

#### Source Types

```typescript
// apps/api/server/utils/sources.ts

interface BaseSource {
  id: string
  label: string
  type: 'github' | 'youtube' | 'custom'
}

interface GitHubSource extends BaseSource {
  type: 'github'
  repo: string           // e.g., 'nuxt/nuxt'
  branch: string         // e.g., 'main'
  contentPath: string    // e.g., 'docs/content'
  outputPath?: string    // e.g., 'nuxt'
  readmeOnly?: boolean   // Only fetch README.md
}

interface YouTubeSource extends BaseSource {
  type: 'youtube'
  channelId: string
  maxVideos?: number
}

interface CustomSource extends BaseSource {
  type: 'custom'
  fetchFn: () => Promise<ContentFile[]>
}

type Source = GitHubSource | YouTubeSource | CustomSource
```

## API Endpoints Specification

### Authentication

All endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer <api-key>
```

### Sandbox Endpoints

#### POST /api/sandbox/create

Creates or recovers a sandbox for a chat session.

**Request:**
```json
{
  "chatId": "unique-chat-identifier"
}
```

**Response:**
```json
{
  "sandboxId": "sbx_abc123",
  "fileTree": "docs/\n├── nuxt/ (45 files)\n├── nitro/ (23 files)..."
}
```

#### POST /api/sandbox/:id/search-and-read

Combined search and read operation.

**Request:**
```json
{
  "query": "useAsyncData",
  "limit": 5
}
```

**Response:**
```json
{
  "query": "useAsyncData",
  "files": [
    {
      "path": "packages/content/docs/nuxt/composables/use-async-data.md",
      "content": "# useAsyncData\n\n..."
    }
  ]
}
```

#### POST /api/sandbox/:id/search

Search for files matching query.

**Request:**
```json
{
  "query": "middleware",
  "limit": 10
}
```

**Response:**
```json
{
  "files": [
    "packages/content/docs/nuxt/guide/middleware.md",
    "packages/content/docs/nitro/middleware.md"
  ]
}
```

#### POST /api/sandbox/:id/read

Read specific files.

**Request:**
```json
{
  "paths": [
    "packages/content/docs/nuxt/guide/middleware.md"
  ]
}
```

**Response:**
```json
{
  "files": [
    {
      "path": "packages/content/docs/nuxt/guide/middleware.md",
      "content": "# Middleware\n\n..."
    }
  ]
}
```

### Sync Endpoints

#### POST /api/sync

Triggers full content synchronization.

**Response:**
```json
{
  "status": "started",
  "sources": 25
}
```

#### GET /api/sources

Lists configured sources.

**Response:**
```json
{
  "sources": [
    {
      "id": "nuxt",
      "label": "Nuxt",
      "type": "github",
      "repo": "nuxt/nuxt"
    }
  ]
}
```

## Storage Strategy

### KV Store

Used for sandbox session management:

```typescript
// Key format
`sandbox:chat:${chatId}` -> SandboxRecord

// TTL: 30 minutes (sandbox timeout + buffer)
```

### Snapshot Repository

Structure:

```
content-snapshot-repo/
├── docs/
│   ├── nuxt/
│   │   ├── getting-started/
│   │   │   └── installation.md
│   │   └── composables/
│   │       └── use-async-data.md
│   ├── nitro/
│   └── ...
└── youtube/
    ├── alex-lichter/
    │   └── nuxt-4-overview-TAoTh4DqH6A.md
    └── ...
```

## Error Handling

### SDK Errors

```typescript
export class SavoirError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'SANDBOX_FAILED' | 'NETWORK_ERROR',
    public status?: number
  ) {
    super(message)
  }
}
```

### API Error Responses

```json
{
  "error": {
    "code": "SANDBOX_FAILED",
    "message": "Failed to create sandbox: timeout"
  }
}
```

## Performance Considerations

### Sandbox Reuse

- Sandboxes are cached in KV by `chatId`
- Timeout extended when < 3 minutes remaining
- File tree cached to avoid regeneration

### Batch Operations

- `batchReadFiles`: Single shell command for multiple files
- `searchWithRanking`: grep with match count for relevance

### Connection Pooling

- SDK maintains persistent HTTP connection
- API uses connection pooling for GitHub API calls

## Security

### API Key Validation

```typescript
// apps/api/server/middleware/auth.ts
export default defineEventHandler((event) => {
  const auth = getHeader(event, 'Authorization')
  const apiKey = auth?.replace('Bearer ', '')

  if (!apiKey || apiKey !== useRuntimeConfig().savoirSecretKey) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
})
```

### Sandbox Isolation

- Each sandbox runs in isolated Vercel environment
- No network access from within sandbox
- Read-only filesystem (cloned repo)
- Commands limited to grep, cat, find, ls
