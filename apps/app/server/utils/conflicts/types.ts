export const DEFAULT_CONFLICT_MODEL = 'anthropic/claude-opus-4.6'

export interface SourceWithLatestVersion {
  id: string
  label: string
  basePath: string | null
  outputPath: string | null
  latestVersion: {
    id: string
    versionFolderName: string
    syncedAt: Date
  }
}

export interface DetectedConflict {
  topic: string
  claimA: string
  claimB: string
  severity: 'high' | 'medium' | 'low'
  confidence: number
  rationale: string
}

export interface ConflictRunResult {
  checkedPairs: number
  sourceCount: number
  conflictCount: number
}
