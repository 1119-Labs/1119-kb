# MCP Server Feature — Implementation Spec

## Overview

Expose a **Model Context Protocol (MCP)** endpoint so coding agents (Cursor, Claude Code, Antigravity, etc.) can use the platform as an MCP server. Authentication uses each user's **API key**. The server exposes two tools:

- **listSources** — List all knowledge sources with versioning array, sorted by time.
- **searchKnowledge** — Run a search/query (same as chat) and return structured output for the agent loop.

## Requirements

- One MCP endpoint (Streamable HTTP transport); auth via `Authorization: Bearer <apiKey>` or `x-api-key`.
- **listSources**: Return same shape as current sources API (sources + versions per source, versions sorted by `syncedAt` desc).
- **searchKnowledge**: Accept `query` (string), run the existing source agent (one user message), return structured JSON: `{ answer, citations?, steps? }` (or similar) for the coding agent to consume.

## Steps to Implement

### 1. Add MCP SDK dependency

- **File**: `apps/app/package.json`
- Add: `"@modelcontextprotocol/sdk": "^1.x"` (use current stable). Optionally `@modelcontextprotocol/node` if we use NodeStreamableHTTPServerTransport (check SDK for transport export).

### 2. Auth helper for MCP (API key only)

- **File**: `apps/app/server/utils/mcp-auth.ts` (new)
- Export a function that reads `Authorization` / `x-api-key` from the H3 event, validates session via Better Auth (API key creates session), returns `{ user }` or throws 401. Reuse same pattern as other API routes (session can come from API key per auth.config.ts).

### 3. listSources tool implementation

- **File**: `apps/app/server/utils/mcp/tools/list-sources.ts` (new)
- Reuse the same data logic as `GET /api/sources`: load sources + `sourceVersions` (ordered by `syncedAt` desc), group versions by source, return payload: `{ total, lastSyncAt, github: { sources }, youtube: { sources } }` with each source containing `versions` array (sorted by time). Return as MCP tool result (e.g. content type `text` with JSON string, or structured content).

### 4. searchKnowledge tool implementation

- **File**: `apps/app/server/utils/mcp/tools/search-knowledge.ts` (new)
- Input: `query` (string). Optional: `sourceVersions?: Record<string, string>` to pin versions (default: latest).
- Use existing agent stack: `getAgentConfig`, `createSavoir` (internal API URL, no session needed for MCP server-to-sandbox), `createSourceAgent` with `searchPaths` derived from DB (same as chat). Build messages = `[{ role: 'user', content: query }]`.
- Run agent with `agent.stream()` and consume the full stream to collect the final assistant message and optionally tool-call steps/citations. Return structured object: `{ answer: string, citations?: Array<...>, steps?: number }` (or minimal `{ answer }`) as MCP tool result.

### 5. MCP server setup and tool registration

- **File**: `apps/app/server/utils/mcp/server.ts` (new)
- Create MCP `Server` from `@modelcontextprotocol/sdk` with `name` and `version`.
- Register handlers:
  - `ListToolsRequestSchema` → return two tools: `listSources` (no args), `searchKnowledge` (args: `query` string, optional `sourceVersions`).
  - `CallToolRequestSchema` → dispatch by `request.params.name` to listSources or searchKnowledge; both receive a context object `{ user }` (injected by the route). Return `content: [{ type: 'text', text: JSON.stringify(result) }]`.
- Export a function `handleMcpRequest(event: H3Event)` that: (1) runs MCP auth helper, (2) gets Node req/res from `event.node.req` / `event.node.res`, (3) reads body (JSON-RPC), (4) runs the transport’s request handler (or directly the server’s message handler if SDK exposes it). The transport may need to be created per-request or stateless; check SDK docs for Streamable HTTP.

### 6. MCP API route

- **File**: `apps/app/server/api/mcp/[...].ts` or `apps/app/server/api/mcp.post.ts` (new)
- Single route that accepts POST (and optionally GET for SSE if Streamable HTTP uses both). Auth via `requireUserSession` or the new MCP auth helper (API key only). Parse body as JSON and forward to `handleMcpRequest(event)`. Set appropriate headers for Streamable HTTP (e.g. `Accept: application/json`, `Content-Type: application/json`).

### 7. Documentation

- **File**: `docs/MCP.md` (new)
- Describe: MCP endpoint URL (e.g. `https://<host>/api/mcp`), auth (Bearer or x-api-key), tools `listSources` and `searchKnowledge`, example of how to add the server in Cursor/Claude Code (URL + API key in header or config). Optionally add a short section in `docs/ARCHITECTURE.md` under a new “MCP” subsection.

### 8. ARCHITECTURE.md update

- **File**: `docs/ARCHITECTURE.md`
- Add “MCP” subsection under API Endpoints: endpoint, auth (API key), and tools list.

## How to Test

### Manual

1. **Auth**
   - POST to `/api/mcp` without API key → 401.
   - POST with invalid API key → 401.
   - POST with valid user API key in `Authorization: Bearer <key>` → not 401 (e.g. 200 with JSON-RPC response).

2. **listSources**
   - Send JSON-RPC request: `method: "tools/list"` → response includes tools `listSources` and `searchKnowledge`.
   - Send JSON-RPC: `method: "tools/call", params: { name: "listSources", arguments: {} }` → response body contains sources and versions array per source, versions sorted by time.

3. **searchKnowledge**
   - Send JSON-RPC: `method: "tools/call", params: { name: "searchKnowledge", arguments: { query: "How do I install the SDK?" } }` → response contains structured result with `answer` (and optionally citations/steps). Answer should reflect knowledge from configured sources.

### Automated (optional)

- Add `apps/app/server/api/mcp/mcp.post.test.ts` (or in a separate test file) that: (1) mocks auth and calls the handler with a tools/list and tools/call for listSources, (2) asserts on response shape (tools list, sources with versions). Skip searchKnowledge in unit test if it requires full agent/sandbox (or mock agent).

## Implementation notes

- **MCP SDK**: `@modelcontextprotocol/sdk`; `McpServer` and `StreamableHTTPServerTransport` are loaded via dynamic `import()` from `server/mcp` and `server/streamableHttp`. Type declarations in `server/utils/mcp/mcp-sdk.d.ts`.
- **searchKnowledge**: Reuses chat pipeline (createSourceAgent, searchPaths, stream consumed for final assistant message).
- **Auth**: `requireUserSession(event)` (API key via Bearer or x-api-key).

## Out of scope (for later)

- Cursor-specific config files in the repo.
- MCP resources (e.g. “read file from knowledge”) — only tools for this feature.
