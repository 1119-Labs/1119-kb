import { defineMiddleware, getRequestURL, HTTPError } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'

/** Paths that don't require authentication */
const PUBLIC_PATHS = [
  '/api', // Health check
  '/.well-known/',
  '/health',
  '/favicon.ico',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path =>
    pathname === path || pathname.startsWith(`${path}/`.replace('//', '/')),
  )
}

/**
 * Optional API key authentication middleware
 *
 * Only enforces authentication if SAVOIR_SECRET_KEY is set.
 * If not set, all requests are allowed (useful for development).
 *
 * Expected header: Authorization: Bearer <api-key>
 */
export default defineMiddleware((event, next) => {
  const config = useRuntimeConfig()
  const secretKey = config.savoirSecretKey

  // If no secret key configured, skip authentication
  if (!secretKey) {
    return next()
  }

  const url = getRequestURL(event)

  // Skip auth for public paths
  if (isPublicPath(url.pathname)) {
    return next()
  }

  // Validate API key
  const authHeader = event.req.headers.get('Authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey || apiKey !== secretKey) {
    throw new HTTPError({ status: 401, message: 'Invalid or missing API key' })
  }

  return next()
})
