import type { GitHubSource, SyncResult } from '../utils/index.js'
import { syncGitHubSource } from '../utils/index.js'

export async function syncSingleSource(
  source: GitHubSource,
  syncDir: string
): Promise<SyncResult> {
  'use step'

  console.log(`[workflow] Syncing ${source.id}...`)
  const result = await syncGitHubSource(source, syncDir)

  if (result.success) {
    console.log(`[workflow] ${source.id}: ${result.fileCount} files in ${result.duration}ms`)
  } else {
    console.error(`[workflow] ${source.id} failed: ${result.error}`)
    throw new Error(`Failed to sync ${source.id}: ${result.error}`)
  }

  return result
}
