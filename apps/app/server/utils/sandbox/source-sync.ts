import type { Sandbox } from '@vercel/sandbox'
import { createError, log } from 'evlog'
import { youtube } from '@googleapis/youtube'
import { YoutubeTranscript } from 'youtube-transcript'
import type { GitHubSource, Source, SyncSourceResult, YouTubeSource } from '../../workflows/sync-docs/types'

function generateAuthRepoUrl(repoPath: string, token?: string): string {
  if (!token) {
    return `https://github.com/${repoPath}.git`
  }
  // Encode token so PATs with +, /, = (e.g. base64-like) don't break the URL
  const encoded = encodeURIComponent(token)
  return `https://x-access-token:${encoded}@github.com/${repoPath}.git`
}

/** Fetches the latest release tag name from GitHub API. Uses token for private repos and rate limits. */
async function fetchLatestReleaseTag(repo: string, token?: string): Promise<string> {
  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    throw createError({
      message: `Invalid repo format: ${repo}`,
      why: 'Expected owner/repo',
      fix: 'Use GitHub repo in owner/repo format',
    })
  }
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  const res = await $fetch<{ tag_name: string }>(
    `https://api.github.com/repos/${owner}/${repoName}/releases/latest`,
    { headers },
  ).catch((err: { statusCode?: number; data?: { message?: string } }) => {
    if (err.statusCode === 404) {
      throw createError({
        message: `No releases found for ${repo}`,
        why: 'This repository has no GitHub releases',
        fix: 'Create a release or use a branch/tag instead',
      })
    }
    const msg = err?.data?.message ?? (err as Error).message
    throw createError({
      message: `Failed to fetch latest release for ${repo}`,
      why: String(msg),
      fix: 'Check repo access and GitHub API rate limits',
    })
  })
  return res.tag_name
}

/** Fetches latest commit SHA for a branch from GitHub API. */
async function fetchBranchHeadCommit(repo: string, branch: string, token?: string): Promise<string> {
  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    throw createError({
      message: `Invalid repo format: ${repo}`,
      why: 'Expected owner/repo',
      fix: 'Use GitHub repo in owner/repo format',
    })
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const encodedBranch = encodeURIComponent(branch)
  const res = await $fetch<{ sha: string }>(
    `https://api.github.com/repos/${owner}/${repoName}/commits/${encodedBranch}`,
    { headers },
  ).catch((err: { statusCode?: number; data?: { message?: string } }) => {
    const msg = err?.data?.message ?? (err as Error).message
    throw createError({
      message: `Failed to fetch latest commit for ${repo}@${branch}`,
      why: String(msg),
      fix: 'Check that branch exists and token has access if private',
    })
  })

  return res.sha
}

interface ResolvedGitRef {
  cloneRef: string
  versionRefType: 'commit' | 'tag' | 'release'
  versionRef: string
}

/**
 * Resolves refs for syncing:
 * - branch -> clone by branch, version by latest branch commit SHA
 * - commit -> clone/version by commit SHA
 * - tag -> clone/version by tag
 * - release(latest) -> resolve latest tag, then clone/version by that tag
 */
async function resolveGitRefs(source: GitHubSource, githubToken?: string): Promise<ResolvedGitRef> {
  const refType = source.refType ?? 'branch'
  const refValue = source.branch || 'main'

  if (refType === 'branch') {
    const commitSha = await fetchBranchHeadCommit(source.repo, refValue, githubToken)
    return {
      cloneRef: refValue,
      versionRefType: 'commit',
      versionRef: commitSha,
    }
  }

  if (refType === 'commit') {
    const commitSha = await fetchBranchHeadCommit(source.repo, refValue, githubToken)
    return {
      cloneRef: commitSha,
      versionRefType: 'commit',
      versionRef: commitSha,
    }
  }

  if (refType === 'release' && refValue.toLowerCase() === 'latest') {
    const latestTag = await fetchLatestReleaseTag(source.repo, githubToken)
    return {
      cloneRef: latestTag,
      versionRefType: 'release',
      versionRef: latestTag,
    }
  }

  return {
    cloneRef: refValue,
    versionRefType: refType,
    versionRef: refValue,
  }
}

/** Returns version folder name for snapshot layout: [commit]-<sha>, [tag]-<ref>, [release]-<ref> */
export function getVersionFolderName(refType: 'commit' | 'tag' | 'release', ref: string): string {
  const prefix = refType === 'commit' ? '[commit]' : refType === 'tag' ? '[tag]' : '[release]'
  return `${prefix}-${ref}`
}

interface YouTubeVideo {
  id: string
  title: string
  description: string
  publishedAt: string
  thumbnailUrl: string
}

interface VideoIndex {
  id: string
  title: string
  publishedAt: string
  file: string
  hasTranscript: boolean
}

/** Syncs GitHub source to sandbox, returns result with file count and status */
export async function syncGitHubSource(
  sandbox: Sandbox,
  source: GitHubSource,
  githubToken?: string,
): Promise<SyncSourceResult> {
  const basePath = source.basePath || '/docs'
  const outputPath = source.outputPath || source.id

  try {
    const resolvedRefs = await resolveGitRefs(source, githubToken)
    const versionFolder = getVersionFolderName(resolvedRefs.versionRefType, resolvedRefs.versionRef)
    const targetDir = `/vercel/sandbox${basePath}/${outputPath}/${versionFolder}`

    const sourceWithRef: GitHubSource = { ...source, branch: resolvedRefs.cloneRef }

    await sandbox.runCommand({
      cmd: 'mkdir',
      args: ['-p', targetDir],
      cwd: '/vercel/sandbox',
    })

    let fileCount: number
    if (source.readmeOnly) {
      fileCount = await syncReadmeOnly(sandbox, sourceWithRef, targetDir)
    } else {
      fileCount = await syncFullRepository(sandbox, sourceWithRef, targetDir, githubToken)
    }

    return {
      sourceId: source.id,
      label: source.label,
      success: true,
      fileCount,
      versionFolderName: versionFolder,
      refType: resolvedRefs.versionRefType,
      ref: resolvedRefs.versionRef,
    }
  } catch (error) {
    const err = error as Error & { data?: { why?: string } }
    const message = err?.message ?? String(error)
    const why = err?.data?.why
    const errorMessage = why ? `${message} — ${why}` : message
    return { sourceId: source.id, label: source.label, success: false, fileCount: 0, error: errorMessage }
  }
}

/** Fetches and saves README.md from repository to target directory */
async function syncReadmeOnly(
  sandbox: Sandbox,
  source: GitHubSource,
  targetDir: string,
): Promise<number> {
  const readmeUrl = `https://raw.githubusercontent.com/${source.repo}/${source.branch}/README.md`

  const result = await sandbox.runCommand({
    cmd: 'curl',
    args: ['-sL', '-o', `${targetDir}/README.md`, readmeUrl],
    cwd: '/vercel/sandbox',
  })

  if (result.exitCode !== 0) {
    throw createError({
      message: `Failed to fetch README from ${source.repo}`,
      why: await result.stderr(),
      fix: 'Ensure the repository is public or token has access, and README.md exists',
    })
  }

  return 1
}

/** Clones repository with sparse checkout, copies content path, and filters to keep only docs files */
async function syncFullRepository(
  sandbox: Sandbox,
  source: GitHubSource,
  targetDir: string,
  githubToken?: string,
): Promise<number> {
  const contentPath = source.contentPath || ''
  const tempDir = `/tmp/sync-${source.id}-${Date.now()}`
  const repoUrl = generateAuthRepoUrl(source.repo, githubToken)

  // When contentPath is empty we need the full repo (all subfolders). In cone mode,
  // "sparse-checkout set ." only includes root-level files (parent pattern), not
  // files in subfolders. So we clone with sparse, set a path, then disable
  // sparse-checkout to populate the full tree when syncing the whole repo.
  const sparsePath = contentPath || '.'
  const cloneResult = await sandbox.runCommand({
    cmd: 'sh',
    args: [
      '-c',
      source.refType === 'commit'
        ? [
            `git clone --depth 1 --no-checkout --filter=blob:none --sparse ${repoUrl} ${tempDir}`,
            `&& cd ${tempDir}`,
            `&& git fetch --depth 1 origin ${source.branch}`,
            `&& git checkout --detach FETCH_HEAD`,
            `&& git sparse-checkout set ${sparsePath}`,
            contentPath ? '' : '&& git sparse-checkout disable',
        ].filter(Boolean).join(' ')
        : [
            `git clone --depth 1 --single-branch --branch ${source.branch}`,
            `--filter=blob:none --sparse`,
            `${repoUrl} ${tempDir}`,
            `&& cd ${tempDir}`,
            `&& git sparse-checkout set ${sparsePath}`,
            contentPath ? '' : '&& git sparse-checkout disable',
        ].filter(Boolean).join(' '),
    ],
    cwd: '/vercel/sandbox',
  })

  if (cloneResult.exitCode !== 0) {
    const stderr = await cloneResult.stderr()
    throw createError({
      message: `Failed to clone repository ${source.repo}`,
      why: stderr,
      fix: 'Check that the repository exists, branch is correct, and token has access if private',
    })
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
    args: ['-c', `find ${targetDir} -type f \\( -name "*.md" -o -name "*.mdx" -o -name "*.yml" -o -name "*.yaml" -o -name "*.json" \\) | wc -l`],
    cwd: '/vercel/sandbox',
  })

  const count = parseInt((await countResult.stdout()).trim()) || 0
  if (count === 0) {
    log.warn('sync', `Source ${source.repo} (contentPath: ${contentPath || '.'}) produced 0 doc files after sync — check ref "${source.branch}" and path contain .md/.mdx/.yml/.yaml/.json`)
  }
  return count
}

/** Synchronizes a YouTube channel to the sandbox filesystem */
export async function syncYouTubeSource(
  sandbox: Sandbox,
  source: YouTubeSource,
  apiKey: string,
): Promise<SyncSourceResult> {
  try {
    log.info('sync', `Starting YouTube sync for ${source.label} (${source.channelId})`)

    const videos = await fetchChannelVideos(source.channelId, source.maxVideos, apiKey)
    log.info('sync', `Found ${videos.length} videos to sync`)

    if (videos.length === 0) {
      return {
        sourceId: source.id,
        label: source.label,
        success: true,
        fileCount: 0,
      }
    }

    const targetDir = `${source.basePath}/${source.outputPath}`
    await sandbox.runCommand({
      cmd: 'mkdir',
      args: ['-p', targetDir],
      cwd: '/vercel/sandbox',
    })

    const videosIndex: VideoIndex[] = []
    let successCount = 0

    for (const video of videos) {
      try {
        const transcript = await fetchVideoTranscript(video.id)
        const markdown = generateVideoMarkdown(video, transcript)
        const filename = `${video.id}-${slugify(video.title)}.md`
        const filepath = `${targetDir}/${filename}`

        // Write file using shell command
        await sandbox.runCommand({
          cmd: 'sh',
          args: ['-c', `cat > '${filepath}' << 'EOFMARKER'\n${markdown}\nEOFMARKER`],
          cwd: '/vercel/sandbox',
        })

        videosIndex.push({
          id: video.id,
          title: video.title,
          publishedAt: video.publishedAt,
          file: filename,
          hasTranscript: !!transcript,
        })
        successCount++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        log.warn('sync', `Failed to sync video ${video.id}: ${errorMessage}`)
      }
    }

    const indexData = {
      lastSync: new Date().toISOString(),
      totalVideos: successCount,
      channelId: source.channelId,
      handle: source.handle,
      videos: videosIndex,
    }
    // Write index file
    const indexContent = JSON.stringify(indexData, null, 2)
    await sandbox.runCommand({
      cmd: 'sh',
      args: ['-c', `cat > '${targetDir}/videos.json' << 'EOFMARKER'\n${indexContent}\nEOFMARKER`],
      cwd: '/vercel/sandbox',
    })

    log.info('sync', `YouTube sync completed: ${successCount}/${videos.length} videos`)

    return {
      sourceId: source.id,
      label: source.label,
      success: true,
      fileCount: successCount + 1,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    log.error('sync', `YouTube sync failed for ${source.label}: ${errorMessage}`)
    return {
      sourceId: source.id,
      label: source.label,
      success: false,
      fileCount: 0,
      error: errorMessage,
    }
  }
}

async function fetchChannelVideos(
  channelId: string,
  maxVideos: number,
  apiKey: string,
): Promise<YouTubeVideo[]> {
  const yt = youtube({ version: 'v3', auth: apiKey })
  const videos: YouTubeVideo[] = []
  let pageToken: string | undefined

  while (videos.length < maxVideos) {
    try {
      const response = await yt.search.list({
        part: ['snippet'],
        channelId,
        maxResults: Math.min(50, maxVideos - videos.length),
        order: 'date',
        type: ['video'],
        pageToken,
      })

      for (const item of response.data.items || []) {
        if (!item.id?.videoId)
          continue

        videos.push({
          id: item.id.videoId,
          title: item.snippet?.title || 'Untitled',
          description: item.snippet?.description || '',
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          thumbnailUrl: item.snippet?.thumbnails?.high?.url || '',
        })
      }

      pageToken = response.data.nextPageToken || undefined
      if (!pageToken)
        break
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      log.error('sync', `Failed to fetch videos from channel ${channelId}: ${errorMessage}`)
      throw error
    }
  }

  return videos.slice(0, maxVideos)
}

async function fetchVideoTranscript(videoId: string): Promise<string | null> {
  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId)

    if (!transcriptItems || transcriptItems.length === 0) {
      log.warn('sync', `No transcript found for video ${videoId}`)
      return null
    }

    const transcript = transcriptItems
      .map(item => item.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    return transcript
  } catch (error) {
    log.warn('sync', `Failed to fetch transcript for ${videoId}: ${error}`)
    return null
  }
}

function generateVideoMarkdown(video: YouTubeVideo, transcript: string | null): string {
  const escapedTitle = video.title.replace(/"/g, '\\"')
  const escapedDescription = video.description
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .slice(0, 200)

  const publishedDate = new Date(video.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `---
title: "${escapedTitle}"
description: "${escapedDescription}"
videoId: "${video.id}"
publishedAt: "${video.publishedAt}"
url: "https://youtube.com/watch?v=${video.id}"
hasTranscript: ${!!transcript}
---

# ${video.title}

> Published on ${publishedDate}

## Description

${video.description}

## Watch on YouTube

[Watch this video](https://youtube.com/watch?v=${video.id})

${transcript ? `## Transcript\n\n${transcript}` : '⚠️ No transcript available for this video'}
`
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

/** Syncs all sources sequentially, returns array of results */
export async function syncSources(
  sandbox: Sandbox,
  sources: Source[],
  config?: { githubToken?: string; youtubeApiKey?: string },
): Promise<SyncSourceResult[]> {
  const results: SyncSourceResult[] = []

  for (const source of sources) {
    let result: SyncSourceResult

    if (source.type === 'github') {
      result = await syncGitHubSource(sandbox, source, config?.githubToken)
    } else if (source.type === 'youtube') {
      if (!config?.youtubeApiKey) {
        result = {
          sourceId: source.id,
          label: source.label,
          success: false,
          fileCount: 0,
          error: 'YouTube API key not configured',
        }
      } else {
        result = await syncYouTubeSource(sandbox, source, config.youtubeApiKey)
      }
    } else {
      const unknownSource = source as Source
      result = {
        sourceId: unknownSource.id,
        label: unknownSource.label,
        success: false,
        fileCount: 0,
        error: `Unsupported source type: ${unknownSource.type}`,
      }
    }

    results.push(result)
  }

  return results
}
