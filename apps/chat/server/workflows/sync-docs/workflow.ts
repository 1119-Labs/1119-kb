/**
 * Sync Documentation Workflow
 *
 * Syncs documentation from GitHub sources into a Vercel Sandbox,
 * then takes a snapshot for instant startup.
 *
 * Sources are passed as parameters.
 */

import { getLogger } from '@savoir/logger'
import { FatalError } from 'workflow'
import type { GitHubSource, SyncConfig, SyncResult } from './types'
import { stepSyncAllSourcesInSandbox } from './steps'

export async function syncDocumentation(
  config: SyncConfig,
  sources: GitHubSource[],
): Promise<SyncResult> {
  'use workflow'

  const logger = getLogger()

  if (!config.snapshotRepo) {
    throw new FatalError('NUXT_GITHUB_SNAPSHOT_REPO is not configured')
  }

  if (!sources || sources.length === 0) {
    throw new FatalError('No sources provided')
  }

  const { snapshotId, results } = await stepSyncAllSourcesInSandbox(sources, config)

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length
  const totalFiles = results.reduce((sum, r) => sum + (r.fileCount || 0), 0)

  const status = failCount === 0 ? '✓' : '✗'
  logger.log('sync', `${status} Done: ${successCount}/${sources.length} sources, ${totalFiles} files`)

  return {
    success: failCount === 0,
    snapshotId,
    summary: {
      total: sources.length,
      success: successCount,
      failed: failCount,
      files: totalFiles,
    },
    results,
  }
}
