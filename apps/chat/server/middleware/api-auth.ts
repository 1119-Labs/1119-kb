/**
 * Optional API key authentication middleware
 *
 * Only enforces authentication if SAVOIR_SECRET_KEY is set.
 * If not set, all requests are allowed (useful for development).
 *
 * Protects:
 * - /api/sync/*
 * - /api/sandbox/*
 *
 * Expected header: Authorization: Bearer <api-key>
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  // Only protect sync and sandbox routes
  if (!path.startsWith('/api/sync') && !path.startsWith('/api/sandbox')) {
    return // Let other routes pass through
  }

  const config = useRuntimeConfig()
  const secretKey = config.savoirSecretKey

  // If no secret key configured, skip authentication (dev mode)
  if (!secretKey) {
    return
  }

  // Validate API key
  const authHeader = getHeader(event, 'Authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey || apiKey !== secretKey) {
    throw createError({
      statusCode: 401,
      message: 'Invalid or missing API key',
    })
  }
})
