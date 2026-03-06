import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const paramsSchema = z.object({
  id: z.string().min(1, 'Missing chat ID'),
})

const bodySchema = z.object({
  title: z.string().max(500).optional(),
})

/**
 * PATCH /api/chats/:id/title
 * Update the chat title. Body: { title?: string }. Empty or omitted title clears the title.
 */
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, bodySchema.parse)

  const chat = await db.query.chats.findFirst({
    where: () => and(
      eq(schema.chats.id, id),
      eq(schema.chats.userId, user.id),
    ),
  })

  if (!chat) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Chat not found',
      data: { why: 'No chat exists with this ID for your user account', fix: 'Verify the chat ID is correct' },
    })
  }

  const title = body.title?.trim() ?? null

  const [updated] = await db.update(schema.chats)
    .set({ title })
    .where(eq(schema.chats.id, id))
    .returning({ title: schema.chats.title })

  if (!updated) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update chat title',
    })
  }

  return { title: updated.title }
})
