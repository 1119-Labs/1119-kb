import { start } from 'workflow/api'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db, schema } from '@nuxthub/db'
import { syncDocumentation } from '../../workflows/sync-docs/workflow'
import type { Source } from '../../workflows/sync-docs/types'
import { getSnapshotRepoConfig } from '../../utils/sandbox/snapshot-config'
import { syncRequests } from '../../db/schema'

const paramsSchema = z.object({
  source: z.string().min(1),
})

/**
 * POST /api/sync/:source
 * Sync a specific source using Vercel Sandbox (admin only).
 */
export default defineEventHandler(async (event) => {
  const requestLog = useLogger(event)
  await requireAdmin(event)
  const { source: sourceId } = await getValidatedRouterParams(event, paramsSchema.parse)
  requestLog.set({ sourceId })
  const config = useRuntimeConfig()
  const snapshotConfig = await getSnapshotRepoConfig()

  const dbSource = await db.query.sources.findFirst({
    where: eq(schema.sources.id, sourceId),
  })

  if (!dbSource) {
    throw createError({
      statusCode: 404,
      message: `Source not found: ${sourceId}`,
      data: { why: 'No source exists with this ID in the database', fix: 'Verify the source ID from the sources list' },
    })
  }

  let source: Source
  if (dbSource.type === 'github') {
    source = {
      id: dbSource.id,
      type: 'github',
      label: dbSource.label,
      basePath: dbSource.basePath || '/docs',
      repo: dbSource.repo || '',
      branch: dbSource.branch || 'main',
      refType: (dbSource.refType as 'branch' | 'tag' | 'release' | 'commit') ?? 'branch',
      contentPath: dbSource.contentPath || '',
      outputPath: dbSource.outputPath || dbSource.id,
      readmeOnly: dbSource.readmeOnly ?? false,
    }
  } else {
    // YouTube source
    source = {
      id: dbSource.id,
      type: 'youtube',
      label: dbSource.label,
      basePath: dbSource.basePath || '/docs',
      channelId: dbSource.channelId || '',
      handle: dbSource.handle || '',
      maxVideos: dbSource.maxVideos || 50,
      outputPath: dbSource.outputPath || dbSource.id,
    }
  }

  const githubTokenBySourceId: Record<string, string> = {}
  if (source.type === 'github' && source.repo) {
    const token = await getSnapshotToken(source.repo)
    if (token) githubTokenBySourceId[source.id] = token
  }

  const syncConfig = {
    githubToken: await getSnapshotToken(),
    githubTokenBySourceId: Object.keys(githubTokenBySourceId).length > 0 ? githubTokenBySourceId : undefined,
    youtubeApiKey: config.youtube?.apiKey,
    snapshotRepo: snapshotConfig.snapshotRepo,
    snapshotBranch: snapshotConfig.snapshotBranch,
  }

  const [syncRequest] = await db
    .insert(syncRequests)
    .values({
      status: 'started',
      sourceFilter: source.id,
      sourceCount: 1,
      updatedAt: new Date(),
    })
    .returning({ id: syncRequests.id })

  if (!syncRequest) {
    throw createError({ statusCode: 500, message: 'Failed to create sync request record' })
  }

  await start(syncDocumentation, [syncConfig, [source], syncRequest.id])

  requestLog.set({ type: source.type, label: source.label, syncRequestId: syncRequest.id })

  return {
    status: 'started',
    message: `Sync workflow started for "${source.label}".`,
    source: source.id,
    syncRequestId: syncRequest.id,
  }
})
