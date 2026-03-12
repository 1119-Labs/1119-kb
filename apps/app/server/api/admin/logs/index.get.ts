import { db, schema } from '@nuxthub/db'
import { count, desc, eq, sql } from 'drizzle-orm'

const VALID_LEVELS = ['error', 'warn', 'info', 'debug'] as const
const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE))
  const levelParam = query.level as string | undefined
  const level = levelParam && VALID_LEVELS.includes(levelParam as (typeof VALID_LEVELS)[number])
    ? (levelParam as (typeof VALID_LEVELS)[number])
    : null

  const e = schema.evlogEvents
  const where = level ? eq(e.level, level) : sql`true`

  const offset = (page - 1) * pageSize

  const [entriesResult, countResult] = await Promise.all([
    db
      .select({
        id: e.id,
        timestamp: e.timestamp,
        level: e.level,
        method: e.method,
        path: e.path,
        status: e.status,
        durationMs: e.durationMs,
        requestId: e.requestId,
        error: e.error,
      })
      .from(e)
      .where(where)
      .orderBy(desc(e.timestamp))
      .limit(pageSize)
      .offset(offset),

    db
      .select({ count: count() })
      .from(e)
      .where(where),
  ])

  const totalCount = Number(countResult[0]?.count ?? 0)
  const entries = entriesResult.map((row) => ({
    id: row.id,
    timestamp: row.timestamp,
    level: row.level,
    method: row.method,
    path: row.path,
    status: row.status,
    durationMs: row.durationMs,
    requestId: row.requestId,
    error: row.error ?? null,
  }))

  return { entries, totalCount }
})
