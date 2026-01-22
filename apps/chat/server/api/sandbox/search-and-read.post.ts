import { z } from 'zod'
import { getOrCreateSandbox, searchAndRead } from '../../lib/sandbox'

const bodySchema = z.object({
  query: z.string({ error: 'query is required - provide a search term like "useAsyncData" or "middleware"' }).min(1, 'query cannot be empty').max(500),
  limit: z.number().int().min(1).max(100).default(20),
  sessionId: z.string().optional(),
})

/**
 * POST /api/sandbox/search-and-read
 * Search for content and return matching files.
 *
 * Body:
 * - query: string - Search query (grep pattern)
 * - limit: number - Maximum results (default: 20, max: 100)
 * - sessionId: string - Optional session ID for sandbox reuse
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  // Get or create sandbox
  const { sandbox, sessionId } = await getOrCreateSandbox(body.sessionId)

  // Search and read files
  const result = await searchAndRead(sandbox, body.query, body.limit)

  return {
    sessionId,
    matches: result.matches,
    files: result.files,
  }
})
