import type { UIToolInvocation } from 'ai'
import { tool } from 'ai'
import { z } from 'zod'
import { db } from '@nuxthub/db'
import { sql } from 'drizzle-orm'

export type QueryLogsUIToolInvocation = UIToolInvocation<typeof queryLogsTool>

export const queryLogsTool = tool({
  description: `Browse and search recent production logs from evlog_events.
Use this to inspect recent requests, find specific errors, or filter by path/status/method.`,
  inputSchema: z.object({
    level: z.enum(['info', 'warn', 'error', 'debug']).optional().describe('Filter by log level'),
    path: z.string().optional().describe('Filter by request path (supports SQL LIKE patterns, e.g. /api/%)'),
    status: z.number().optional().describe('Filter by HTTP status code'),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().describe('Filter by HTTP method'),
    search: z.string().optional().describe('Keyword search in error and data fields'),
    hours: z.number().min(1).max(168).default(24).describe('Number of hours to look back'),
    limit: z.number().min(1).max(200).default(50).describe('Maximum number of entries to return'),
  }),
  execute: async ({ level, path, status, method, search, hours, limit }) => {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    const conditions: string[] = [`timestamp >= '${cutoff}'`]
    if (level) conditions.push(`level = '${level}'`)
    if (path) conditions.push(`path LIKE '${path}'`)
    if (status) conditions.push(`status = ${status}`)
    if (method) conditions.push(`method = '${method}'`)
    if (search) {
      const escaped = search.replace(/'/g, '\'\'')
      conditions.push(`(error LIKE '%${escaped}%' OR data LIKE '%${escaped}%')`)
    }

    const where = conditions.join(' AND ')
    const query = `SELECT timestamp, level, method, path, status, duration_ms, error, request_id FROM evlog_events WHERE ${where} ORDER BY timestamp DESC LIMIT ${limit}`

    try {
      const result = await db.run(sql.raw(query))
      const rows = (result.rows ?? []).map((row: any) => ({
        timestamp: row.timestamp,
        level: row.level,
        method: row.method,
        path: row.path,
        status: row.status,
        durationMs: row.duration_ms,
        error: row.error ? truncate(String(row.error), 200) : null,
        requestId: row.request_id,
      }))

      return { entries: rows, count: rows.length, period: `Last ${hours}h` }
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Query failed' }
    }
  },
})

function truncate(str: string, max: number): string {
  return str.length > max ? `${str.slice(0, max) }...` : str
}
