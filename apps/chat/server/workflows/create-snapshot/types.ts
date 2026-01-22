/**
 * Types for create-snapshot workflow
 * Self-contained - no external imports from app code
 */

export interface SnapshotConfig {
  githubToken?: string
  snapshotRepo: string
  snapshotBranch: string
}

export interface SnapshotResult {
  success: boolean
  snapshotId?: string
  sourceRepo?: string
  error?: string
}
