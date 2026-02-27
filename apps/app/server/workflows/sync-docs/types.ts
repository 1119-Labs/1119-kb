/**
 * Types for sync-docs workflow
 */

export interface SyncConfig {
  /** Fallback token (e.g. PAT); used when no per-source token is set */
  githubToken?: string
  /** Per-source GitHub token (for App: installation token for that repo). Used for cloning each source. */
  githubTokenBySourceId?: Record<string, string>
  youtubeApiKey?: string
  snapshotRepo: string
  snapshotBranch: string
}

export interface GitHubSource {
  id: string
  type: 'github'
  label: string
  basePath: string
  repo: string
  branch: string
  contentPath: string
  outputPath: string
  readmeOnly: boolean
}

export interface YouTubeSource {
  id: string
  type: 'youtube'
  label: string
  basePath: string
  channelId: string
  handle: string
  maxVideos: number
  outputPath: string
}

export type Source = GitHubSource | YouTubeSource

export interface SyncSourceResult {
  sourceId: string
  label: string
  success: boolean
  fileCount: number
  error?: string
}

export interface SyncResult {
  success: boolean
  snapshotId?: string
  summary: {
    total: number
    success: number
    failed: number
    files: number
  }
  results: SyncSourceResult[]
}
