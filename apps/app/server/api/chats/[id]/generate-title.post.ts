import { db, schema } from '@nuxthub/db'
import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateTitle } from '../../../utils/chat/generate-title'
import type { UIMessage } from 'ai'

const paramsSchema = z.object({
  id: z.string().min(1, 'Missing chat ID'),
})

/**
 * POST /api/chats/:id/generate-title
 * Re-generate the chat title from the first user message. Returns the new title.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id),
      eq(schema.chats.userId, user.id),
    ),
    with: {
      messages: {
        orderBy: () => asc(schema.messages.createdAt),
      },
    },
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found',
      data: { why: 'No chat exists with this ID for your user account', fix: 'Verify the chat ID is correct' },
    })
  }

  const firstUserMessage = chat.messages.find(m => m.role === 'user')
  if (!firstUserMessage) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No user message',
      data: { why: 'This chat has no user message to generate a title from', fix: 'Send a message in the chat first' },
    })
  }

  const config = useRuntimeConfig(event)
  const apiKey = config.openrouter?.apiKey || process.env.OPENROUTER_API_KEY

  const firstMessage: UIMessage = {
    id: firstUserMessage.id,
    role: 'user',
    parts: (firstUserMessage.parts as UIMessage['parts']) ?? [],
  }

  const requestId = crypto.randomUUID().slice(0, 8)
  const title = await generateTitle({
    firstMessage,
    chatId: id,
    requestId,
    apiKey,
  })

  return { title: title ?? chat.title ?? 'New conversation' }
})
