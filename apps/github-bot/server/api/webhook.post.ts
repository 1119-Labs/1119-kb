import { log } from 'evlog'
import { useGitHub } from '../utils/github'
import { handleMention } from '../utils/handler'
import type { GitHubIssueCommentPayload, GitHubIssuesPayload } from '../utils/types'

export default defineEventHandler(async (event) => {
  const github = useGitHub()
  const body = await readRawBody(event) || ''
  const signature = getHeader(event, 'X-Hub-Signature-256')

  if (!github.verifySignature(body, signature || null)) {
    setResponseStatus(event, 401)
    return { error: 'Invalid signature' }
  }

  const eventType = getHeader(event, 'X-GitHub-Event')

  if (eventType === 'ping') {
    return { ok: true, message: 'pong' }
  }

  if (eventType === 'issue_comment') {
    const payload = JSON.parse(body) as GitHubIssueCommentPayload

    if (payload.action !== 'created') {
      return { ok: true }
    }

    const botUserName = `${github.userName}[bot]`
    if (payload.comment.user.login === github.userName || payload.comment.user.login === botUserName) {
      return { ok: true }
    }

    const threadId = github.encodeThreadId({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issueNumber: payload.issue.number,
    })

    handleMention({
      threadId,
      messageId: String(payload.comment.id),
      text: payload.comment.body,
    }).catch(error => {
      log.error('github-bot', `Webhook handler error: ${error instanceof Error ? error.message : 'Unknown'}`)
    })

    return { ok: true }
  }

  if (eventType === 'issues') {
    const payload = JSON.parse(body) as GitHubIssuesPayload

    if (payload.action !== 'opened') {
      return { ok: true }
    }

    const botUserName = `${github.userName}[bot]`
    if (payload.issue.user.login === github.userName || payload.issue.user.login === botUserName) {
      return { ok: true }
    }

    const threadId = github.encodeThreadId({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issueNumber: payload.issue.number,
    })

    handleMention({
      threadId,
      messageId: `issue:${payload.issue.number}`,
      text: `${payload.issue.title}\n\n${payload.issue.body || ''}`,
    }).catch(error => {
      log.error('github-bot', `Webhook handler error: ${error instanceof Error ? error.message : 'Unknown'}`)
    })

    return { ok: true }
  }

  return { ok: true }
})
