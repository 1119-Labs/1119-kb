import { start } from 'workflow/api'
import { defineHandler, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { syncDocumentation } from '~/workflows/sync-docs'

const bodySchema = z
  .object({
    sourceFilter: z.string().optional(),
  })
  .optional()

/**
 * POST /api/sync
 * Sync all sources using Vercel Sandbox.
 *
 * Body (optional):
 * - sourceFilter: string - Only sync a specific source
 */
export default defineHandler(async (event) => {
  const body = await readValidatedBody(event, data => bodySchema.parse(data))
  const config = useRuntimeConfig()

  const syncConfig = {
    githubToken: config.githubToken,
    snapshotRepo: config.snapshotRepo,
    snapshotBranch: config.snapshotBranch,
  }

  const options = {
    sourceFilter: body?.sourceFilter,
  }

  await start(syncDocumentation, [syncConfig, options])

  return {
    status: 'started',
    message: 'Sync workflow started. Use `pnpm workflow:web` to monitor.',
  }
})
