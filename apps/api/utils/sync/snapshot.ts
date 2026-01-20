import { readdir, stat, readFile } from 'node:fs/promises'
import { join } from 'pathe'

export interface PushResult {
  success: boolean
  commitSha?: string
  filesChanged?: number
  error?: string
}

interface GitHubTreeItem {
  path: string
  mode: '100644' | '100755' | '040000' | '160000' | '120000'
  type: 'blob' | 'tree' | 'commit'
  sha?: string
  content?: string
}

interface GitHubCommit {
  sha: string
  tree: { sha: string }
}

/**
 * Collect all files from a directory recursively
 */
async function collectAllFiles(
  dir: string,
  basePath = ''
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = []

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
      } else if (stats.isFile()) {
        try {
          const content = await readFile(fullPath, 'utf-8')
          files.push({ path: relPath, content })
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }

  await processDir(dir, basePath)
  return files
}

/**
 * Push content to a GitHub snapshot repository using the GitHub API
 * This creates a new commit with all the content
 */
export async function pushToSnapshot(
  contentDir: string,
  options: {
    repo: string
    branch: string
    token: string
    message?: string
  }
): Promise<PushResult> {
  const { repo, branch, token, message = 'chore: sync content' } = options
  const apiBase = 'https://api.github.com'

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  try {
    // 1. Collect all files from content directory
    const files = await collectAllFiles(contentDir)

    if (files.length === 0) {
      return {
        success: false,
        error: 'No files to push',
      }
    }

    // 2. Get the current commit SHA for the branch
    let baseSha: string | null = null
    let baseTreeSha: string | null = null

    try {
      const refResponse = await fetch(
        `${apiBase}/repos/${repo}/git/refs/heads/${branch}`,
        { headers }
      )

      if (refResponse.ok) {
        const refData = await refResponse.json()
        baseSha = refData.object.sha

        // Get the tree SHA from the commit
        const commitResponse = await fetch(
          `${apiBase}/repos/${repo}/git/commits/${baseSha}`,
          { headers }
        )
        if (commitResponse.ok) {
          const commitData: GitHubCommit = await commitResponse.json()
          baseTreeSha = commitData.tree.sha
        }
      }
    } catch {
      // Branch might not exist yet
    }

    // 3. Create blobs for each file and build tree
    const treeItems: GitHubTreeItem[] = []

    for (const file of files) {
      // For small files, include content directly
      // For larger files, create a blob first
      if (file.content.length < 1024 * 100) {
        // < 100KB
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: file.content,
        })
      } else {
        // Create blob for larger files
        const blobResponse = await fetch(`${apiBase}/repos/${repo}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: Buffer.from(file.content).toString('base64'),
            encoding: 'base64',
          }),
        })

        if (!blobResponse.ok) {
          const error = await blobResponse.text()
          throw new Error(`Failed to create blob for ${file.path}: ${error}`)
        }

        const blobData = await blobResponse.json()
        treeItems.push({
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        })
      }
    }

    // 4. Create a new tree
    const treeResponse = await fetch(`${apiBase}/repos/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    })

    if (!treeResponse.ok) {
      const error = await treeResponse.text()
      throw new Error(`Failed to create tree: ${error}`)
    }

    const treeData = await treeResponse.json()

    // 5. Create a new commit
    const commitPayload: Record<string, unknown> = {
      message,
      tree: treeData.sha,
    }

    if (baseSha) {
      commitPayload.parents = [baseSha]
    }

    const commitResponse = await fetch(`${apiBase}/repos/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify(commitPayload),
    })

    if (!commitResponse.ok) {
      const error = await commitResponse.text()
      throw new Error(`Failed to create commit: ${error}`)
    }

    const commitData = await commitResponse.json()

    // 6. Update the branch reference
    const refPath = baseSha
      ? `${apiBase}/repos/${repo}/git/refs/heads/${branch}`
      : `${apiBase}/repos/${repo}/git/refs`

    const refPayload = baseSha
      ? { sha: commitData.sha, force: false }
      : { ref: `refs/heads/${branch}`, sha: commitData.sha }

    const refUpdateResponse = await fetch(refPath, {
      method: baseSha ? 'PATCH' : 'POST',
      headers,
      body: JSON.stringify(refPayload),
    })

    if (!refUpdateResponse.ok) {
      const error = await refUpdateResponse.text()
      throw new Error(`Failed to update ref: ${error}`)
    }

    return {
      success: true,
      commitSha: commitData.sha,
      filesChanged: files.length,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
