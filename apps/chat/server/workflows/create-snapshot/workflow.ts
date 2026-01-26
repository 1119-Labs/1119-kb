/**
 * Create Snapshot Workflow
 *
 * Creates a new Vercel Sandbox snapshot from a git repository.
 * Returns the snapshot ID - API route handles KV storage.
 */

import { FatalError } from 'workflow'
import { log } from 'evlog'
import type { SnapshotConfig, SnapshotResult } from './types'
import { stepCreateAndSnapshot } from './steps'

export async function createSnapshot(config: SnapshotConfig): Promise<SnapshotResult> {
  'use workflow'

  if (!config.snapshotRepo) {
    throw new FatalError('NUXT_GITHUB_SNAPSHOT_REPO is not configured')
  }

  try {
    const { snapshotId } = await stepCreateAndSnapshot(config)

    log.info('snapshot', `✓ Workflow completed: ${snapshotId}`)

    return {
      success: true,
      snapshotId,
      sourceRepo: config.snapshotRepo,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('snapshot', `✗ Workflow failed: ${errorMessage}`)

    return {
      success: false,
      error: errorMessage,
    }
  }
}
