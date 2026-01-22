/**
 * Workflow steps for create-snapshot
 * Each step is marked with "use step" for durability and automatic retries.
 */

import { Sandbox } from '@vercel/sandbox'
import { getLogger } from '@savoir/logger'
import type { SnapshotConfig } from './types'

/**
 * Step: Create sandbox from git repo and take snapshot
 */
export async function stepCreateSandboxAndSnapshot(config: SnapshotConfig): Promise<string> {
  'use step'

  const logger = getLogger()
  const repoUrl = `https://github.com/${config.snapshotRepo}.git`

  logger.log('snapshot', `Creating sandbox from: ${repoUrl}#${config.snapshotBranch}`)

  const source: {
    type: 'git'
    url: string
    revision: string
    username?: string
    password?: string
  } = {
    type: 'git',
    url: repoUrl,
    revision: config.snapshotBranch,
  }

  if (config.githubToken) {
    source.username = 'x-access-token'
    source.password = config.githubToken
  }

  const sandbox = await Sandbox.create({
    source,
    timeout: 2 * 60 * 1000,
    runtime: 'node24',
  })

  logger.log('snapshot', `Sandbox created: ${sandbox.sandboxId}`)
  logger.log('snapshot', 'Taking snapshot...')

  const snapshot = await sandbox.snapshot()

  logger.log('snapshot', `✓ Snapshot created: ${snapshot.snapshotId}`)
  return snapshot.snapshotId
}
