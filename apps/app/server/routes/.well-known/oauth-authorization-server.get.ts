/**
 * GET /.well-known/oauth-authorization-server
 * MCP clients (e.g. Cursor) may request OAuth 2.0 AS metadata; we use API key only.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json')
  setResponseStatus(event, 404)
  return {
    error: 'not_found',
    message: 'OAuth/OIDC is not supported. Use API key authentication (Authorization: Bearer or x-api-key) for the MCP endpoint at /api/mcp.',
  }
})
