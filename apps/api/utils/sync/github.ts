import { mkdir, rm, writeFile, readdir, stat, unlink, rmdir } from 'node:fs/promises'
import { resolve, join, extname } from 'pathe'
import { downloadTemplate } from 'giget'
import type { GitHubSource, SyncResult, ContentFile } from '../sources'

/**
 * Allowed file extensions for documentation
 */
const ALLOWED_EXTENSIONS = new Set(['.md', '.mdx', '.yml', '.yaml', '.json'])

/**
 * Files to always exclude
 */
const EXCLUDED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'composer.lock',
  'Gemfile.lock',
  'Cargo.lock',
  'Pipfile.lock',
  'poetry.lock',
  'uv.lock',
  'go.sum',
])

/**
 * Check if a file should be included in sync
 */
function isAllowedFile(filename: string): boolean {
  if (EXCLUDED_FILES.has(filename)) {
    return false
  }
  const ext = extname(filename).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

/**
 * Clean up non-documentation files from a directory
 * Returns the count of markdown files
 */
export async function cleanupNonDocFiles(dir: string): Promise<number> {
  let mdCount = 0

  async function processDir(currentDir: string): Promise<void> {
    let entries: string[]
    try {
      entries = await readdir(currentDir)
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry)
      let stats
      try {
        stats = await stat(fullPath)
      } catch {
        continue
      }

      if (stats.isDirectory()) {
        await processDir(fullPath)
        // Remove empty directories
        try {
          const remaining = await readdir(fullPath)
          if (remaining.length === 0) {
            await rmdir(fullPath)
          }
        } catch {
          // Directory may have been deleted
        }
      } else if (stats.isFile()) {
        if (isAllowedFile(entry)) {
          if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
            mdCount++
          }
        } else {
          // Delete non-allowed files
          try {
            await unlink(fullPath)
          } catch {
            // File may have been deleted
          }
        }
      }
    }
  }

  await processDir(dir)
  return mdCount
}

/**
 * Fetch README.md from a GitHub repository
 */
export async function fetchReadme(
  repo: string,
  branch: string
): Promise<string> {
  const readmeUrl = `https://raw.githubusercontent.com/${repo}/${branch}/README.md`
  const response = await fetch(readmeUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch README from ${repo}: ${response.statusText}`)
  }

  return response.text()
}

/**
 * Sync a GitHub source to a local directory
 */
export async function syncGitHubSource(
  source: GitHubSource,
  outputDir: string
): Promise<SyncResult> {
  const startTime = Date.now()
  const outputFolder = source.outputPath || source.id
  const targetDir = resolve(outputDir, 'docs', outputFolder)

  try {
    // Ensure output directory exists
    await mkdir(targetDir, { recursive: true })

    if (source.readmeOnly) {
      // Fetch only README.md
      const content = await fetchReadme(source.repo, source.branch)
      await writeFile(resolve(targetDir, 'README.md'), content, 'utf-8')

      return {
        sourceId: source.id,
        success: true,
        fileCount: 1,
        duration: Date.now() - startTime,
      }
    }

    // Download full content tree using giget
    const template = `gh:${source.repo}/${source.contentPath}#${source.branch}`
    await downloadTemplate(template, {
      dir: targetDir,
      force: true,
    })

    // Clean up non-documentation files
    const mdCount = await cleanupNonDocFiles(targetDir)

    // Sync additional sources if configured
    if (source.additionalSyncs) {
      for (const additional of source.additionalSyncs) {
        const additionalTemplate = `gh:${additional.repo}/${additional.contentPath}#${additional.branch}`
        try {
          await downloadTemplate(additionalTemplate, {
            dir: targetDir,
            force: false, // Don't overwrite existing files
          })
          await cleanupNonDocFiles(targetDir)
        } catch (error) {
          // Log but don't fail the entire sync
          console.warn(`[${source.id}] Additional sync failed for ${additional.repo}:`, error)
        }
      }
    }

    return {
      sourceId: source.id,
      success: true,
      fileCount: mdCount,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    return {
      sourceId: source.id,
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Reset a source directory (delete all content)
 */
export async function resetSourceDir(
  source: GitHubSource,
  outputDir: string
): Promise<void> {
  const outputFolder = source.outputPath || source.id
  const targetDir = resolve(outputDir, 'docs', outputFolder)

  try {
    await rm(targetDir, { recursive: true, force: true })
  } catch {
    // Directory might not exist
  }
}

/**
 * Collect all files from a directory as ContentFile array
 */
export async function collectFiles(dir: string, basePath = ''): Promise<ContentFile[]> {
  const files: ContentFile[] = []

  async function processDir(currentDir: string, relativePath: string): Promise<void> {
    let entries: string[]
    try {
      entries = await readdir(currentDir)
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry)
      const relPath = relativePath ? `${relativePath}/${entry}` : entry

      let stats
      try {
        stats = await stat(fullPath)
      } catch {
        continue
      }

      if (stats.isDirectory()) {
        await processDir(fullPath, relPath)
      } else if (stats.isFile() && isAllowedFile(entry)) {
        const { readFile } = await import('node:fs/promises')
        const content = await readFile(fullPath, 'utf-8')
        files.push({ path: relPath, content })
      }
    }
  }

  await processDir(dir, basePath)
  return files
}
