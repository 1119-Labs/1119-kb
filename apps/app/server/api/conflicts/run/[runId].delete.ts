import { z } from 'zod'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

const paramsSchema = z.object({
  runId: z.string().min(1),
})

/**
 * DELETE /api/conflicts/run/:runId
 * Delete a conflict run and its conflicts (admin only). Use to clear a run completely.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { runId } = await getValidatedRouterParams(event, paramsSchema.parse)

  const [deleted] = await db
    .delete(schema.knowledgeConflictRuns)
    .where(eq(schema.knowledgeConflictRuns.id, runId))
    .returning({ id: schema.knowledgeConflictRuns.id })

  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'Run not found',
      data: { why: 'No run with this ID', fix: 'Check the run ID and try again.' },
    })
  }

  return { deleted: true, id: runId }
})
