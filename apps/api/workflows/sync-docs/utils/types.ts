/**
 * Base source interface
 */
interface BaseSource {
  id: string
  label: string
  type: 'github' | 'youtube' | 'custom'
}

/**
 * GitHub documentation source
 */
export interface GitHubSource extends BaseSource {
  type: 'github'
  repo: string
  branch: string
  contentPath: string
  outputPath?: string
  readmeOnly?: boolean
  additionalSyncs?: Array<{
    repo: string
    branch: string
    contentPath: string
  }>
}

/**
 * YouTube channel source
 */
export interface YouTubeSource extends BaseSource {
  type: 'youtube'
  channelId: string
  handle?: string
  maxVideos?: number
}

/**
 * Custom source
 */
export interface CustomSource extends BaseSource {
  type: 'custom'
  fetchFn: () => Promise<ContentFile[]>
}

export type Source = GitHubSource | YouTubeSource | CustomSource

export interface ContentFile {
  path: string
  content: string
}

export interface SyncResult {
  sourceId: string
  success: boolean
  fileCount?: number
  error?: string
  duration?: number
}

export interface SnapshotConfig {
  repo: string
  branch: string
  token: string
  commitMessage?: string
}

export interface SyncConfig {
  githubToken: string
  snapshotRepo: string
  snapshotBranch: string
}

export interface SyncOptions {
  reset?: boolean
  push?: boolean
  sourceFilter?: string
}

export interface PushResult {
  success: boolean
  commitSha?: string
  filesChanged?: number
  error?: string
}
