import { getStepFunction, registerStepFunction } from '@workflow/core/private'
import {
  runtimeStepCreateAndSnapshot,
  runtimeStepCreateSandbox,
  runtimeStepPushChanges,
  runtimeStepRecordVersions,
  runtimeStepSyncSource,
  runtimeStepTakeSnapshot,
} from '../workflows/runtime-step-handlers'

type StepFn = (...args: any[]) => any

function registerStepIds(stepId: string, fn: StepFn) {
  // Register both path variants as a safety net for local-world queue naming.
  const normalizedStepId = stepId.replace(/^step\/\/\.\//, 'step//')
  for (const id of new Set([stepId, normalizedStepId])) {
    if (!getStepFunction(id)) registerStepFunction(id, fn)
  }
}

export default defineNitroPlugin(() => {
  registerStepIds('step//./server/workflows/sync-docs/steps/create-sandbox//stepCreateSandbox', runtimeStepCreateSandbox)
  registerStepIds('step//./server/workflows/sync-docs/steps/sync-source//stepSyncSource', runtimeStepSyncSource)
  registerStepIds('step//./server/workflows/sync-docs/steps/push-changes//stepPushChanges', runtimeStepPushChanges)
  registerStepIds('step//./server/workflows/sync-docs/steps/take-snapshot//stepTakeSnapshot', runtimeStepTakeSnapshot)
  registerStepIds('step//./server/workflows/sync-docs/steps/record-versions//stepRecordVersions', runtimeStepRecordVersions)
  registerStepIds('step//./server/workflows/create-snapshot/steps/create-and-snapshot//stepCreateAndSnapshot', runtimeStepCreateAndSnapshot)

  const registered = [
    'step//./server/workflows/sync-docs/steps/create-sandbox//stepCreateSandbox',
    'step//./server/workflows/sync-docs/steps/sync-source//stepSyncSource',
    'step//./server/workflows/sync-docs/steps/push-changes//stepPushChanges',
    'step//./server/workflows/sync-docs/steps/take-snapshot//stepTakeSnapshot',
    'step//./server/workflows/sync-docs/steps/record-versions//stepRecordVersions',
    'step//./server/workflows/create-snapshot/steps/create-and-snapshot//stepCreateAndSnapshot',
  ].filter((id) => !!getStepFunction(id)).length

  console.log(`[workflow-steps] manually registered ${registered} step(s)`)
})

