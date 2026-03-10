# MCP (Model Context Protocol) Server

The platform exposes an **MCP endpoint** so coding agents (Cursor, Claude Code, Antigravity, etc.) can use the knowledge base as an MCP server. Each user authenticates with their own **API key**.

## Endpoint

- **URL**: `https://<your-host>/api/mcp` — use this in your MCP client.  
  Some clients (e.g. Cursor) that use the app root as the server URL send requests to `/register`; **POST /register** is supported and is handled the same as **POST /api/mcp**, so both the root URL and the full `/api/mcp` URL work.
- **Method**: `POST` (JSON-RPC body)
- **GET** returns `405 Method Not Allowed` (Streamable HTTP uses POST for requests).

## Authentication

Use a **user API key** (from **Settings > API Keys** in the app):

- **Header**: `Authorization: Bearer <your-api-key>`
- **Or**: `x-api-key: <your-api-key>`

Requests without a valid API key receive `401 Unauthorized` with a JSON body that explains how to send the key (e.g. create one in **Settings → API Keys**, then send `Authorization: Bearer <key>` or `x-api-key: <key>`).

## Tools

### listSources

Lists all configured knowledge sources with versioning.

- **Arguments**: None
- **Returns**: JSON object with:
  - `total`, `lastSyncAt`, `youtubeEnabled`, `snapshotRepo`, `snapshotBranch`, `snapshotRepoUrl`
  - `github.sources`, `youtube.sources` — each source includes a `versions` array (sorted by `syncedAt`, newest first)

### searchKnowledge

Runs a natural-language query against the knowledge base (same pipeline as chat) and returns a structured answer for the coding agent.

- **Arguments**:
  - `query` (string, required): Natural language search query
  - `sourceVersions` (object, optional): Map of source id → version folder name to pin versions
- **Returns**: JSON object with:
  - `answer` (string): Final answer text
  - `steps` (number, optional): Number of agent steps
  - `model` (string, optional): Model used

## Protocol

The endpoint speaks **MCP over Streamable HTTP** (JSON-RPC 2.0):

1. Client sends `initialize` and then `initialized` as per the [MCP specification](https://modelcontextprotocol.io).
2. Client calls `tools/list` to discover tools (`listSources`, `searchKnowledge`).
3. Client calls `tools/call` with `name` and `arguments` to invoke a tool.

## Adding the server in Cursor / Claude Code

1. Create an API key: **Settings > API Keys** in the app, then **Create API Key**.
2. In your MCP client config (e.g. Cursor MCP settings), add the server with:
   - **URL**: `https://<your-host>/api/mcp`
   - **Headers** or auth: `Authorization: Bearer <your-api-key>` or `x-api-key: <your-api-key>`
3. Use the **Streamable HTTP** transport; the client should send POST requests with a JSON-RPC body.

Refer to your client’s docs for the exact MCP server configuration format (URL + headers).
