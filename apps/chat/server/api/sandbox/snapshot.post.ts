import { start } from 'workflow/api'
import { createSnapshot } from '../../workflows/create-snapshot'

/**
 * POST /api/sandbox/snapshot
 * Create a new sandbox snapshot from the documentation repository.
 *
 * This workflow:
 * 1. Creates a sandbox from the GitHub snapshot repo
 * 2. Takes a snapshot for instant startup
 * 3. Stores the snapshot ID in KV storage
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  const snapshotConfig = {
    githubToken: config.github.token,
    snapshotRepo: config.github.snapshotRepo,
    snapshotBranch: config.github.snapshotBranch,
  }

  await start(createSnapshot, [snapshotConfig])

  return {
    status: 'started',
    message: 'Snapshot workflow started.',
  }
})
