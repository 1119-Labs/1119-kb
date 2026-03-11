/**
 * GET /api/login-providers
 * Returns which social login providers are enabled (based on runtime env).
 * Used by the login page to show/hide provider buttons (e.g. in Docker, env is set at runtime).
 */
export default defineEventHandler(() => {
  return {
    github: Boolean(
      process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ),
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
  }
})
