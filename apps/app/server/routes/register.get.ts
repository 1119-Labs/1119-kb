/**
 * GET /register
 * Same as POST: redirect clients that hit /register to use /api/mcp.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const mcpEndpoint = `${url.origin}/api/mcp`
  setHeader(event, 'Content-Type', 'application/json')
  setResponseStatus(event, 400)
  return {
    error: true,
    statusCode: 400,
    message: 'This path is not the MCP endpoint. Use the MCP URL in your client settings.',
    mcpEndpoint,
    hint: `Set your MCP server URL to: ${mcpEndpoint}`,
  }
})
