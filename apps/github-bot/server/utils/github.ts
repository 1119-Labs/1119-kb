import { createHmac, timingSafeEqual } from 'node:crypto'
import { createGitHubAuth, type GitHubAuth } from './auth'
import type { GitHubThreadId, IssueContext } from './types'

export interface GitHubConfig {
  userName: string
  webhookSecret: string
  appId: string
  appPrivateKey: string
}

let githubInstance: GitHubClient | null = null

export class GitHubClient {
  readonly userName: string
  private webhookSecret: string
  private auth: GitHubAuth

  constructor(config: GitHubConfig) {
    this.userName = config.userName
    this.webhookSecret = config.webhookSecret
    this.auth = createGitHubAuth(config.appId, config.appPrivateKey)
  }

  private getToken(owner: string, repo: string): Promise<string> {
    return this.auth.getToken(owner, repo)
  }

  verifySignature(body: string, signature: string | null): boolean {
    if (!signature || !this.webhookSecret) {
      return false
    }

    const expected = `sha256=${createHmac('sha256', this.webhookSecret).update(body).digest('hex')}`

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  encodeThreadId(data: GitHubThreadId): string {
    return `github:${data.owner}/${data.repo}:issue:${data.issueNumber}`
  }

  decodeThreadId(threadId: string): GitHubThreadId {
    const match = threadId.match(/^github:([^/]+)\/([^:]+):issue:(\d+)$/)
    if (!match || !match[1] || !match[2] || !match[3]) {
      throw new Error(`Invalid GitHub thread ID: ${threadId}`)
    }

    return {
      owner: match[1],
      repo: match[2],
      issueNumber: Number.parseInt(match[3], 10),
    }
  }

  async postComment(threadId: string, body: string): Promise<{ id: number }> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ body }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }

    return response.json() as Promise<{ id: number }>
  }

  async addReaction(threadId: string, messageId: string, reaction: string): Promise<void> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    const isIssue = messageId.startsWith('issue:')
    const url = isIssue
      ? `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/reactions`
      : `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}/reactions`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ content: reaction }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }
  }

  async removeReaction(threadId: string, messageId: string, reaction: string): Promise<void> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    const isIssue = messageId.startsWith('issue:')
    const baseUrl = isIssue
      ? `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/reactions`
      : `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}/reactions`

    const listResponse = await fetch(baseUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!listResponse.ok) return

    const reactions = (await listResponse.json()) as Array<{
      id: number
      content: string
      user: { login: string }
    }>

    const botUserName = `${this.userName}[bot]`
    const ourReaction = reactions.find(
      r => r.content === reaction && (r.user.login === this.userName || r.user.login === botUserName),
    )

    if (!ourReaction) return

    await fetch(`${baseUrl}/${ourReaction.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  }

  async fetchIssueContext(threadId: string): Promise<IssueContext> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    const issueResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (!issueResponse.ok) {
      const error = await issueResponse.text()
      throw new Error(`GitHub API error: ${issueResponse.status} - ${error}`)
    }

    const issue = (await issueResponse.json()) as {
      number: number
      title: string
      body: string | null
      state: string
      labels: Array<{ name: string }>
    }

    const commentsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=10&sort=created&direction=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    let previousComments: Array<{ author: string, body: string, isBot: boolean }> = []
    if (commentsResponse.ok) {
      const comments = (await commentsResponse.json()) as Array<{
        user: { login: string, type: string }
        body: string
      }>

      previousComments = comments.reverse().map(c => ({
        author: c.user.login,
        body: c.body,
        isBot: c.user.type === 'Bot',
      }))
    }

    return {
      number: issue.number,
      title: issue.title,
      body: issue.body,
      labels: issue.labels.map(l => l.name),
      state: issue.state,
      owner,
      repo,
      previousComments,
    }
  }
}

export function useGitHub(): GitHubClient {
  if (githubInstance) {
    return githubInstance
  }

  const config = useRuntimeConfig()

  if (!config.github.webhookSecret) {
    throw new Error('NUXT_GITHUB_WEBHOOK_SECRET is required')
  }

  const botTrigger = config.public.botTrigger as string
  const botUserName = botTrigger.replace('@', '')

  if (!config.github.appId || !config.github.appPrivateKey) {
    throw new Error('NUXT_GITHUB_APP_ID and NUXT_GITHUB_APP_PRIVATE_KEY are required')
  }

  githubInstance = new GitHubClient({
    userName: botUserName,
    webhookSecret: config.github.webhookSecret,
    appId: config.github.appId,
    appPrivateKey: config.github.appPrivateKey,
  })

  return githubInstance
}
