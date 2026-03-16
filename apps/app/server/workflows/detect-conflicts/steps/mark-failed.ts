/**
 * Step marks a conflict run as failed. The runtime handler calls markConflictRunFailed directly — no HTTP callback.
 */

interface MarkFailedStepInput {
  runId: string
  error: string
}

export async function stepMarkConflictRunFailed(input: MarkFailedStepInput) {
  'use step'
  // When the app registers the runtime handler, this step body is not used.
  throw new Error('Mark failed step must run via app runtime handler.')
}
