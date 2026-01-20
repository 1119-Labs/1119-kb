import { rm } from 'node:fs/promises'

export async function cleanupWorkspace(syncDir: string): Promise<void> {
  'use step'

  try {
    await rm(syncDir, { recursive: true, force: true })
    console.log('[workflow] Workspace cleaned up')
  } catch {
    console.warn('[workflow] Failed to cleanup workspace')
  }
}
