import { z } from 'zod'
import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'

const paramsSchema = z.object({
  runId: z.string().min(1),
})

const bodySchema = z.object({
  status: z.literal('failed'),
  error: z.string().optional(),
})

/**
 * PATCH /api/conflicts/run/:runId
 * Mark a conflict run as failed (admin only). Use to clear stuck pending/running runs.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { runId } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, value => bodySchema.parse(value))

  const [updated] = await db
    .update(schema.knowledgeConflictRuns)
    .set({
      status: 'failed',
      error: body.error ?? 'Cleared by user',
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.knowledgeConflictRuns.id, runId),
        inArray(schema.knowledgeConflictRuns.status, ['pending', 'running']),
      ),
    )
    .returning()

  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Run not found or already finished',
      data: {
        why: 'No run with this ID, or run is already completed/failed',
        fix: 'Use a run ID that is currently pending or running.',
      },
    })
  }

  return updated
})
