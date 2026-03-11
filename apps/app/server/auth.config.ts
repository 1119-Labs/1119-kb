import { admin, apiKey } from 'better-auth/plugins'
import { schema } from '@nuxthub/db'
import { count, eq } from 'drizzle-orm'
import { defineServerAuth } from '@onmax/nuxt-better-auth/config'

function parseTrustedOrigins(): string[] {
  const envList = process.env.BETTER_AUTH_TRUSTED_ORIGINS || ''
  const values = envList
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)

  const baseUrl = process.env.BETTER_AUTH_URL?.trim()
  if (baseUrl) values.push(baseUrl)

  // Keep local development working out of the box.
  values.push('http://localhost:3000', 'http://127.0.0.1:3000')

  return Array.from(new Set(values))
}

export default defineServerAuth(({ db }) => {
  const trustedOrigins = parseTrustedOrigins()
  return {
    trustedOrigins,
    advanced: {
      // In Docker/prod behind reverse proxies, Better Auth should honor forwarded host/proto.
      // Keep trustedOrigins configured to an explicit allowlist via BETTER_AUTH_TRUSTED_ORIGINS.
      trustedProxyHeaders: true,
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        scope: ['user:email'],
        mapProfileToUser: (profile: { name: string, login: string, avatar_url: string }) => ({
          name: profile.name || profile.login,
          image: profile.avatar_url,
          username: profile.login,
        }),
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      },
    },
    user: {
      additionalFields: {
        username: { type: 'string' as const, required: false },
      },
    },
    plugins: [
      admin(),
      apiKey({
        enableSessionForAPIKeys: true,
        customAPIKeyGetter: (ctx) => {
          const xApiKey = ctx.headers?.get('x-api-key')?.trim()
          if (xApiKey) {
            // Be forgiving: some clients may include "Bearer " in custom header values.
            return xApiKey.replace(/^Bearer\s+/i, '').trim()
          }

          const authHeader = ctx.headers?.get('authorization')?.trim()
          if (authHeader) {
            // Authorization scheme is case-insensitive in HTTP; accept any Bearer casing.
            const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader)
            if (bearerMatch) {
              const token = (bearerMatch[1] ?? '').trim()
              if (!token) return null
              // Some client configs accidentally include surrounding quotes.
              return token.replace(/^"(.*)"$/, '$1').trim()
            }
          }
          return null
        },
      }),
    ],
    databaseHooks: {
      user: {
        create: {
          after: async (user: { id: string }) => {
            const result = await db.select({ total: count() }).from(schema.user)
            if (result[0]!.total === 1) {
              await db.update(schema.user).set({ role: 'admin' }).where(eq(schema.user.id, user.id))
            }
          },
        },
      },
    },
  }
})
