import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'pathe'
import { defineTask } from 'nitro/task'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { getGitHubSources, type SyncResult } from '../../utils/sources'
import { syncGitHubSource, pushToSnapshot } from '../../utils/sync'

interface TaskResult {
  success: boolean
  error?: string
  summary?: {
    total: number
    success: number
    failed: number
    files: number
  }
  push?: {
    success: boolean
    commitSha?: string
    error?: string
  } | null
}

export default defineTask({
  meta: {
    name: 'sync:docs',
    description: 'Sync documentation from all GitHub sources',
  },
  async run({ payload }) {
    const { reset = false, push = true, source = undefined } = (payload || {}) as {
      reset?: boolean
      push?: boolean
      source?: string
    }

    const config = useRuntimeConfig()

    // Validate required environment variables
    if (!config.githubToken) {
      console.error('[sync:docs] GITHUB_TOKEN is not configured')
      return { result: { success: false, error: 'GITHUB_TOKEN is not configured' } as TaskResult }
    }

    if (push && !config.snapshotRepo) {
      console.error('[sync:docs] GITHUB_SNAPSHOT_REPO is not configured')
      return { result: { success: false, error: 'GITHUB_SNAPSHOT_REPO is not configured' } as TaskResult }
    }

    // Use a temporary directory for sync
    const syncDir = resolve(tmpdir(), 'savoir-sync', Date.now().toString())
    await mkdir(syncDir, { recursive: true })

    try {
      // Reset if requested
      if (reset) {
        console.log('[sync:docs] Resetting content...')
        await rm(resolve(syncDir, 'docs'), { recursive: true, force: true })
        await mkdir(resolve(syncDir, 'docs'), { recursive: true })
      }

      // Get sources to sync
      let sources = getGitHubSources()

      if (source) {
        sources = sources.filter((s) => s.id === source)
        if (sources.length === 0) {
          console.error(`[sync:docs] Source not found: ${source}`)
          return { result: { success: false, error: `Source not found: ${source}` } as TaskResult }
        }
      }

      console.log(`[sync:docs] Syncing ${sources.length} source(s)...`)

      // Sync all sources
      const results: SyncResult[] = []

      for (const src of sources) {
        console.log(`[sync:docs] Syncing ${src.id}...`)
        const result = await syncGitHubSource(src, syncDir)
        results.push(result)

        if (result.success) {
          console.log(`[sync:docs] ${src.id}: ${result.fileCount} files in ${result.duration}ms`)
        } else {
          console.error(`[sync:docs] ${src.id} failed: ${result.error}`)
        }
      }

      const successCount = results.filter((r) => r.success).length
      const failCount = results.filter((r) => !r.success).length
      const totalFiles = results.reduce((sum, r) => sum + (r.fileCount || 0), 0)

      console.log(`[sync:docs] Sync complete: ${successCount} succeeded, ${failCount} failed, ${totalFiles} files`)

      // Push to snapshot repository if enabled
      let pushResult = null
      if (push && successCount > 0) {
        console.log(`[sync:docs] Pushing to ${config.snapshotRepo}...`)
        pushResult = await pushToSnapshot(syncDir, {
          repo: config.snapshotRepo,
          branch: config.snapshotBranch || 'main',
          token: config.githubToken,
          message: `chore: sync ${successCount} sources (${totalFiles} files)`,
        })

        if (pushResult.success) {
          console.log(`[sync:docs] Pushed ${pushResult.filesChanged} files, commit: ${pushResult.commitSha}`)
        } else {
          console.error(`[sync:docs] Push failed: ${pushResult.error}`)
        }
      }

      // Cleanup temp directory
      await rm(syncDir, { recursive: true, force: true }).catch(() => {})

      const taskResult: TaskResult = {
        success: failCount === 0,
        summary: {
          total: sources.length,
          success: successCount,
          failed: failCount,
          files: totalFiles,
        },
        push: pushResult
          ? {
              success: pushResult.success,
              commitSha: pushResult.commitSha,
              error: pushResult.error,
            }
          : null,
      }

      return { result: taskResult }
    } catch (error) {
      // Cleanup on error
      await rm(syncDir, { recursive: true, force: true }).catch(() => {})

      console.error('[sync:docs] Failed:', error)
      return {
        result: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        } as TaskResult,
      }
    }
  },
})
