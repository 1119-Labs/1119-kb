import { z } from 'zod'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

const bodySchema = z.object({
  runId: z.string().min(1),
  error: z.string(),
})

/**
 * Internal endpoint for the workflow to mark a conflict run as failed.
 * Requires x-conflict-internal-secret header.
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
      data: { why: 'Invalid or missing internal secret' },
    })
  }

  const body = await readValidatedBody(event, value => bodySchema.parse(value))

  await db
    .update(schema.knowledgeConflictRuns)
    .set({
      status: 'failed',
      error: body.error,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.knowledgeConflictRuns.id, body.runId))

  return { ok: true }
})
