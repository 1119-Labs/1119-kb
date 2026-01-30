/**
 * GitHub Chat Instance
 *
 * This module creates and configures the chat-sdk Chat instance
 * with the GitHub adapter and message handlers.
 *
 * The singleton pattern ensures we reuse the same instance across requests.
 */

import { Chat } from 'chat'
import { createGitHubAdapter, type GitHubAdapter } from './adapter'
import { generateAIResponse, type IssueContext } from './ai'
import { KVStateAdapter } from './state-kv'

let chatInstance: Chat | null = null

/**
 * Get or create the GitHub Chat instance.
 *
 * This is a singleton - the same instance is reused across all requests.
 * The Chat instance is configured with:
 * - GitHubAdapter for handling GitHub webhooks
 * - KVStateAdapter for persistent state (subscriptions, locks)
 * - Message handlers for processing mentions
 */
export function useGitHubChat(): Chat {
  if (chatInstance) {
    return chatInstance
  }

  const config = useRuntimeConfig()

  // Validate required config
  if (!config.github.webhookSecret) {
    throw new Error('NUXT_GITHUB_WEBHOOK_SECRET is required')
  }

  // Extract bot username from trigger (remove @ prefix)
  const botTrigger = config.public.botTrigger as string
  const botUserName = botTrigger.replace('@', '')

  // Validate GitHub App credentials
  if (!config.github.appId || !config.github.appPrivateKey) {
    throw new Error('NUXT_GITHUB_APP_ID and NUXT_GITHUB_APP_PRIVATE_KEY are required')
  }

  // Create the Chat instance
  chatInstance = new Chat({
    userName: botUserName,
    adapters: {
      github: createGitHubAdapter({
        userName: botUserName,
        webhookSecret: config.github.webhookSecret,
        appId: config.github.appId,
        appPrivateKey: config.github.appPrivateKey,
      }),
    },
    state: new KVStateAdapter(),
    logger: 'info',
  })

  // ==========================================================================
  // Message Handlers
  // ==========================================================================

  /**
   * Handle @mentions in unsubscribed threads.
   *
   * This is the main entry point for the bot. When someone mentions
   * the bot in an issue comment, we:
   * 1. Add an "eyes" reaction to show we're processing
   * 2. Search the documentation for relevant content
   * 3. Generate an AI response
   * 4. Post the response as a comment
   * 5. Update reactions to show completion
   */
  chatInstance.onNewMention(async (thread, message) => {
    const logger = console

    logger.info(`[github-bot] New mention from @${message.author.userName}`)
    logger.info(`[github-bot] Message: ${message.text.slice(0, 100)}...`)

    try {
      // Add "eyes" reaction to indicate we're processing
      const adapter = thread.adapter as GitHubAdapter
      await adapter.addReaction(thread.id, message.id, 'eyes')

      // Fetch full issue context for the AI agent
      let issueContext: IssueContext | undefined
      try {
        issueContext = await adapter.fetchIssueContext(thread.id)
        logger.info(`[github-bot] Fetched issue context: "${issueContext.title}"`)
      } catch (err) {
        logger.warn(`[github-bot] Could not fetch issue context:`, err)
      }

      // Generate AI response with full context
      const response = await generateAIResponse(message.text, issueContext)

      // Post the response
      await thread.post({ markdown: response })

      // Update reactions: remove eyes, add checkmark
      await adapter.removeReaction(thread.id, message.id, 'eyes')
      await adapter.addReaction(thread.id, message.id, 'thumbs_up')

      logger.info(`[github-bot] Response posted successfully`)
    } catch (error) {
      logger.error(`[github-bot] Error processing message:`, error)

      // Try to post an error message
      try {
        await thread.post({
          markdown: `Sorry, I encountered an error while processing your request. Please try again later.\n\n<details>\n<summary>Error details</summary>\n\n\`\`\`\n${error instanceof Error ? error.message : 'Unknown error'}\n\`\`\`\n</details>`,
        })
      } catch {
        // Ignore error posting failure
      }
    }
  })

  /**
   * Handle messages in subscribed threads (optional).
   *
   * If you want the bot to continue responding in a thread after
   * the initial mention, you can subscribe to the thread and handle
   * follow-up messages here.
   *
   * For now, we don't subscribe - each interaction requires a new @mention.
   */
  // chatInstance.onSubscribedMessage(async (thread, message) => {
  //   // Handle follow-up messages in subscribed threads
  // });

  return chatInstance
}
