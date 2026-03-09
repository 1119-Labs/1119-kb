import { db } from '@nuxthub/db'
import { count, desc } from 'drizzle-orm'
import { z } from 'zod'
import { syncRequests } from '../../db/schema'

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
})

export default defineEventHandler(async (event) => {
  const requestLog = useLogger(event)
  await requireAdmin(event)

  const query = querySchema.parse(getQuery(event))
  const offset = (query.page - 1) * query.pageSize

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: syncRequests.id,
        status: syncRequests.status,
        sourceFilter: syncRequests.sourceFilter,
        sourceCount: syncRequests.sourceCount,
        summary: syncRequests.summary,
        error: syncRequests.error,
        createdAt: syncRequests.createdAt,
        updatedAt: syncRequests.updatedAt,
      })
      .from(syncRequests)
      .orderBy(desc(syncRequests.createdAt))
      .limit(query.pageSize)
      .offset(offset),
    db.select({ value: count() }).from(syncRequests),
  ])

  const total = Number(totalRows[0]?.value ?? 0)
  requestLog.set({ page: query.page, pageSize: query.pageSize, returned: items.length, total })

  return {
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
  }
})
