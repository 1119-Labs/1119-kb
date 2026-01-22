import { z } from 'zod'
import { getOrCreateSandbox, read } from '../../lib/sandbox'

const bodySchema = z.object({
  paths: z.array(z.string().min(1)).min(1).max(50),
  sessionId: z.string().optional(),
})

/**
 * POST /api/sandbox/read
 * Read specific files by path.
 *
 * Body:
 * - paths: string[] - File paths to read (max: 50)
 * - sessionId: string - Optional session ID for sandbox reuse
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)

  const { sandbox, sessionId } = await getOrCreateSandbox(body.sessionId)

  const files = await read(sandbox, body.paths)

  return {
    sessionId,
    files,
  }
})
