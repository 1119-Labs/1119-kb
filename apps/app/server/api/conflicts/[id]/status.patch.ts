import { z } from 'zod'
import { updateConflictStatus } from '../../../utils/conflicts/detect'

const paramsSchema = z.object({
  id: z.string().min(1),
})

const bodySchema = z.object({
  status: z.enum(['acknowledged', 'resolved']),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, value => bodySchema.parse(value))

  const updated = await updateConflictStatus(id, body.status)
  if (!updated) {
    throw createError({
      statusCode: 404,
      message: 'Conflict not found',
      data: { why: 'No conflict exists with this ID', fix: 'Refresh and try again' },
    })
  }

  return updated
})
