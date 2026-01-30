/**
 * GitHubAdapter - Platform adapter for GitHub issue comments
 *
 * This adapter demonstrates how to implement chat-sdk's Adapter interface
 * for a new platform. It handles:
 * - Webhook signature verification (HMAC-SHA256)
 * - Issue comment parsing and posting
 * - Thread ID encoding/decoding
 * - Markdown format conversion (GitHub Flavored Markdown)
 *
 * Thread ID format: github:{owner}/{repo}:issue:{number}
 * Example: github:nuxt/nuxt:issue:12345
 */

import { createHmac, createSign, timingSafeEqual } from 'node:crypto'
import type {
  Adapter,
  AdapterPostableMessage,
  Author,
  ChatInstance,
  EmojiValue,
  FetchOptions,
  FetchResult,
  FormattedContent,
  RawMessage,
  ThreadInfo,
  WebhookOptions,
} from 'chat'
import { Message, NotImplementedError } from 'chat'
import { GitHubFormatConverter } from './markdown'

// ============================================================================
// GitHub App JWT Token Generation
// ============================================================================

/**
 * Generate a JWT for GitHub App authentication.
 * The JWT is used to authenticate as the GitHub App itself.
 */
function generateAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iat: now - 60, // Issued 60 seconds ago to account for clock drift
    exp: now + 600, // Expires in 10 minutes (max allowed by GitHub)
    iss: appId,
  }

  // Create JWT header
  const header = { alg: 'RS256', typ: 'JWT' }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')

  // Sign with RSA-SHA256
  const signatureInput = `${headerB64}.${payloadB64}`
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')

  return `${headerB64}.${payloadB64}.${signature}`
}

/**
 * Cache for installation tokens.
 * Key: installation ID, Value: { token, expiresAt }
 */
const tokenCache = new Map<number, { token: string, expiresAt: Date }>()

/**
 * Get an installation access token for a GitHub App.
 * Caches tokens and refreshes them when expired.
 */
async function getInstallationToken(
  appId: string,
  privateKey: string,
  installationId: number,
): Promise<string> {
  // Check cache
  const cached = tokenCache.get(installationId)
  if (cached && cached.expiresAt > new Date(Date.now() + 60000)) {
    // Token is still valid for at least 1 minute
    return cached.token
  }

  // Generate new token
  const jwt = generateAppJWT(appId, privateKey)

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get installation token: ${response.status} ${error}`)
  }

  const data = await response.json() as { token: string, expires_at: string }

  // Cache the token
  tokenCache.set(installationId, {
    token: data.token,
    expiresAt: new Date(data.expires_at),
  })

  return data.token
}

/**
 * Get installation ID for a repository.
 */
async function getInstallationId(
  appId: string,
  privateKey: string,
  owner: string,
  repo: string,
): Promise<number> {
  const jwt = generateAppJWT(appId, privateKey)

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get installation: ${response.status} ${error}`)
  }

  const data = await response.json() as { id: number }
  return data.id
}

/** Cache for installation IDs (repo -> installation ID) */
const installationIdCache = new Map<string, number>()

// ============================================================================
// Types
// ============================================================================

/** GitHub-specific thread ID components */
export interface GitHubThreadId {
  owner: string
  repo: string
  issueNumber: number
}

/** GitHub issue comment (raw message format) */
export interface GitHubComment {
  id: number
  node_id: string
  body: string
  user: {
    id: number
    login: string
    avatar_url: string
    type: string // "User" or "Bot"
  }
  created_at: string
  updated_at: string
  html_url: string
  issue_url: string
}

/** GitHub webhook payload for issue_comment event */
interface GitHubIssueCommentPayload {
  action: 'created' | 'edited' | 'deleted'
  issue: {
    number: number
    title: string
    state: string
    user: {
      id: number
      login: string
    }
  }
  comment: GitHubComment
  repository: {
    id: number
    name: string
    full_name: string
    owner: {
      login: string
    }
  }
  sender: {
    id: number
    login: string
    type: string
  }
}

/** Configuration for GitHubAdapter */
export interface GitHubAdapterConfig {
  /** Bot username (without @) */
  userName: string
  /** GitHub webhook secret for signature verification */
  webhookSecret: string
  /** GitHub App ID */
  appId: string
  /** GitHub App private key (PEM format) */
  appPrivateKey: string
}

// ============================================================================
// Adapter Implementation
// ============================================================================

export class GitHubAdapter implements Adapter<GitHubThreadId, GitHubComment> {

  readonly name = 'github'
  readonly userName: string

  private chat!: ChatInstance
  private webhookSecret: string
  private appId: string
  private appPrivateKey: string
  private formatConverter: GitHubFormatConverter

  constructor(config: GitHubAdapterConfig) {
    this.userName = config.userName
    this.webhookSecret = config.webhookSecret
    this.appId = config.appId
    this.appPrivateKey = config.appPrivateKey
    this.formatConverter = new GitHubFormatConverter()
  }

  /**
   * Get an access token for a specific repository.
   * Uses the GitHub App credentials to generate an installation token.
   */
  private async getToken(owner: string, repo: string): Promise<string> {
    const cacheKey = `${owner}/${repo}`

    // Get installation ID (cached)
    let installationId = installationIdCache.get(cacheKey)
    if (!installationId) {
      installationId = await getInstallationId(this.appId, this.appPrivateKey, owner, repo)
      installationIdCache.set(cacheKey, installationId)
    }

    // Get installation token (cached)
    return getInstallationToken(this.appId, this.appPrivateKey, installationId)
  }

  /**
   * Called when Chat instance is created.
   * Store reference for calling processMessage.
   */
  async initialize(chat: ChatInstance): Promise<void> {
    this.chat = chat
  }

  // ==========================================================================
  // Webhook Handling
  // ==========================================================================

  /**
   * Handle incoming GitHub webhook requests.
   * Verifies signature, parses payload, and dispatches to chat handlers.
   */
  async handleWebhook(
    request: Request,
    options?: WebhookOptions,
  ): Promise<Response> {
    const body = await request.text()

    // Verify webhook signature
    const signature = request.headers.get('X-Hub-Signature-256')
    if (!this.verifySignature(body, signature)) {
      return new Response('Invalid signature', { status: 401 })
    }

    // Check event type
    const event = request.headers.get('X-GitHub-Event')
    if (event === 'ping') {
      return new Response('pong', { status: 200 })
    }

    if (event !== 'issue_comment') {
      // Ignore other events for now
      return new Response('OK', { status: 200 })
    }

    const payload = JSON.parse(body) as GitHubIssueCommentPayload

    // Only handle new comments
    if (payload.action !== 'created') {
      return new Response('OK', { status: 200 })
    }

    // Ignore bot's own comments to prevent loops
    // For GitHub Apps, the username is "app-slug[bot]"
    const botUserName = `${this.userName}[bot]`
    if (payload.comment.user.login === this.userName || payload.comment.user.login === botUserName) {
      return new Response('OK', { status: 200 })
    }

    // Build thread ID
    const threadId = this.encodeThreadId({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issueNumber: payload.issue.number,
    })

    // Parse message and dispatch to handlers
    const message = this.parseMessage(payload.comment)

    // Process message (handles mention detection, handler routing, etc.)
    this.chat.processMessage(this, threadId, message, options)

    return new Response('OK', { status: 200 })
  }

  /**
   * Verify GitHub webhook signature using HMAC-SHA256.
   */
  private verifySignature(body: string, signature: string | null): boolean {
    if (!signature || !this.webhookSecret) {
      return false
    }

    const expected
      = `sha256=${
       createHmac('sha256', this.webhookSecret).update(body).digest('hex')}`

    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    } catch {
      return false
    }
  }

  // ==========================================================================
  // Message Operations
  // ==========================================================================

  /**
   * Post a comment to a GitHub issue.
   */
  async postMessage(
    threadId: string,
    message: AdapterPostableMessage,
  ): Promise<RawMessage<GitHubComment>> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const body = this.renderPostable(message)
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

    const data = (await response.json()) as GitHubComment
    return {
      id: String(data.id),
      threadId,
      raw: data,
    }
  }

  /**
   * Edit an existing comment.
   */
  async editMessage(
    threadId: string,
    messageId: string,
    message: AdapterPostableMessage,
  ): Promise<RawMessage<GitHubComment>> {
    const { owner, repo } = this.decodeThreadId(threadId)
    const body = this.renderPostable(message)
    const token = await this.getToken(owner, repo)

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}`,
      {
        method: 'PATCH',
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

    const data = (await response.json()) as GitHubComment
    return {
      id: String(data.id),
      threadId,
      raw: data,
    }
  }

  /**
   * Delete a comment.
   */
  async deleteMessage(threadId: string, messageId: string): Promise<void> {
    const { owner, repo } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (!response.ok && response.status !== 404) {
      const error = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }
  }

  // ==========================================================================
  // Reactions
  // ==========================================================================

  /**
   * Add a reaction to a comment.
   * GitHub supports: +1, -1, laugh, confused, heart, hooray, rocket, eyes
   */
  async addReaction(
    threadId: string,
    messageId: string,
    emoji: EmojiValue | string,
  ): Promise<void> {
    const { owner, repo } = this.decodeThreadId(threadId)
    const reaction = this.emojiToGitHubReaction(emoji)
    const token = await this.getToken(owner, repo)

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}/reactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({ content: reaction }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }
  }

  /**
   * Remove a reaction from a comment.
   * Note: GitHub requires the reaction ID, so we need to list reactions first.
   */
  async removeReaction(
    threadId: string,
    messageId: string,
    emoji: EmojiValue | string,
  ): Promise<void> {
    const { owner, repo } = this.decodeThreadId(threadId)
    const reaction = this.emojiToGitHubReaction(emoji)
    const token = await this.getToken(owner, repo)

    // First, list reactions to find our reaction ID
    const listResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}/reactions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (!listResponse.ok) {
      return // Silently fail if we can't list reactions
    }

    const reactions = (await listResponse.json()) as Array<{
      id: number
      content: string
      user: { login: string }
    }>

    // Find our reaction (by bot username and emoji type)
    // Note: For GitHub Apps, the username is "app-name[bot]"
    const botUserName = `${this.userName}[bot]`
    const ourReaction = reactions.find(
      r => r.content === reaction && (r.user.login === this.userName || r.user.login === botUserName),
    )

    if (!ourReaction) {
      return // Reaction not found
    }

    // Delete the reaction
    await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/comments/${messageId}/reactions/${ourReaction.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )
  }

  /**
   * Convert chat-sdk emoji to GitHub reaction string.
   */
  private emojiToGitHubReaction(emoji: EmojiValue | string): string {
    const name = typeof emoji === 'string' ? emoji : emoji.name

    const mapping: Record<string, string> = {
      thumbs_up: '+1',
      thumbs_down: '-1',
      laugh: 'laugh',
      confused: 'confused',
      heart: 'heart',
      party: 'hooray',
      rocket: 'rocket',
      eyes: 'eyes',
      // Default to eyes for unknown emoji
    }

    return mapping[name] || 'eyes'
  }

  // ==========================================================================
  // Typing Indicator
  // ==========================================================================

  /**
   * GitHub doesn't support typing indicators.
   * We use a reaction as a workaround (eyes emoji).
   */
  async startTyping(_threadId: string): Promise<void> {
    // GitHub doesn't have typing indicators
    // Could potentially add/remove a reaction as visual feedback
  }

  // ==========================================================================
  // Fetch Operations
  // ==========================================================================

  /**
   * Fetch comments from an issue.
   */
  async fetchMessages(
    threadId: string,
    options?: FetchOptions,
  ): Promise<FetchResult<GitHubComment>> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const limit = options?.limit || 30
    const direction = options?.direction || 'backward'

    // GitHub uses page-based pagination
    let url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=${limit}`

    if (options?.cursor) {
      url += `&page=${options.cursor}`
    }

    // GitHub sorts ascending by default (oldest first)
    // For backward (most recent), we'd need to calculate the last page
    url += '&sort=created&direction=asc'

    const token = await this.getToken(owner, repo)

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }

    const comments = (await response.json()) as GitHubComment[]

    // Parse Link header for pagination
    const linkHeader = response.headers.get('Link')
    let nextCursor: string | undefined

    if (linkHeader) {
      const nextMatch = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="next"/)
      if (nextMatch) {
        nextCursor = nextMatch[1]
      }
    }

    const messages = comments.map(comment => this.parseMessage(comment))

    // Reverse if backward direction to get most recent first
    if (direction === 'backward') {
      messages.reverse()
    }

    return {
      messages,
      nextCursor,
    }
  }

  /**
   * Fetch thread (issue) metadata.
   */
  async fetchThread(threadId: string): Promise<ThreadInfo> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GitHub API error: ${response.status} - ${error}`)
    }

    const issue = (await response.json()) as {
      number: number
      title: string
      state: string
      html_url: string
    }

    return {
      id: threadId,
      channelId: `${owner}/${repo}`,
      channelName: `${owner}/${repo}#${issueNumber}`,
      isDM: false,
      metadata: {
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
      },
    }
  }

  /**
   * Fetch full issue context for AI agent.
   * Includes title, body, labels, and recent comments.
   */
  async fetchIssueContext(threadId: string): Promise<{
    number: number
    title: string
    body: string | null
    labels: string[]
    state: string
    owner: string
    repo: string
    previousComments?: Array<{
      author: string
      body: string
      isBot: boolean
    }>
  }> {
    const { owner, repo, issueNumber } = this.decodeThreadId(threadId)
    const token = await this.getToken(owner, repo)

    // Fetch issue details
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

    // Fetch recent comments for context
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

  // ==========================================================================
  // Thread ID Encoding
  // ==========================================================================

  /**
   * Encode platform data into a thread ID string.
   * Format: github:{owner}/{repo}:issue:{number}
   */
  encodeThreadId(data: GitHubThreadId): string {
    return `github:${data.owner}/${data.repo}:issue:${data.issueNumber}`
  }

  /**
   * Decode thread ID string back to platform data.
   */
  decodeThreadId(threadId: string): GitHubThreadId {
    // Format: github:{owner}/{repo}:issue:{number}
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

  // ==========================================================================
  // Message Parsing & Formatting
  // ==========================================================================

  /**
   * Parse a GitHub comment into a normalized Message.
   */
  parseMessage(raw: GitHubComment): Message<GitHubComment> {
    return new Message<GitHubComment>({
      id: String(raw.id),
      threadId: '', // Will be set by caller
      text: raw.body,
      formatted: this.formatConverter.toAst(raw.body),
      raw,
      author: {
        userId: String(raw.user.id),
        userName: raw.user.login,
        fullName: raw.user.login,
        isBot: raw.user.type === 'Bot',
        // For GitHub Apps, the username is "app-slug[bot]"
        isMe: raw.user.login === this.userName || raw.user.login === `${this.userName}[bot]`,
      },
      metadata: {
        dateSent: new Date(raw.created_at),
        edited: raw.created_at !== raw.updated_at,
        editedAt:
          raw.created_at !== raw.updated_at
            ? new Date(raw.updated_at)
            : undefined,
      },
      attachments: [], // GitHub comments can have inline images but we don't extract them
    })
  }

  /**
   * Render formatted content to GitHub Flavored Markdown.
   */
  renderFormatted(content: FormattedContent): string {
    return this.formatConverter.fromAst(content)
  }

  /**
   * Render a postable message to a string.
   */
  private renderPostable(message: AdapterPostableMessage): string {
    if (typeof message === 'string') {
      return message
    }

    if ('raw' in message) {
      return message.raw
    }

    if ('markdown' in message) {
      return message.markdown
    }

    if ('ast' in message) {
      return this.formatConverter.fromAst(message.ast)
    }

    if ('card' in message) {
      // GitHub doesn't support rich cards, render as markdown
      throw new NotImplementedError('Cards are not supported on GitHub')
    }

    // CardElement directly
    throw new NotImplementedError('Cards are not supported on GitHub')
  }

}

/**
 * Create a new GitHubAdapter instance.
 */
export function createGitHubAdapter(config: GitHubAdapterConfig): GitHubAdapter {
  return new GitHubAdapter(config)
}
