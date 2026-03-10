/**
 * GET /.well-known/openid-configuration
 * MCP clients (e.g. Cursor) sometimes request OIDC discovery when probing the server.
 * This app does not use OAuth/OIDC for MCP; authentication is via API key only.
 * Return 404 with a clear JSON body so the client does not attempt OAuth flows.
 */
export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'application/json')
  setResponseStatus(event, 404)
  return {
    error: 'not_found',
    message: 'OAuth/OIDC is not supported. Use API key authentication (Authorization: Bearer or x-api-key) for the MCP endpoint at /api/mcp.',
  }
})
