/**
 * Step: Sync Single Source
 *
 * Syncs a single source (GitHub or YouTube) to the sandbox.
 * Each source is its own step for granular retry and observability.
 */

import { RetryableError } from 'workflow'
import { log } from 'evlog'
import { Sandbox } from '@vercel/sandbox'
import type { Source, SyncSourceResult } from '../types'
import { syncGitHubSource, syncYouTubeSource } from '../../../utils/sandbox/source-sync'
import { withVercelSandboxCredentials } from '../../../utils/sandbox/vercel-credentials.ts'

export async function stepSyncSource(
  sandboxId: string,
  source: Source,
  config: { githubToken?: string; youtubeApiKey?: string },
): Promise<SyncSourceResult> {
  'use step'

  const stepId = 'stepSyncSource'
  log.info('sync', `[${stepId}] Syncing source "${source.label}"`)

  // Reconnect to existing sandbox
  const sandbox = await Sandbox.get(withVercelSandboxCredentials({ sandboxId }))

  let result: SyncSourceResult

  if (source.type === 'github') {
    result = await syncGitHubSource(sandbox, source, config.githubToken)
  } else if (source.type === 'youtube') {
    if (!config.youtubeApiKey) {
      result = {
        sourceId: source.id,
        label: source.label,
        success: false,
        fileCount: 0,
        error: 'YouTube API key not configured',
      }
    } else {
      result = await syncYouTubeSource(sandbox, source, config.youtubeApiKey)
    }
  } else {
    // This branch handles future source types - cast to Source for access
    const unknownSource = source as Source
    result = {
      sourceId: unknownSource.id,
      label: unknownSource.label,
      success: false,
      fileCount: 0,
      error: `Unsupported source type: ${unknownSource.type}`,
    }
  }

  // If failed due to network/transient error, throw RetryableError
  if (!result.success && result.error?.includes('ECONNRESET')) {
    throw new RetryableError(`Transient error syncing ${source.label}: ${result.error}`, {
      retryAfter: 2000,
    })
  }

  log.info('sync', `[${stepId}] Source "${source.label}": ${result.success ? `synced ${result.fileCount} files` : `failed - ${result.error}`}`)

  return result
}

// Allow more retries for network operations
stepSyncSource.maxRetries = 5
