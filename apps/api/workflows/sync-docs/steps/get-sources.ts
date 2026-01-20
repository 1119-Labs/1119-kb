import { FatalError } from 'workflow'
import type { GitHubSource } from '../utils/index.js'
import { getGitHubSources, getSourceById } from '../utils/index.js'

export async function getSourcesToSync(sourceFilter?: string): Promise<GitHubSource[]> {
  'use step'

  let sources = getGitHubSources()

  if (sourceFilter) {
    const source = getSourceById(sourceFilter)
    if (!source || source.type !== 'github') {
      throw new FatalError(`Source not found: ${sourceFilter}`)
    }
    sources = [source as GitHubSource]
  }

  console.log(`[workflow] Found ${sources.length} source(s) to sync`)
  return sources
}
