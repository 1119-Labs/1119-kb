import { db, schema } from '@nuxthub/db'
import { and, asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { token } = getRouterParams(event)

  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.shareToken, token as string),
      eq(schema.chats.isPublic, true)
    ),
    with: {
      messages: {
        orderBy: () => asc(schema.messages.createdAt)
      },
      user: {
        columns: {
          name: true,
          avatar: true,
          username: true
        }
      }
    }
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Shared chat not found or no longer public'
    })
  }

  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    messages: chat.messages,
    author: chat.user
  }
})
