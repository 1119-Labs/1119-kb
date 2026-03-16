import { z } from 'zod'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { detectKnowledgeConflicts, markConflictRunFailed } from '../../utils/conflicts/detect'
import { DEFAULT_CONFLICT_MODEL } from '../../utils/conflicts/types'

const bodySchema = z.object({
  runId: z.string().min(1),
  model: z.string().min(1).optional(),
  maxPairs: z.number().int().min(1).max(500).optional(),
})

/**
 * Internal endpoint for the conflict-detection workflow step.
 * Starts detection in the background and returns 202 immediately so the step does not time out.
 * The UI should poll GET /api/conflicts to see when the run completes.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const secret = (
    config.conflictDetection?.internalSecret
    || process.env.NUXT_CONFLICT_DETECTION_INTERNAL_SECRET
    || process.env.CONFLICT_DETECTION_INTERNAL_SECRET
    || ''
  ).trim()
  const headerSecret = getHeader(event, 'x-conflict-internal-secret')

  if (!secret || headerSecret !== secret) {
    throw createError({
      statusCode: 403,
      message: 'Forbidden',
      data: { why: 'Invalid or missing internal secret', fix: 'Set CONFLICT_DETECTION_INTERNAL_SECRET and pass it in x-conflict-internal-secret' },
    })
  }

  const body = await readValidatedBody(event, value => bodySchema.parse(value))

  await db
    .update(schema.knowledgeConflictRuns)
    .set({
      status: 'running',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.knowledgeConflictRuns.id, body.runId))

  const model = body.model || DEFAULT_CONFLICT_MODEL
  const runId = body.runId
  const maxPairs = body.maxPairs

  Promise.resolve()
    .then(() =>
      detectKnowledgeConflicts({
        runId,
        model,
        maxPairs,
      }),
    )
    .catch(async (error) => {
      const message = error instanceof Error ? error.message : String(error)
      await markConflictRunFailed(runId, message)
    })

  setResponseStatus(event, 202)
  return {
    status: 'started',
    runId,
    message: 'Conflict detection is running in the background. Poll GET /api/conflicts for the run result.',
  }
})
