import { FatalError } from 'workflow'
import { log } from 'evlog'
import { DEFAULT_CONFLICT_MODEL } from '../../utils/conflicts/types'
import { stepMarkConflictRunFailed, stepRunConflictDetection } from './steps'

interface DetectConflictsInput {
  runId: string
  model?: string
  maxPairs?: number
}

export async function detectConflictsWorkflow(input: DetectConflictsInput) {
  'use workflow'

  if (!input.runId) {
    throw new FatalError('Missing run id')
  }

  const model = input.model || DEFAULT_CONFLICT_MODEL

  try {
    const result = await stepRunConflictDetection({
      runId: input.runId,
      model,
      maxPairs: input.maxPairs,
    })

    if (result.status === 'started') {
      log.info('conflicts', `Run ${input.runId} started in background; poll GET /api/conflicts for completion`)
    } else {
      log.info('conflicts', `Run ${input.runId} completed: ${result.conflictCount} conflicts across ${result.checkedPairs} pairs`)
    }
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await stepMarkConflictRunFailed({
      runId: input.runId,
      error: message,
    })
    log.error('conflicts', `Run ${input.runId} failed: ${message}`)
    throw error
  }
}
