import { start } from 'workflow/api'
import { defineHandler, getValidatedRouterParams } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { syncDocumentation } from '~/workflows/sync-docs'

const paramsSchema = z.object({
  source: z.string().min(1),
})

/**
 * POST /api/sync/:source
 * Sync a specific source using Vercel Sandbox.
 *
 * Params:
 * - source: Source ID to sync
 */
export default defineHandler(async (event) => {
  const { source } = await getValidatedRouterParams(event, paramsSchema.parse)
  const config = useRuntimeConfig()

  const syncConfig = {
    githubToken: config.githubToken,
    snapshotRepo: config.snapshotRepo,
    snapshotBranch: config.snapshotBranch,
  }

  const options = {
    sourceFilter: source,
  }

  await start(syncDocumentation, [syncConfig, options])

  return {
    status: 'started',
    message: `Sync workflow started for source "${source}". Use \`pnpm workflow:web\` to monitor.`,
    source,
  }
})
