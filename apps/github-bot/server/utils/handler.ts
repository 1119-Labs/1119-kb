import { log } from 'evlog'
import { generateAIResponse } from './ai'
import { useGitHub, type GitHubClient } from './github'
import type { IssueContext } from './types'

export interface MentionContext {
  threadId: string
  messageId: string
  text: string
}

export async function handleMention(ctx: MentionContext): Promise<void> {
  const github = useGitHub()

  try {
    await github.addReaction(ctx.threadId, ctx.messageId, 'eyes')

    let issueContext: IssueContext | undefined
    try {
      issueContext = await github.fetchIssueContext(ctx.threadId)
    } catch {}


    const response = await generateAIResponse(ctx.text, issueContext)

    await github.postComment(ctx.threadId, response)

    await github.removeReaction(ctx.threadId, ctx.messageId, 'eyes')
    await github.addReaction(ctx.threadId, ctx.messageId, '+1')
  } catch (error) {
    log.error('github-bot', `Error: ${error instanceof Error ? error.message : 'Unknown'}`)

    try {
      await github.postComment(ctx.threadId, `Sorry, I encountered an error while processing your request. Please try again later.

<details>
<summary>Error details</summary>

\`\`\`
${error instanceof Error ? error.message : 'Unknown error'}
\`\`\`
</details>`)
    } catch {}
  }
}
