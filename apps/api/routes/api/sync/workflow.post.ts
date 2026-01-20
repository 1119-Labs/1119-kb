import { start } from 'workflow/api'
import { defineHandler, readValidatedBody } from 'nitro/h3'
import { useRuntimeConfig } from 'nitro/runtime-config'
import { z } from 'zod'
import { syncDocumentation } from '~/workflows/sync-docs'

const bodySchema = z
  .object({
    reset: z.boolean().default(false),
    push: z.boolean().default(true),
    source: z.string().optional(),
  })
  .optional()

/**
 * POST /api/sync/workflow
 * Triggers the sync workflow asynchronously.
 *
 * Body (optional):
 * - reset: boolean - Clear all content before sync (default: false)
 * - push: boolean - Push to snapshot repo after sync (default: true)
 * - source: string - Sync only this source ID (optional)
 */
export default defineHandler(async (event) => {
  const body = await readValidatedBody(event, (data) => bodySchema.parse(data))
  const config = useRuntimeConfig()

  const syncConfig = {
    githubToken: config.githubToken,
    snapshotRepo: config.snapshotRepo,
    snapshotBranch: config.snapshotBranch,
  }

  const options = {
    reset: body?.reset ?? false,
    push: body?.push ?? true,
    sourceFilter: body?.source,
  }

  await start(syncDocumentation, [syncConfig, options])

  return {
    status: 'started',
    message: 'Sync workflow started. Use `pnpm workflow:web` to monitor.',
    options,
  }
})
