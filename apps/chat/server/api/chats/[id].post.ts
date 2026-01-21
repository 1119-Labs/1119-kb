import { createAgentUIStreamResponse, generateText, ToolLoopAgent, type UIMessage } from 'ai'
import { z } from 'zod'
import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { createSavoir } from '@savoir/sdk'
import { getLogger } from '@savoir/logger'

defineRouteMeta({
  openAPI: {
    description: 'Chat with AI about Nuxt documentation.',
    tags: ['ai'],
  },
})

export default defineEventHandler(async (event) => {
  const logger = getLogger()
  const requestId = crypto.randomUUID().slice(0, 8)

  const log = logger.request({
    requestId,
    path: '/api/chats/[id]',
    method: 'POST',
  })

  try {
    const session = await getUserSession(event)
    log.set({ userId: session.user?.id || session.id })

    const { id } = await getValidatedRouterParams(event, z.object({
      id: z.string(),
    }).parse)
    log.set({ chatId: id })

    const { model, messages } = await readValidatedBody(event, z.object({
      model: z.string(),
      messages: z.array(z.custom<UIMessage>()),
    }).parse)
    log.set({ model, messageCount: messages.length })

    const chat = await db.query.chats.findFirst({
      where: () => and(
        eq(schema.chats.id, id as string),
        eq(schema.chats.userId, session.user?.id || session.id),
      ),
      with: {
        messages: true,
      },
    })
    if (!chat) {
      log.error('Chat not found')
      log.emit({ outcome: 'error' })
      throw createError({ statusCode: 404, statusMessage: 'Chat not found' })
    }
    log.set({ existingMessages: chat.messages.length })

    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user' && messages.length > 1) {
      await db.insert(schema.messages).values({
        chatId: id as string,
        role: 'user',
        parts: lastMessage.parts,
      })
    }

    const savoir = createSavoir({
      apiKey: process.env.SAVOIR_API_KEY!,
      apiUrl: import.meta.dev ? 'http://localhost:3001' : 'https://api.savoir.dev',
    })

    // Metrics tracking
    let stepCount = 0
    let toolCallCount = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0

    logger.log('chat', `[${requestId}] Starting agent with ${model}`)

    const agent = new ToolLoopAgent({
      model,
      instructions: `You are a coding assistant specialized in the Nuxt/Nitro ecosystem and related tools. You have access to a filesystem containing the entire documentation of this ecosystem. Answer questions accurately, concisely, and rely on your deep knowledge of Nuxt, Nitro, and best practices.`,
      tools: savoir.tools,
      onStepFinish: (stepResult) => {
        stepCount++

        if (stepResult.usage) {
          totalInputTokens += stepResult.usage.inputTokens ?? 0
          totalOutputTokens += stepResult.usage.outputTokens ?? 0
        }

        if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
          toolCallCount += stepResult.toolCalls.length
          const tools = stepResult.toolCalls.map(c => c.toolName).join(', ')
          logger.log('chat', `[${requestId}] Step ${stepCount}: ${tools}`)
        }
      },

      onFinish: (result) => {
        log.set({
          finishReason: result.finishReason,
          totalInputTokens,
          totalOutputTokens,
          totalTokens: totalInputTokens + totalOutputTokens,
          stepCount,
          toolCallCount,
        })
        logger.log('chat', `[${requestId}] Finished: ${result.finishReason}`)
      },
    })

    // Generate title in background if needed
    if (!chat.title && messages[0]) {
      generateTitleInBackground({ firstMessage: messages[0], chatId: id as string, requestId })
    }

    return createAgentUIStreamResponse({
      agent,
      uiMessages: messages,
      onFinish: async ({ messages: responseMessages }) => {
        const dbStartTime = Date.now()
        await db.insert(schema.messages).values(responseMessages.map((message: UIMessage) => ({
          chatId: chat.id,
          role: message.role as 'user' | 'assistant',
          parts: message.parts,
        })))
        const dbDurationMs = Date.now() - dbStartTime

        log.set({
          outcome: 'success',
          responseMessageCount: responseMessages.length,
          dbInsertMs: dbDurationMs,
        })

        log.emit()
      },
    })
  } catch (error) {
    log.error(error instanceof Error ? error : new Error(String(error)))
    log.emit({ outcome: 'error' })
    throw error
  }
})

interface GenerateTitleOptions {
  firstMessage: UIMessage
  chatId: string
  requestId: string
}

/**
 * Generate chat title in background (fire-and-forget)
 * Note: Title will be fetched by the client on next refresh
 */
function generateTitleInBackground(options: GenerateTitleOptions) {
  const { firstMessage, chatId, requestId } = options
  const logger = getLogger()

  // Fire-and-forget: don't await
  generateText({
    model: 'google/gemini-3-flash',
    system: `You are a title generator for a chat:
      - Generate a short title based on the first user's message
      - The title should be less than 30 characters long
      - The title should be a summary of the user's message
      - Do not use quotes (' or ") or colons (:) or any other punctuation
      - Do not use markdown, just plain text`,
    prompt: JSON.stringify(firstMessage),
  }).then(async ({ text: title }) => {
    await db.update(schema.chats).set({ title }).where(eq(schema.chats.id, chatId))
    logger.log('chat', `[${requestId}] Title: ${title}`)
  }).catch(() => {
    logger.log('chat', `[${requestId}] Title generation failed`)
  })
}
