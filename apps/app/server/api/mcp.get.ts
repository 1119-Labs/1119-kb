/**
 * GET /api/mcp
 * Some MCP clients (e.g. Cursor) send GET first to discover or validate the endpoint.
 * Return 200 with a minimal payload so they proceed to use POST for JSON-RPC.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json')
  setHeader(event, 'Allow', 'POST')
  return {
    mcp: true,
    message: 'Model Context Protocol endpoint. Use POST for JSON-RPC requests.',
  }
})
