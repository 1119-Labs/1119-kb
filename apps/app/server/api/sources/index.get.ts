import { kv } from '@nuxthub/kv'
import { db, schema } from '@nuxthub/db'
import { asc, desc } from 'drizzle-orm'
import { KV_KEYS } from '../../utils/sandbox/types'
import { getSnapshotRepoConfig } from '../../utils/sandbox/snapshot-config'

/**
 * GET /api/sources
 * List all sources grouped by type, with versions per source (GitHub).
 *
 * Response format matches SourcesResponse from @savoir/sdk
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const hasYouTubeApiKey = !!config.youtube?.apiKey

  const [allSources, versions, lastSyncAt, snapshotConfig] = await Promise.all([
    db.select().from(schema.sources).orderBy(asc(schema.sources.label)),
    db.select().from(schema.sourceVersions).orderBy(desc(schema.sourceVersions.syncedAt)),
    kv.get<number>(KV_KEYS.LAST_SOURCE_SYNC),
    getSnapshotRepoConfig(),
  ])

  const versionsBySourceId = new Map<string, Array<{ versionFolderName: string; refType: string; ref: string; syncedAt: Date }>>()
  for (const v of versions) {
    const list = versionsBySourceId.get(v.sourceId) ?? []
    list.push({
      versionFolderName: v.versionFolderName,
      refType: v.refType,
      ref: v.ref,
      syncedAt: v.syncedAt,
    })
    versionsBySourceId.set(v.sourceId, list)
  }

  const withVersions = (s: (typeof allSources)[0]) => ({
    ...s,
    versions: versionsBySourceId.get(s.id) ?? [],
  })

  const github = allSources.filter(s => s.type === 'github').map(withVersions)
  const youtube = hasYouTubeApiKey ? allSources.filter(s => s.type === 'youtube').map(withVersions) : []

  const snapshotRepo = snapshotConfig.snapshotRepo || null
  const snapshotBranch = snapshotConfig.snapshotBranch || 'main'

  return {
    total: github.length + youtube.length,
    lastSyncAt,
    youtubeEnabled: hasYouTubeApiKey,
    snapshotRepo,
    snapshotBranch,
    snapshotRepoUrl: snapshotRepo ? `https://github.com/${snapshotRepo}` : null,
    github: {
      count: github.length,
      sources: github,
    },
    youtube: {
      count: youtube.length,
      sources: youtube,
    },
  }
})
