import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user: ghUser }) {
    const session = await getUserSession(event)

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(schema.users.provider, 'github'),
        eq(schema.users.providerId, String(ghUser.id))
      )
    })

    if (existingUser) {
      // Migrate anonymous chats to authenticated user
      if (session.user?.id && session.user.id !== existingUser.id) {
        await db.update(schema.chats)
          .set({ userId: existingUser.id })
          .where(eq(schema.chats.userId, session.user.id))
      }

      await setUserSession(event, { user: existingUser })
    } else {
      // Create new user
      const [newUser] = await db.insert(schema.users).values({
        email: ghUser.email || '',
        name: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
        username: ghUser.login,
        provider: 'github',
        providerId: String(ghUser.id)
      }).returning()

      // Migrate anonymous chats to new user
      if (session.user?.id) {
        await db.update(schema.chats)
          .set({ userId: newUser.id })
          .where(eq(schema.chats.userId, session.user.id))
      }

      await setUserSession(event, { user: newUser })
    }

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  }
})
