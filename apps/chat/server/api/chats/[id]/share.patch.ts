import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const { id } = getRouterParams(event)

  const { isPublic } = await readValidatedBody(event, z.object({
    isPublic: z.boolean()
  }).parse)

  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id as string),
      eq(schema.chats.userId, session.user?.id || session.id)
    )
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found'
    })
  }

  const shareToken = isPublic ? crypto.randomUUID() : null

  const [updated] = await db.update(schema.chats)
    .set({ isPublic, shareToken })
    .where(eq(schema.chats.id, id as string))
    .returning()

  return updated
})
