import { db, schema } from '@nuxthub/db'
import { start } from 'workflow/api'
import { z } from 'zod'
import { detectConflictsWorkflow } from '../../workflows/detect-conflicts'
import { DEFAULT_CONFLICT_MODEL } from '../../utils/conflicts/types'

const bodySchema = z.object({
  model: z.string().min(1).optional(),
  maxPairs: z.number().int().min(1).max(500).optional(),
}).optional()

export default defineEventHandler(async (event) => {
  const requestLog = useLogger(event)
  await requireAdmin(event)
  const body = await readValidatedBody(event, value => bodySchema.parse(value))

  const model = body?.model || DEFAULT_CONFLICT_MODEL

  const [run] = await db
    .insert(schema.knowledgeConflictRuns)
    .values({
      status: 'pending',
      sourceCount: 0,
      checkedPairs: 0,
      model,
      updatedAt: new Date(),
    })
    .returning({ id: schema.knowledgeConflictRuns.id })

  if (!run) {
    throw createError({ statusCode: 500, message: 'Failed to create conflict run' })
  }

  await start(detectConflictsWorkflow, [
    {
      runId: run.id,
      model,
      maxPairs: body?.maxPairs,
    },
  ])

  requestLog.set({ runId: run.id, model, maxPairs: body?.maxPairs ?? null })

  return {
    status: 'started',
    runId: run.id,
    model,
  }
})
