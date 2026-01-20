import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'pathe'

export async function prepareWorkspace(reset: boolean): Promise<string> {
  'use step'

  const syncDir = resolve(tmpdir(), 'savoir-sync', Date.now().toString())
  await mkdir(syncDir, { recursive: true })

  if (reset) {
    await rm(resolve(syncDir, 'docs'), { recursive: true, force: true })
  }

  await mkdir(resolve(syncDir, 'docs'), { recursive: true })
  console.log(`[workflow] Workspace ready: ${syncDir}`)

  return syncDir
}
