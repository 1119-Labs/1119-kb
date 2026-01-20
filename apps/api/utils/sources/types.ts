/**
 * Base source interface - all sources must have these fields
 */
interface BaseSource {
  /** Unique identifier for the source */
  id: string
  /** Display label */
  label: string
  /** Source type discriminator */
  type: 'github' | 'youtube' | 'custom'
}

/**
 * GitHub documentation source
 * Fetches markdown files from a GitHub repository
 */
export interface GitHubSource extends BaseSource {
  type: 'github'
  /** GitHub repository in owner/repo format */
  repo: string
  /** Branch to fetch from */
  branch: string
  /** Path to content directory in the repo */
  contentPath: string
  /** Output path in the snapshot (defaults to id) */
  outputPath?: string
  /** Only fetch README.md instead of full content tree */
  readmeOnly?: boolean
  /** Additional repos to merge into the same output folder */
  additionalSyncs?: Array<{
    repo: string
    branch: string
    contentPath: string
  }>
}

/**
 * YouTube channel source
 * Fetches video transcripts from a YouTube channel
 */
export interface YouTubeSource extends BaseSource {
  type: 'youtube'
  /** YouTube channel ID */
  channelId: string
  /** YouTube channel handle (e.g., @TheAlexLichter) */
  handle?: string
  /** Maximum number of videos to fetch */
  maxVideos?: number
}

/**
 * Custom source with user-defined fetch function
 */
export interface CustomSource extends BaseSource {
  type: 'custom'
  /** Custom fetch function returning content files */
  fetchFn: () => Promise<ContentFile[]>
}

/**
 * Union of all source types
 */
export type Source = GitHubSource | YouTubeSource | CustomSource

/**
 * Content file returned by sync operations
 */
export interface ContentFile {
  /** Relative path in output directory */
  path: string
  /** File content (markdown) */
  content: string
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Source ID */
  sourceId: string
  /** Whether sync succeeded */
  success: boolean
  /** Number of files synced */
  fileCount?: number
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  duration?: number
}

/**
 * Configuration for the snapshot repository
 */
export interface SnapshotConfig {
  /** GitHub repository in owner/repo format */
  repo: string
  /** Branch to push to */
  branch: string
  /** GitHub token for authentication */
  token: string
  /** Commit message template */
  commitMessage?: string
}
