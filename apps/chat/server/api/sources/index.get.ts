import { db, schema } from '@nuxthub/db'
import { asc } from 'drizzle-orm'

/**
 * GET /api/sources
 * List all sources grouped by type
 *
 * Response format matches SourcesResponse from @savoir/sdk
 */
export default defineEventHandler(async () => {
  const allSources = await db.select().from(schema.sources).orderBy(asc(schema.sources.label))

  const github = allSources.filter(s => s.type === 'github')
  const youtube = allSources.filter(s => s.type === 'youtube')

  return {
    total: allSources.length,
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
