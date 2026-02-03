import { db, schema } from '@nuxthub/db'
import { eq, and } from 'drizzle-orm'

function isAdminUser(email: string, username: string): boolean {
  const config = useRuntimeConfig()
  const adminUsers = config.adminUsers?.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) || []
  return adminUsers.includes(email.toLowerCase()) || adminUsers.includes(username.toLowerCase())
}

export default defineOAuthGitHubEventHandler({
  async onSuccess(event, { user: ghUser }) {
    const session = await getUserSession(event)

    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(schema.users.provider, 'github'),
        eq(schema.users.providerId, String(ghUser.id))
      )
    })

    if (existingUser) {
      if (session.user?.id && session.user.id !== existingUser.id) {
        await db.update(schema.chats)
          .set({ userId: existingUser.id })
          .where(eq(schema.chats.userId, session.user.id))
      }

      const newRole = isAdminUser(existingUser.email, existingUser.username) ? 'admin' : 'user'
      if (existingUser.role !== newRole) {
        await db.update(schema.users)
          .set({ role: newRole })
          .where(eq(schema.users.id, existingUser.id))
        existingUser.role = newRole
      }

      await setUserSession(event, { user: { ...existingUser, provider: 'github' as const } })
    } else {
      const role = isAdminUser(ghUser.email || '', ghUser.login) ? 'admin' : 'user'
      const [newUser] = await db.insert(schema.users).values({
        email: ghUser.email || '',
        name: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
        username: ghUser.login,
        provider: 'github',
        providerId: String(ghUser.id),
        role,
      }).returning()

      if (!newUser) {
        throw createError({ statusCode: 500, message: 'Failed to create user' })
      }

      if (session.user?.id) {
        await db.update(schema.chats)
          .set({ userId: newUser.id })
          .where(eq(schema.chats.userId, session.user.id))
      }

      await setUserSession(event, { user: { ...newUser, provider: 'github' as const } })
    }

    return sendRedirect(event, '/')
  },
  onError(event, error) {
    console.error('GitHub OAuth error:', error)
    return sendRedirect(event, '/')
  }
})
