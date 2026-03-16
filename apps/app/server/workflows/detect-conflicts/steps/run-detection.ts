/**
 * Step runs conflict detection. The runtime handler (runtimeStepRunConflictDetection)
 * runs in the app and calls detectKnowledgeConflicts directly — no HTTP callback.
 * This step definition only runs when no runtime handler is registered (e.g. remote workflow runtime).
 */

interface RunDetectionStepInput {
  runId: string
  model?: string
  maxPairs?: number
}

export async function stepRunConflictDetection(input: RunDetectionStepInput) {
  'use step'
  // When the app registers the runtime handler, this step body is not used; the handler runs in-process.
  // If this runs (e.g. step executed in a remote workflow runtime), we cannot call the app — throw.
  throw new Error('Conflict detection step must run via app runtime handler; ensure the app is the workflow executor.')
}

stepRunConflictDetection.maxRetries = 2
