interface VercelSandboxCredentials {
  token: string
  teamId: string
  projectId: string
  source: 'oidc' | 'token'
}

interface VercelOidcPayload {
  owner_id?: string
  project_id?: string
  exp?: number
}

function decodeBase64Url(input: string): string {
  // Node supports base64url in modern versions, but normalize for compatibility.
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString('utf8')
}

function decodeOidcPayload(token: string): VercelOidcPayload {
  const parts = token.split('.')
  if (parts.length < 2 || !parts[1]) {
    throw new Error('invalid JWT format')
  }
  const json = decodeBase64Url(parts[1])
  return JSON.parse(json) as VercelOidcPayload
}

function isOidcExpired(payload: VercelOidcPayload, skewSeconds: number = 60): boolean {
  if (!payload.exp) {
    return false
  }
  const now = Math.floor(Date.now() / 1000)
  return payload.exp <= (now + skewSeconds)
}

export function getVercelSandboxCredentials(): VercelSandboxCredentials | undefined {
  const token = process.env.VERCEL_TOKEN
  const teamId = process.env.VERCEL_TEAM_ID
  const projectId = process.env.VERCEL_PROJECT_ID

  const oidcToken = process.env.VERCEL_OIDC_TOKEN || process.env.NUXT_VERCEL_OIDC_TOKEN
  if (oidcToken) {
    const payload = decodeOidcPayload(oidcToken)
    const expired = isOidcExpired(payload)
    if (expired) {
      if (token && teamId && projectId) {
        return { token, teamId, projectId, source: 'token' }
      }
      const expIso = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown'
      throw new Error(
        `VERCEL_OIDC_TOKEN is expired (exp: ${expIso}). Refresh apps/app/.env.local via "npx vercel env pull" or set VERCEL_TOKEN/VERCEL_TEAM_ID/VERCEL_PROJECT_ID.`,
      )
    }
    if (!payload.owner_id || !payload.project_id) {
      throw new Error('VERCEL_OIDC_TOKEN is missing owner_id/project_id claims')
    }
    return {
      token: oidcToken,
      teamId: payload.owner_id,
      projectId: payload.project_id,
      source: 'oidc',
    }
  }

  if (token && teamId && projectId) {
    return { token, teamId, projectId, source: 'token' }
  }

  return undefined
}

export function withVercelSandboxCredentials<T extends Record<string, unknown>>(params: T): T {
  const credentials = getVercelSandboxCredentials()
  if (!credentials) {
    return params
  }
  const { token, teamId, projectId } = credentials
  return { ...params, token, teamId, projectId }
}

export function getVercelCredentialsDebugSummary() {
  const credentials = getVercelSandboxCredentials()
  if (!credentials) {
    return { available: false as const }
  }

  const { token } = credentials
  const prefix = token.slice(0, 12)
  const suffix = token.slice(-8)
  const payload = credentials.source === 'oidc' ? decodeOidcPayload(token) : undefined

  return {
    available: true as const,
    source: credentials.source,
    tokenPreview: `${prefix}...${suffix}`,
    tokenLength: token.length,
    teamId: credentials.teamId,
    projectId: credentials.projectId,
    exp: payload?.exp,
    expIso: payload?.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
    expired: payload ? isOidcExpired(payload) : undefined,
  }
}
