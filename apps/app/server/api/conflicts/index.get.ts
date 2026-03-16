import { getLatestRunWithConflicts } from '../../utils/conflicts/detect'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return await getLatestRunWithConflicts(100)
})
