import { getAgentConfig } from '../../utils/agent-config'

/**
 * GET /api/agent-config/public
 * Get the active agent configuration for SDK (protected by API key via middleware)
 *
 * This endpoint is used by external bots (github-bot, etc.) to fetch
 * the current agent configuration via the SDK.
 */
export default defineEventHandler(async (event) => {
  // Validate API key (similar to sandbox routes)
  const config = useRuntimeConfig()
  const secretKey = config.savoirSecretKey

  if (secretKey) {
    const authHeader = getHeader(event, 'Authorization')
    const apiKey = authHeader?.replace('Bearer ', '')

    if (!apiKey || apiKey !== secretKey) {
      throw createError({
        statusCode: 401,
        message: 'Invalid or missing API key',
      })
    }
  }

  return await getAgentConfig()
})
