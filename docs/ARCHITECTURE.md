# Savoir Architecture

This document describes the technical architecture of Savoir, a platform for building AI agents with real-time knowledge access.

## System Overview

Savoir consists of three main components:

1. **Savoir API** (`apps/api`): A Nitro-based server that manages Vercel Sandboxes and content synchronization
2. **Savoir SDK** (`packages/sdk`): A client library providing AI SDK-compatible tools
3. **Savoir Config** (`packages/config`): Configuration management with multi-format support

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
│  │    model: 'google/gemini-3-flash',                                 │  │
│  │    tools: { ...savoir.tools }                                      │  │
│  │  })                                                                │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS (API Key auth)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            Savoir API                                    │
│                         (Nitro Server)                                   │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ /api/sandbox/*  │  │   /api/sync/*   │  │    /api/sources/*       │  │
│  │                 │  │                 │  │                         │  │
│  │ - create        │  │ - POST /sync    │  │ - GET /sources          │  │
│  │ - search        │  │ - POST /sync/:s │  │                         │  │
│  │ - read          │  │                 │  │                         │  │
│  │ - searchAndRead │  │                 │  │                         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────────┬────────────┘  │
│           │                    │                        │               │
│           ▼                    ▼                        ▼               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Sandbox Manager │  │ Vercel Workflow │  │     @savoir/config      │  │
│  │                 │  │                 │  │                         │  │
│  │ - Lifecycle     │  │ - Durable exec  │  │ - Load savoir.config.ts │  │
│  │ - KV caching    │  │ - Auto retries  │  │ - Validation            │  │
│  │ - Command exec  │  │ - Sync sources  │  │ - Normalization         │  │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────────┘  │
└───────────┼────────────────────┼────────────────────────────────────────┘
            │                    │
            ▼                    ▼
     ┌────────────┐       ┌────────────┐
     │   Vercel   │       │   GitHub   │
     │   Sandbox  │◄──────│  Snapshot  │
     │   API      │ clone │   Repo     │
     └────────────┘       └────────────┘
```

## Project Structure

```
savoir/
├── savoir.config.ts          # Source configuration (root level!)
├── apps/
│   └── api/                  # Nitro API server
│       ├── routes/
│       │   └── api/
│       │       ├── index.ts          # GET /api - Health check
│       │       ├── sources/          # Source endpoints
│       │       │   └── index.get.ts  # GET /api/sources
│       │       ├── sync/             # Sync endpoints
│       │       │   ├── index.post.ts # POST /api/sync
│       │       │   └── [source].post.ts # POST /api/sync/:source
│       │       └── sandbox/          # Sandbox endpoints (planned)
│       │           ├── search.post.ts
│       │           ├── read.post.ts
│       │           └── search-and-read.post.ts
│       ├── workflows/
│       │   └── sync-docs/    # Vercel Workflow for syncing
│       └── plugins/
│           └── config.ts     # Config loader plugin
├── packages/
│   ├── config/               # @savoir/config
│   │   └── src/
│   │       ├── index.ts      # Public exports
│   │       ├── types.ts      # Source types
│   │       ├── define.ts     # defineConfig()
│   │       ├── loader.ts     # c12-based loading
│   │       ├── validation.ts # Zod schemas
│   │       └── normalize.ts  # Default values
│   ├── sdk/                  # @savoir/sdk
│   └── logger/               # @savoir/logger
└── docs/                     # Documentation
```

## Component Details

### 1. Configuration (`@savoir/config`)

Sources are configured in `savoir.config.ts` at the project root. This file is visible, easy to edit, and supports multiple formats via [c12](https://github.com/unjs/c12).

#### Supported Formats

- `savoir.config.ts` (recommended)
- `savoir.config.js`
- `savoir.config.json`
- `savoir.config.yaml`
- `.savoirrc` (JSON)

#### Configuration Schema

```typescript
// savoir.config.ts
import { defineConfig } from '@savoir/config'

export default defineConfig({
  sources: {
    github: [
      {
        id: 'nuxt',
        label: 'Nuxt',
        repo: 'nuxt/nuxt',
        branch: 'main',        // default: 'main'
        contentPath: 'docs',   // default: 'docs'
        outputPath: 'nuxt',    // default: same as id
        additionalSyncs: [
          { repo: 'nuxt/nuxt.com', contentPath: 'content' },
        ],
      },
      { id: 'nitro', repo: 'nitrojs/nitro', branch: 'v3' },
      { id: 'ofetch', repo: 'unjs/ofetch', readmeOnly: true },
    ],
    youtube: [
      {
        id: 'alex-lichter',
        label: 'Alexander Lichter',
        channelId: 'UCqFPgMzGbLjd-MX-h3Z5aQA',
        maxVideos: 50,         // default: 50
      },
    ],
  },
})
```

#### Package API

```typescript
// Configuration definition
export function defineConfig(config: SavoirConfigInput): SavoirConfigInput

// Loading (with c12)
export async function loadSavoirConfig(options?: { cwd?: string }): Promise<LoadedConfig>
export function setConfigCwd(cwd: string): void

// Accessors (async - always reload from disk)
export async function getSources(): Promise<Source[]>
export async function getGitHubSources(): Promise<GitHubSource[]>
export async function getYouTubeSources(): Promise<YouTubeSource[]>
export async function getSourceById(id: string): Promise<Source | undefined>
export async function getSourcesByType<T>(type: string): Promise<T[]>
```

### 2. SDK (`@savoir/sdk`)

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
import { tool } from 'ai'
import { z } from 'zod'

export interface SavoirOptions {
  apiKey: string
  apiUrl: string
  chatId?: string  // Optional: reuse sandbox across calls
}

export interface SavoirClient {
  searchAndRead: ReturnType<typeof tool>  // Search and read files (recommended)
  search: ReturnType<typeof tool>         // Search for files
  read: ReturnType<typeof tool>           // Read specific files
}

export function createSavoir(options: SavoirOptions): SavoirClient
```

### 3. API (`apps/api`)

A Nitro server providing REST endpoints for sandbox management and content synchronization.

#### Route Structure

```
apps/api/routes/api/
├── index.ts              # GET /api - Health check
├── sources/
│   └── index.get.ts      # GET /api/sources - List sources
└── sync/
    ├── index.post.ts     # POST /api/sync - Sync all
    └── [source].post.ts  # POST /api/sync/:source - Sync one
```

#### Sync Architecture

Content synchronization uses [Vercel Workflow](https://github.com/vercel/workflow) for durable execution with automatic retries.

```
POST /api/sync
     │
     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Vercel Workflow                                  │
│                     (Durable execution engine)                           │
│                                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Step 1    │  │   Step 2    │  │   Step N    │  │  Final Step │     │
│  │ Sync source │─▶│ Sync source │─▶│    ...      │─▶│   Push to   │     │
│  │   "nuxt"    │  │   "nitro"   │  │             │  │   GitHub    │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                                          │
│  Features:                                                               │
│  - Automatic retries on failure                                          │
│  - Progress tracking via `pnpm workflow:web`                             │
│  - Durable state (survives server restarts)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Sandbox System (Planned)

The sandbox system uses [Vercel Sandbox Snapshots](https://vercel.com/docs/vercel-sandbox/managing#snapshotting) for instant startup without cloning.

#### Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Snapshot Task (Periodic)                         │
│                        Runs every X hours/days                           │
│                                                                          │
│  1. Create sandbox ──▶ 2. Clone snapshot repo ──▶ 3. Take snapshot      │
│                                                          │               │
│                                                          ▼               │
│                                                   ┌─────────────┐        │
│                                                   │  Snapshot   │        │
│                                                   │  (7 days)   │        │
│                                                   └──────┬──────┘        │
└──────────────────────────────────────────────────────────┼──────────────┘
                                                           │
                                                           │ instant start
                                                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Sandbox Endpoints                            │
│                                                                          │
│  Request ──▶ Start from snapshot ──▶ Search/Read ──▶ Return results     │
│                  (instant)              (grep/cat)                       │
│                                                                          │
│  Benefits:                                                               │
│  - No clone delay (content already in sandbox)                           │
│  - Consistent state across all requests                                  │
│  - Automatic cleanup (sandbox stops after use)                           │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Snapshot Lifecycle

```
Sync Workflow              Snapshot Task              API Request
     │                          │                          │
     │  push to GitHub          │                          │
     ▼                          │                          │
┌──────────┐                    │                          │
│ Snapshot │ ◀──── triggers ────┤                          │
│   Repo   │                    │                          │
└──────────┘                    ▼                          │
                         ┌────────────┐                    │
                         │  Create    │                    │
                         │  Sandbox   │                    │
                         └─────┬──────┘                    │
                               │ clone repo                │
                               ▼                          │
                         ┌────────────┐                    │
                         │   Take     │                    │
                         │  Snapshot  │                    │
                         └─────┬──────┘                    │
                               │                          │
                               ▼                          ▼
                         ┌────────────┐            ┌────────────┐
                         │  Snapshot  │ ─────────▶ │  Instant   │
                         │   Ready    │  start     │  Sandbox   │
                         └────────────┘            └────────────┘
```

#### Key Functions

```typescript
// Snapshot management
export async function createContentSnapshot(): Promise<Snapshot>
export async function getLatestSnapshot(): Promise<Snapshot | null>

// Sandbox operations (internal to API)
async function startFromSnapshot(snapshotId: string): Promise<Sandbox>
async function searchInSandbox(sandbox: Sandbox, query: string, limit: number): Promise<string[]>
async function readFromSandbox(sandbox: Sandbox, paths: string[]): Promise<FileContent[]>
```

> **Note:** Snapshots expire after 7 days. The snapshot task should run regularly to ensure a fresh snapshot is always available.

## API Endpoints

### Authentication

All endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer <api-key>
```

### Source Endpoints

#### GET /api/sources

Lists all configured content sources.

**Response:**
```json
{
  "total": 25,
  "github": {
    "count": 23,
    "sources": [
      { "id": "nuxt", "label": "Nuxt", "repo": "nuxt/nuxt" }
    ]
  },
  "youtube": {
    "count": 2,
    "sources": [
      { "id": "alex-lichter", "label": "Alexander Lichter" }
    ]
  }
}
```

### Sync Endpoints

#### POST /api/sync

Sync all sources.

**Body (optional):**
```json
{
  "reset": false,
  "push": true
}
```

**Response:**
```json
{
  "status": "started",
  "message": "Sync workflow started. Use `pnpm workflow:web` to monitor.",
  "options": { "reset": false, "push": true }
}
```

#### POST /api/sync/:source

Sync a specific source.

**Params:**
- `source`: Source ID (e.g., `nuxt`, `nitro`)

**Body (optional):**
```json
{
  "reset": false,
  "push": true
}
```

**Response:**
```json
{
  "status": "started",
  "message": "Sync workflow started for source \"nuxt\". Use `pnpm workflow:web` to monitor.",
  "source": "nuxt",
  "options": { "reset": false, "push": true, "sourceFilter": "nuxt" }
}
```

### Sandbox Endpoints (Planned)

The API manages sandbox lifecycle internally. Sandboxes start instantly from the pre-built snapshot.

#### POST /api/sandbox/search-and-read

Combined search and read operation (recommended).

**Request:**
```json
{
  "query": "useAsyncData",
  "limit": 5,
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "query": "useAsyncData",
  "files": [
    {
      "path": "docs/nuxt/composables/use-async-data.md",
      "content": "# useAsyncData\n\n..."
    }
  ]
}
```

#### POST /api/sandbox/search

Search for files matching query.

**Request:**
```json
{
  "query": "middleware",
  "limit": 10,
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "files": [
    "docs/nuxt/guide/middleware.md",
    "docs/nitro/middleware.md"
  ]
}
```

#### POST /api/sandbox/read

Read specific files.

**Request:**
```json
{
  "paths": [
    "docs/nuxt/guide/middleware.md"
  ],
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "files": [
    {
      "path": "docs/nuxt/guide/middleware.md",
      "content": "# Middleware\n\n..."
    }
  ]
}
```

> **Note:** The `sessionId` is optional and generic - can be from any client (Discord bot, Slack bot, GitHub bot, web chat, etc.). If provided, the API may reuse an existing sandbox for that session.

## Storage Strategy

### KV Store

Used for storing the current snapshot ID and optionally sandbox sessions:

```typescript
// Current snapshot (updated by snapshot task)
`snapshot:current` -> { snapshotId: string, createdAt: number }

// Optional: Active sandbox sessions (if reusing sandboxes across requests)
`sandbox:session:${sessionId}` -> { sandboxId: string, createdAt: number }

// sessionId is generic - can be from any client (Discord bot, Slack bot, GitHub bot, etc.)
// TTL: 30 minutes (sandbox timeout)
```

### Snapshot Repository

Structure:

```
{GITHUB_SNAPSHOT_REPO}/
├── docs/
│   ├── nuxt/
│   │   ├── getting-started/
│   │   │   └── installation.md
│   │   └── composables/
│   │       └── use-async-data.md
│   ├── nitro/
│   └── ...
└── youtube/
    └── alex-lichter/
        └── nuxt-4-overview-TAoTh4DqH6A.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub token for API access |
| `GITHUB_SNAPSHOT_REPO` | Yes | Snapshot repository (owner/repo) |
| `GITHUB_SNAPSHOT_BRANCH` | No | Branch to push to (default: main) |
| `SAVOIR_SECRET_KEY` | No | API key for authentication |

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

### Snapshot-based Startup

- Sandboxes start instantly from pre-built snapshot (no clone delay)
- Snapshot contains all synced content ready to search
- Snapshot is refreshed periodically by the snapshot task

### Session Reuse (Optional)

- Sandboxes can be reused within a session via `sessionId`
- Avoids startup cost for multiple requests in same conversation
- Automatic cleanup when session ends or timeout

### Batch Operations

- `batchReadFiles`: Single shell command for multiple files
- `searchWithRanking`: grep with match count for relevance

### Connection Pooling

- SDK maintains persistent HTTP connection
- API uses connection pooling for GitHub API calls

## Security

### API Key Validation

```typescript
// apps/api/middleware/auth.ts
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
