import { getHeader } from 'h3'
import { getOAuthStyleErrorCode } from '../utils/mcp-error-response'

const MCP_401_MESSAGE =
  'Missing or invalid API key. Send Authorization: Bearer YOUR_API_KEY or x-api-key: YOUR_API_KEY. Create a key in the app: Settings → API Keys.'
const UNAUTHENTICATED_MCP_METHODS = new Set([
  'initialize',
  'initialized',
  'notifications/initialized',
  'tools/list',
  'ping',
])

function getMcpRequestId(body: unknown): string | number | null {
  const id = (body as { id?: unknown })?.id
  if (typeof id === 'string' || typeof id === 'number' || id === null) return id
  return null
}

function isJsonRpcRequest(body: unknown): boolean {
  return (body as { jsonrpc?: unknown })?.jsonrpc === '2.0'
}

function getApiKeyFromHeaders(event: Parameters<typeof getHeader>[0]): string | null {
  const xApiKey = getHeader(event, 'x-api-key')?.trim()
  if (xApiKey) return xApiKey.replace(/^Bearer\s+/i, '').trim()

  const authHeader = getHeader(event, 'authorization')?.trim()
  if (!authHeader) return null

  const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader)
  if (!bearerMatch) return null

  const token = (bearerMatch[1] ?? '').trim().replace(/^"(.*)"$/, '$1').trim()
  return token || null
}

/**
 * POST /register
 * Some MCP clients (e.g. Cursor) send requests to {baseUrl}/register when the user
 * configures the app root (http://localhost:3000) as the server URL. Forward to the
 * same MCP handler as /api/mcp so both URLs work.
 */
export default defineEventHandler(async (event) => {
  let body: unknown
  try {
    body = await readBody(event)
  } catch {
    setResponseStatus(event, 400)
    setHeader(event, 'Content-Type', 'application/json')
    return { error: 'bad_request', message: 'Invalid JSON body', statusCode: 400 }
  }

  const maybeMethod = (body as { method?: unknown })?.method
  const method = typeof maybeMethod === 'string' ? maybeMethod : undefined
  const skipAuth = !!method && UNAUTHENTICATED_MCP_METHODS.has(method)

  if (!skipAuth) {
    try {
      await requireUserSession(event)
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode ?? 401
      setHeader(event, 'Content-Type', 'application/json')
      const apiKey = getApiKeyFromHeaders(event)
      let message = (err as Error)?.message ?? 'Unauthorized'

      if (statusCode === 401 && apiKey) {
        try {
          const auth = serverAuth(event)
          const result = await (auth.api as {
            verifyApiKey?: (args: { body: { key: string } }) => Promise<{ valid: boolean; error?: { message?: string } | null }>
          }).verifyApiKey?.({ body: { key: apiKey } })
          if (result && !result.valid && result.error?.message) {
            message = `${result.error.message} Check Settings → API Keys (enabled / not expired), or create a new key and update your MCP header.`
          } else {
            message = 'Invalid API key. Check the key in Settings → API Keys and ensure it is sent as Authorization: Bearer <key> or x-api-key: <key>.'
          }
        } catch {
          message = 'Invalid API key. Check the key in Settings → API Keys and ensure it is sent as Authorization: Bearer <key> or x-api-key: <key>.'
        }
      } else if (statusCode === 401 && !apiKey) {
        message = MCP_401_MESSAGE
      }

      if (isJsonRpcRequest(body)) {
        // For MCP JSON-RPC clients, return protocol-level errors with 200 status.
        // Some clients drop non-200 bodies and surface a generic/empty error.
        setResponseStatus(event, 200)
        event.node.res.statusCode = 200
        return {
          jsonrpc: '2.0',
          id: getMcpRequestId(body),
          error: {
            code: -32001,
            message,
            data: {
              error: getOAuthStyleErrorCode(statusCode),
              statusCode,
            },
          },
        }
      }

      setResponseStatus(event, statusCode)
      return {
        error: getOAuthStyleErrorCode(statusCode),
        message,
        statusCode,
      }
    }
  }

  const { req, res } = event.node
  if (!req || !res) {
    setResponseStatus(event, 500)
    setHeader(event, 'Content-Type', 'application/json')
    return { error: 'server_error', message: 'Node request/response not available', statusCode: 500 }
  }

  try {
    const { handleMcpRequest } = await import('../utils/mcp/server')
    await handleMcpRequest(event, req, res, body)
  } catch (err: unknown) {
    const statusCode = (err as { statusCode?: number })?.statusCode ?? 500
    setResponseStatus(event, statusCode)
    setHeader(event, 'Content-Type', 'application/json')
    return {
      error: getOAuthStyleErrorCode(statusCode),
      message: (err as Error)?.message ?? 'Internal server error',
      statusCode,
    }
  }
})
