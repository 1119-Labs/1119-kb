/**
 * Handle GET /.well-known/* discovery. MCP clients (e.g. Cursor) request OIDC and
 * OAuth discovery when probing; we use API key only. Return 404 with a clear
 * JSON body so the client does not attempt OAuth flows.
 */
export default defineEventHandler((event) => {
  const path = (event.path ?? getRequestURL(event).pathname ?? '').replace(/\/$/, '')
  if (event.method !== 'GET' || !path.startsWith('/.well-known/')) {
    return
  }
  setHeader(event, 'Content-Type', 'application/json')
  setResponseStatus(event, 404)
  return {
    error: 'not_found',
    message: 'OAuth/OIDC is not supported. Use API key authentication (Authorization: Bearer or x-api-key) for the MCP endpoint at /api/mcp.',
  }
})
