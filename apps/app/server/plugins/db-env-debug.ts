/**
 * Log database-related env vars at server startup for debugging (e.g. why PGLite is used instead of Postgres).
 * Safe to remove or disable once DATABASE_URL/POSTGRES_URL is confirmed.
 */
function redactUrl(url: string): string {
  try {
    // postgresql://user:password@host:port/db -> postgresql://user:***@host:port/db
    return url.replace(/(:\/\/[^:]+):[^@]+@/, '$1:***@')
  } catch {
    return '[invalid]'
  }
}

export default defineNitroPlugin(() => {
  const postgresUrl = process.env.POSTGRES_URL
  const postgresqlUrl = process.env.POSTGRESQL_URL
  const databaseUrl = process.env.DATABASE_URL
  const log = (name: string, value: string | undefined) => {
    const status = value ? `set (${redactUrl(value)})` : 'not set'
    console.log(`[db-env] ${name}: ${status}`)
  }
  log('POSTGRES_URL', postgresUrl)
  log('POSTGRESQL_URL', postgresqlUrl)
  log('DATABASE_URL', databaseUrl)
})
