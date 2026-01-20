import type { SyncConfig } from '../utils/index.js'
import { pushToSnapshot } from '../utils/index.js'

export async function pushToSnapshotStep(
  syncDir: string,
  config: SyncConfig,
  successCount: number,
  totalFiles: number
): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  'use step'

  console.log(`[workflow] Pushing to ${config.snapshotRepo}...`)

  const result = await pushToSnapshot(syncDir, {
    repo: config.snapshotRepo,
    branch: config.snapshotBranch || 'main',
    token: config.githubToken,
    message: `chore: sync ${successCount} sources (${totalFiles} files)`,
  })

  if (result.success) {
    console.log(`[workflow] Pushed ${result.filesChanged} files, commit: ${result.commitSha}`)
  } else {
    throw new Error(`Push failed: ${result.error}`)
  }

  return {
    success: result.success,
    commitSha: result.commitSha,
    error: result.error,
  }
}
