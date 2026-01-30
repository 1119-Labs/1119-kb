/**
 * AI Agent for GitHub Bot
 *
 * Uses AI SDK's generateText with Savoir SDK tools to answer questions
 * by searching and reading documentation iteratively.
 */

import { ToolLoopAgent, stepCountIs } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { createSavoir } from '@savoir/sdk'

/**
 * Issue context for the AI agent
 */
export interface IssueContext {
  /** Issue number */
  number: number
  /** Issue title */
  title: string
  /** Issue body/description */
  body: string | null
  /** Issue labels */
  labels: string[]
  /** Issue state (open/closed) */
  state: string
  /** Repository owner */
  owner: string
  /** Repository name */
  repo: string
  /** Previous comments in the thread (for context) */
  previousComments?: Array<{
    author: string
    body: string
    isBot: boolean
  }>
}

/**
 * Generate an AI response using the Savoir SDK tools.
 *
 * This function:
 * 1. Creates a Savoir client with documentation tools
 * 2. Uses the AI SDK to generate a response with tool calling
 * 3. The agent can search and read documentation iteratively
 *
 * @param question - The user's question/message
 * @param context - Full context from the GitHub issue
 * @returns A markdown-formatted response
 */
export async function generateAIResponse(
  question: string,
  context?: IssueContext,
): Promise<string> {
  const config = useRuntimeConfig()

  // Check if Savoir API is configured
  if (!config.savoir.apiUrl) {
    return formatNoConfigResponse()
  }

  try {
    console.log('[ai] Creating Savoir SDK instance...')

    // Create Savoir SDK instance with tools
    const savoir = createSavoir({
      apiUrl: config.savoir.apiUrl,
      apiKey: config.savoir.apiKey || undefined,
      onToolCall: (info) => {
        console.log(`[ai] Tool ${info.toolName} called:`, info.args)
      },
    })

    // Build the system prompt with context
    const systemPrompt = buildSystemPrompt(context)

    // Build the user message
    const userMessage = buildUserMessage(question, context)

    console.log('[ai] Creating ToolLoopAgent...')
    console.log('[ai] User message:', userMessage.slice(0, 200))

    // Create agent with ToolLoopAgent
    const agent = new ToolLoopAgent({
      model: 'google/gemini-3-flash',
      instructions: systemPrompt,
      tools: savoir.tools as any,
      onStepFinish: ({ usage, finishReason, toolCalls }) => {
        console.log('[ai] Step completed:', {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          finishReason,
          toolsUsed: toolCalls?.map(tc => tc.toolName),
        })
      },
    })

    // Generate response
    const result = await agent.generate({
      prompt: userMessage,
    })

    console.log('[ai] Response generated:', result.text?.slice(0, 100))

    // Return the generated response
    if (!result.text) {
      return formatNoResultsResponse(question)
    }

    return result.text
  } catch (error) {
    console.error('[ai] Error generating response:', error)
    return formatErrorResponse(question, error)
  }
}

/**
 * Build the system prompt for the AI agent.
 */
function buildSystemPrompt(context?: IssueContext): string {
  const basePrompt = `You are a helpful documentation assistant for the Savoir project.
Your role is to help users by searching and reading the project documentation.

## Your Capabilities
- You have access to documentation search tools
- You can read specific files from the documentation
- You should search for relevant information before answering

## Guidelines
- Always search the documentation first to find accurate information
- If you find relevant documentation, cite the source file
- Be concise but thorough in your answers
- Use markdown formatting for better readability
- If you can't find specific information, say so honestly
- Suggest related topics or alternative approaches when helpful

## Response Format
- Use clear headings and bullet points when appropriate
- Include code examples if they help explain concepts
- Link to relevant documentation sections when possible`

  if (context) {
    return `${basePrompt}

## Current Context
You are responding to an issue in the repository: ${context.owner}/${context.repo}
Issue #${context.number}: "${context.title}"
Issue state: ${context.state}
${context.labels.length > 0 ? `Labels: ${context.labels.join(', ')}` : ''}`
  }

  return basePrompt
}

/**
 * Build the user message with full context.
 */
function buildUserMessage(question: string, context?: IssueContext): string {
  // Clean the question (remove bot mentions)
  const cleanQuestion = question
    .replace(/@[\w-]+(\[bot\])?/gi, '')
    .trim()

  let message = cleanQuestion

  // Add issue context if available
  if (context) {
    const parts: string[] = []

    // Add issue description if present and different from the question
    if (context.body && context.body !== cleanQuestion) {
      parts.push(`**Issue Description:**\n${context.body}`)
    }

    // Add previous comments for conversation context
    if (context.previousComments && context.previousComments.length > 0) {
      const relevantComments = context.previousComments
        .filter(c => !c.isBot) // Only human comments
        .slice(-3) // Last 3 comments

      if (relevantComments.length > 0) {
        parts.push('**Previous Discussion:**')
        for (const comment of relevantComments) {
          parts.push(`- @${comment.author}: ${comment.body.slice(0, 200)}${comment.body.length > 200 ? '...' : ''}`)
        }
      }
    }

    if (parts.length > 0) {
      message = `${parts.join('\n\n')}\n\n**Current Question:**\n${cleanQuestion}`
    }
  }

  return message
}

/**
 * Format response when no configuration is set.
 */
function formatNoConfigResponse(): string {
  return `👋 Hello! I'm the documentation bot, but I'm not fully configured yet.

Please set the following environment variables:
- \`NUXT_SAVOIR_API_URL\` - URL of the Savoir chat API
- \`NUXT_SAVOIR_API_KEY\` - API key (if required)

Once configured, I'll be able to search the documentation and help answer your questions!`
}

/**
 * Format response when no results are found.
 */
function formatNoResultsResponse(question: string): string {
  return `I searched the documentation but couldn't generate a helpful response for:

> ${question}

**Suggestions:**
- Try rephrasing your question with different keywords
- Check the official documentation directly
- Open a discussion for more complex questions

I'm continuously learning and improving! 🚀`
}

/**
 * Format error response.
 */
function formatErrorResponse(question: string, error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'

  return `Sorry, I encountered an error while processing your question:

> ${question}

<details>
<summary>Error details</summary>

\`\`\`
${errorMessage}
\`\`\`
</details>

Please try again later or open a discussion if this persists.`
}
