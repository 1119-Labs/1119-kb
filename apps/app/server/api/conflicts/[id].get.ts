import { z } from 'zod'
import { getConflictDetails } from '../../utils/conflicts/detect'

const paramsSchema = z.object({
  id: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const conflict = await getConflictDetails(id)
  if (!conflict) {
    throw createError({
      statusCode: 404,
      message: 'Conflict not found',
      data: { why: 'No conflict exists with this ID', fix: 'Refresh and try another conflict record' },
    })
  }

  return conflict
})
