/**
 * Workflow steps for sync-docs
 * Each step is marked with "use step" for durability and automatic retries.
 */

import { Sandbox } from '@vercel/sandbox'
import { getLogger } from '@savoir/logger'
import type { GitHubSource, SyncConfig, SyncSourceResult } from './types'

interface SyncInSandboxResult {
  snapshotId: string
  results: SyncSourceResult[]
}

/**
 * Step: Sync all sources inside a sandbox and return the snapshot ID
 */
export async function stepSyncAllSourcesInSandbox(
  sources: GitHubSource[],
  config: SyncConfig,
): Promise<SyncInSandboxResult> {
  'use step'

  const logger = getLogger()
  const repoUrl = `https://github.com/${config.snapshotRepo}.git`

  logger.log('sync', `Creating sandbox from ${config.snapshotRepo}#${config.snapshotBranch}`)

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
    timeout: 10 * 60 * 1000, // 10 minutes
    runtime: 'node24',
  })

  logger.log('sync', `Sandbox created: ${sandbox.sandboxId}`)

  const results: SyncSourceResult[] = []

  for (const src of sources) {
    const result = await syncSource(sandbox, src, logger)
    results.push(result)
  }

  logger.log('sync', 'Pushing changes to git repository...')
  await pushToGitRepo(sandbox, config, results, logger)

  logger.log('sync', 'Taking snapshot...')
  const snapshot = await sandbox.snapshot()
  logger.log('sync', `Snapshot created: ${snapshot.snapshotId}`)

  return {
    snapshotId: snapshot.snapshotId,
    results,
  }
}

/**
 * Push changes to git repository (internal helper, not a step)
 */
async function pushToGitRepo(
  sandbox: Sandbox,
  config: SyncConfig,
  results: SyncSourceResult[],
  logger: ReturnType<typeof getLogger>,
): Promise<void> {
  try {
    await sandbox.runCommand({
      cmd: 'git',
      args: ['config', 'user.email', 'bot@savoir.dev'],
      cwd: '/vercel/sandbox',
    })

    await sandbox.runCommand({
      cmd: 'git',
      args: ['config', 'user.name', 'Savoir Bot'],
      cwd: '/vercel/sandbox',
    })

    // Checkout the branch (create if needed)
    const checkoutResult = await sandbox.runCommand({
      cmd: 'git',
      args: ['checkout', '-B', config.snapshotBranch],
      cwd: '/vercel/sandbox',
    })

    if (checkoutResult.exitCode !== 0) {
      throw new Error(`Git checkout failed: ${await checkoutResult.stderr()}`)
    }

    // Check if there are changes
    const statusResult = await sandbox.runCommand({
      cmd: 'git',
      args: ['status', '--porcelain'],
      cwd: '/vercel/sandbox',
    })

    const hasChanges = (await statusResult.stdout()).trim().length > 0

    if (!hasChanges) {
      logger.log('sync', 'No changes to push')
      return
    }

    // Add all changes
    await sandbox.runCommand({
      cmd: 'git',
      args: ['add', 'docs/'],
      cwd: '/vercel/sandbox',
    })

    // Commit
    const timestamp = new Date().toISOString()
    const successfulSources = results.filter(r => r.success).map(r => r.sourceId)
    const totalFiles = results.reduce((sum, r) => sum + (r.fileCount || 0), 0)

    let commitMessage = `chore: sync docs (${successfulSources.length} sources, ${totalFiles} files)`
    if (successfulSources.length > 0) {
      commitMessage += `\n\nSources:\n${successfulSources.map(id => `- ${id}`).join('\n')}`
    }
    commitMessage += `\n\nTimestamp: ${timestamp}`

    const commitResult = await sandbox.runCommand({
      cmd: 'git',
      args: ['commit', '-m', commitMessage],
      cwd: '/vercel/sandbox',
    })

    if (commitResult.exitCode !== 0) {
      throw new Error(`Git commit failed: ${await commitResult.stderr()}`)
    }

    // Push to remote with force-with-lease for safety
    const repoUrl = `https://x-access-token:${config.githubToken}@github.com/${config.snapshotRepo}.git`
    const pushResult = await sandbox.runCommand({
      cmd: 'git',
      args: ['push', '--set-upstream', repoUrl, config.snapshotBranch],
      cwd: '/vercel/sandbox',
    })

    if (pushResult.exitCode !== 0) {
      throw new Error(`Git push failed: ${await pushResult.stderr()}`)
    }

    logger.log('sync', '✓ Changes pushed to repository')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.log('sync', `Git push failed: ${errorMessage}`)
    // Don't throw - we still want the snapshot to succeed
  }
}

/**
 * Sync a single source inside the sandbox (internal helper, not a step)
 */
async function syncSource(
  sandbox: Sandbox,
  source: GitHubSource,
  logger: ReturnType<typeof getLogger>,
): Promise<SyncSourceResult> {
  const outputPath = source.outputPath || source.id
  const targetDir = `/vercel/sandbox/docs/${outputPath}`

  logger.log('sync', `Syncing ${source.id} to ${targetDir}`)

  try {
    await sandbox.runCommand({
      cmd: 'mkdir',
      args: ['-p', targetDir],
      cwd: '/vercel/sandbox',
    })

    if (source.readmeOnly) {
      const readmeUrl = `https://raw.githubusercontent.com/${source.repo}/${source.branch}/README.md`
      const result = await sandbox.runCommand({
        cmd: 'curl',
        args: ['-sL', '-o', `${targetDir}/README.md`, readmeUrl],
        cwd: '/vercel/sandbox',
      })

      if (result.exitCode !== 0) {
        throw new Error(`Failed to fetch README: ${await result.stderr()}`)
      }

      return { sourceId: source.id, success: true, fileCount: 1 }
    }

    const contentPath = source.contentPath || ''
    const tempDir = `/tmp/sync-${source.id}-${Date.now()}`

    const cloneResult = await sandbox.runCommand({
      cmd: 'sh',
      args: [
        '-c',
        [
          `git clone --depth 1 --single-branch --branch ${source.branch}`,
          `--filter=blob:none --sparse`,
          `https://github.com/${source.repo}.git ${tempDir}`,
          `&& cd ${tempDir}`,
          `&& git sparse-checkout set ${contentPath || '.'}`,
        ].join(' '),
      ],
      cwd: '/vercel/sandbox',
    })

    if (cloneResult.exitCode !== 0) {
      const stderr = await cloneResult.stderr()
      throw new Error(`Git clone failed: ${stderr}`)
    }

    const sourcePath = contentPath ? `${tempDir}/${contentPath}` : tempDir
    await sandbox.runCommand({
      cmd: 'sh',
      args: ['-c', `cp -r ${sourcePath}/* ${targetDir}/ 2>/dev/null || cp -r ${sourcePath}/. ${targetDir}/`],
      cwd: '/vercel/sandbox',
    })

    await sandbox.runCommand({
      cmd: 'sh',
      args: [
        '-c',
        `find ${targetDir} -type f ! \\( -name "*.md" -o -name "*.mdx" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" \\) -delete`,
      ],
      cwd: '/vercel/sandbox',
    })

    await sandbox.runCommand({
      cmd: 'sh',
      args: ['-c', `find ${targetDir} -type d -empty -delete`],
      cwd: '/vercel/sandbox',
    })

    await sandbox.runCommand({
      cmd: 'rm',
      args: ['-rf', tempDir],
      cwd: '/vercel/sandbox',
    })

    const countResult = await sandbox.runCommand({
      cmd: 'sh',
      args: ['-c', `find ${targetDir} -type f -name "*.md" -o -name "*.mdx" | wc -l`],
      cwd: '/vercel/sandbox',
    })

    const fileCount = parseInt((await countResult.stdout()).trim()) || 0

    logger.log('sync', `${source.id}: synced ${fileCount} files`)
    return { sourceId: source.id, success: true, fileCount }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.log('sync', `${source.id}: failed - ${errorMessage}`)
    return { sourceId: source.id, success: false, fileCount: 0, error: errorMessage }
  }
}
