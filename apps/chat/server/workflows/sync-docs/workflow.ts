/**
 * Sync Documentation Workflow
 *
 * Syncs documentation from GitHub sources into a Vercel Sandbox,
 * pushes changes to git, then takes a snapshot for instant startup.
 */

import { FatalError } from 'workflow'
import { log } from 'evlog'
import type { GitHubSource, SyncConfig, SyncResult } from './types'
import { stepSyncAll } from './steps'

export async function syncDocumentation(
  config: SyncConfig,
  sources: GitHubSource[],
): Promise<SyncResult> {
  'use workflow'

  if (!config.snapshotRepo) {
    throw new FatalError('NUXT_GITHUB_SNAPSHOT_REPO is not configured')
  }

  if (!sources || sources.length === 0) {
    throw new FatalError('No sources provided')
  }

  const { snapshotId, results, totalFiles } = await stepSyncAll(config, sources)

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  const status = failCount === 0 ? '✓' : '✗'
  log.info('sync', `${status} Done: ${successCount}/${sources.length} sources, ${totalFiles} files`)

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
