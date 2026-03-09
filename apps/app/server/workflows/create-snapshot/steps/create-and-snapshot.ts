/**
 * Step: Create and Snapshot
 *
 * Creates sandbox from repository and takes snapshot.
 */

import { log } from 'evlog'
import type { SnapshotConfig } from '../types'
import { createSandbox } from '../../../utils/sandbox/context'

export interface SnapshotResult {
  snapshotId: string
  sandboxId: string
}

export async function stepCreateAndSnapshot(config: SnapshotConfig): Promise<SnapshotResult> {
  'use step'

  const stepId = 'stepCreateAndSnapshot'
  log.info('snapshot', `[${stepId}] Creating sandbox from ${config.snapshotRepo}#${config.snapshotBranch}`)

  const sandbox = await createSandbox(config, 2 * 60 * 1000)
  log.info('snapshot', `[${stepId}] Sandbox created: ${sandbox.sandboxId}`)

  const snapshot = await sandbox.snapshot()
  log.info('snapshot', `[${stepId}] Snapshot created: ${snapshot.snapshotId}`)

  return {
    snapshotId: snapshot.snapshotId,
    sandboxId: sandbox.sandboxId,
  }
}

// Allow more retries for network operations
stepCreateAndSnapshot.maxRetries = 5
