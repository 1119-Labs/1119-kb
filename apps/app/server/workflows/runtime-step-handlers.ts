import { RetryableError } from 'workflow'
import { log } from 'evlog'
import { eq } from 'drizzle-orm'
import { db, schema } from '@nuxthub/db'
import { Sandbox } from '@vercel/sandbox'
import { createSandbox, createGitSource, generateAuthRepoUrl } from '../utils/sandbox/context'
import { pushChanges, generateCommitMessage } from '../utils/sandbox/git'
import { syncGitHubSource, syncYouTubeSource } from '../utils/sandbox/source-sync'
import { withVercelSandboxCredentials } from '../utils/sandbox/vercel-credentials.ts'
import { syncRequests } from '../db/schema'
import type { SnapshotConfig } from './create-snapshot/types'
import type { Source, SyncConfig, SyncSourceResult, SyncSummary } from './sync-docs/types'

export async function runtimeStepCreateAndSnapshot(config: SnapshotConfig) {
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
runtimeStepCreateAndSnapshot.maxRetries = 5

export async function runtimeStepCreateSandbox(config: SyncConfig, timeoutMs: number = 10 * 60 * 1000) {
  const stepId = 'stepCreateSandbox'
  log.info('sync', `[${stepId}] Creating sandbox from ${config.snapshotRepo}#${config.snapshotBranch}`)

  const source = createGitSource(config)
  const sandbox = await Sandbox.create(withVercelSandboxCredentials({
    source,
    timeout: timeoutMs,
    runtime: 'node24',
  }))

  log.info('sync', `[${stepId}] Sandbox created: ${sandbox.sandboxId}`)
  return { sandboxId: sandbox.sandboxId }
}
runtimeStepCreateSandbox.maxRetries = 5

export async function runtimeStepSyncSource(
  sandboxId: string,
  source: Source,
  config: { githubToken?: string; youtubeApiKey?: string },
) {
  const stepId = 'stepSyncSource'
  log.info('sync', `[${stepId}] Syncing source "${source.label}"`)

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
    const unknownSource = source as Source
    result = {
      sourceId: unknownSource.id,
      label: unknownSource.label,
      success: false,
      fileCount: 0,
      error: `Unsupported source type: ${unknownSource.type}`,
    }
  }

  if (!result.success && result.error?.includes('ECONNRESET')) {
    throw new RetryableError(`Transient error syncing ${source.label}: ${result.error}`, {
      retryAfter: 2000,
    })
  }

  log.info('sync', `[${stepId}] Source "${source.label}": ${result.success ? `synced ${result.fileCount} files` : `failed - ${result.error}`}`)
  return result
}
runtimeStepSyncSource.maxRetries = 5

export async function runtimeStepPushChanges(
  sandboxId: string,
  config: { snapshotRepo: string; snapshotBranch: string; githubToken?: string },
  results: SyncSourceResult[],
) {
  const stepId = 'stepPushChanges'
  log.info('sync', `[${stepId}] Pushing changes to ${config.snapshotRepo}#${config.snapshotBranch}`)

  const sandbox = await Sandbox.get(withVercelSandboxCredentials({ sandboxId }))
  const commitMessage = generateCommitMessage(results)
  const repoUrl = generateAuthRepoUrl(config.snapshotRepo, config.githubToken)

  const pushResult = await pushChanges(sandbox, {
    branch: config.snapshotBranch,
    repoUrl,
    commitMessage,
  })

  if (pushResult.success && pushResult.hasChanges) {
    log.info('sync', `[${stepId}] Changes pushed to repository`)
  } else if (pushResult.success && !pushResult.hasChanges) {
    log.info('sync', `[${stepId}] No changes to push`)
  } else {
    log.error('sync', `[${stepId}] Push failed: ${pushResult.error}`)
  }

  return pushResult
}
runtimeStepPushChanges.maxRetries = 5

export async function runtimeStepTakeSnapshot(sandboxId: string) {
  const stepId = 'stepTakeSnapshot'
  log.info('sync', `[${stepId}] Taking snapshot of sandbox ${sandboxId}`)

  const sandbox = await Sandbox.get(withVercelSandboxCredentials({ sandboxId }))
  const snapshot = await sandbox.snapshot()

  log.info('sync', `[${stepId}] Snapshot created: ${snapshot.snapshotId}`)
  return { snapshotId: snapshot.snapshotId }
}
runtimeStepTakeSnapshot.maxRetries = 3

export async function runtimeStepRecordVersions(results: SyncSourceResult[]) {
  const stepId = 'stepRecordVersions'

  for (const r of results) {
    if (!r.success || !r.versionFolderName || !r.refType || r.ref === undefined) continue

    try {
      await db
        .insert(schema.sourceVersions)
        .values({
          sourceId: r.sourceId,
          versionFolderName: r.versionFolderName,
          refType: r.refType,
          ref: r.ref,
          syncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.sourceVersions.sourceId, schema.sourceVersions.versionFolderName],
          set: {
            refType: r.refType,
            ref: r.ref,
            syncedAt: new Date(),
          },
        })
      log.info('sync', `[${stepId}] Recorded version ${r.versionFolderName} for source ${r.sourceId}`)
    } catch (err) {
      log.warn('sync', `[${stepId}] Failed to record version for ${r.sourceId}: ${(err as Error).message}`)
    }
  }
}

export async function runtimeStepMarkSyncRequestSuccess(
  syncRequestId: string,
  sourceCount: number,
  summary: SyncSummary,
) {
  const stepId = 'stepMarkSyncRequestSuccess'
  await db
    .update(syncRequests)
    .set({
      status: 'success',
      summary,
      error: null,
      sourceCount,
      updatedAt: new Date(),
    })
    .where(eq(syncRequests.id, syncRequestId))

  log.info('sync', `[${stepId}] Marked sync request ${syncRequestId} as success`)
}

export async function runtimeStepMarkSyncRequestFailed(
  syncRequestId: string,
  errorMessage: string,
) {
  const stepId = 'stepMarkSyncRequestFailed'
  await db
    .update(syncRequests)
    .set({
      status: 'failed',
      error: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(syncRequests.id, syncRequestId))

  log.warn('sync', `[${stepId}] Marked sync request ${syncRequestId} as failed`)
}

