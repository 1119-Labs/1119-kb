import { convertToModelMessages, createUIMessageStream, type UIMessage } from 'ai'
import { kv } from '@nuxthub/kv'
import { db, schema } from '@nuxthub/db'
import { desc } from 'drizzle-orm'
import { createSavoir } from '@savoir/sdk'
import { createSourceAgent, DEFAULT_MODEL } from '@savoir/agent'
import type { H3Event } from 'h3'
import { getAgentConfig } from '../agent-config'
import { KV_KEYS } from '../sandbox/types'

export interface SearchKnowledgeResult {
  answer: string
  steps?: number
  model?: string
}

/**
 * Run a single search/query against the knowledge base (same pipeline as chat)
 * and return structured output for MCP/search clients.
 */
export async function runSearchKnowledge(
  event: H3Event,
  query: string,
  sourceVersions?: Record<string, string>,
): Promise<SearchKnowledgeResult> {
  const config = useRuntimeConfig(event)
  const apiKey = config.openrouter?.apiKey || process.env.OPENROUTER_API_KEY
  const requestId = crypto.randomUUID().slice(0, 8)

  const requestUrl = getRequestURL(event)
  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`
  const internalApiUrl =
    process.env.SAVOIR_INTERNAL_API_URL ||
    requestOrigin ||
    `http://127.0.0.1:${process.env.NITRO_PORT || '3000'}`

  const cookie = getHeader(event, 'cookie')
  const authorization = getHeader(event, 'authorization')
  const xApiKey = getHeader(event, 'x-api-key')
  const forwardedHeaders: Record<string, string> = {}
  if (cookie) forwardedHeaders.cookie = cookie
  if (authorization) forwardedHeaders.authorization = authorization
  if (xApiKey) forwardedHeaders['x-api-key'] = xApiKey

  const existingSessionId = await kv.get<string>(KV_KEYS.ACTIVE_SANDBOX_SESSION)
  const savoir = createSavoir({
    apiUrl: internalApiUrl,
    headers: Object.keys(forwardedHeaders).length > 0 ? forwardedHeaders : undefined,
    sessionId: existingSessionId || undefined,
  })

  const searchPaths: string[] | undefined = []
  const [sourcesList, versionsList] = await Promise.all([
    db.select({ id: schema.sources.id, basePath: schema.sources.basePath, outputPath: schema.sources.outputPath }).from(schema.sources),
    db.select().from(schema.sourceVersions).orderBy(desc(schema.sourceVersions.syncedAt)),
  ])
  const versionsBySource = new Map<string, Array<{ versionFolderName: string }>>()
  for (const v of versionsList) {
    const list = versionsBySource.get(v.sourceId) ?? []
    list.push({ versionFolderName: v.versionFolderName })
    versionsBySource.set(v.sourceId, list)
  }

  for (const s of sourcesList) {
    const versions = versionsBySource.get(s.id)
    const first = versions?.[0]
    if (!first) continue
    const selected = sourceVersions?.[s.id] ?? first.versionFolderName
    if (!versions?.some((v) => v.versionFolderName === selected)) continue
    const base = (s.basePath || '/docs').replace(/^\//, '') || 'docs'
    const out = s.outputPath || s.id
    searchPaths.push(`${base}/${out}/${selected}`)
  }

  const messages: UIMessage[] = [
    {
      id: crypto.randomUUID(),
      role: 'user',
      parts: [{ type: 'text', text: query }],
    },
  ]

  let stepCount = 0
  let effectiveModel = ''
  const agent = createSourceAgent({
    tools: savoir.tools,
    getAgentConfig,
    messages,
    defaultModel: DEFAULT_MODEL,
    requestId,
    apiKey,
    searchPaths: searchPaths.length ? searchPaths : undefined,
    onRouted: ({ effectiveModel: m }) => {
      effectiveModel = m || ''
    },
    onStepFinish: () => {
      stepCount += 1
    },
  })

  let resolved = false
  const resultPromise = new Promise<UIMessage[]>((resolve) => {
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const result = await agent.stream({
          messages: await convertToModelMessages(messages),
          options: {},
        })
        writer.merge(result.toUIMessageStream())
      },
      onFinish: ({ messages: responseMessages }) => {
        if (!resolved) {
          resolved = true
          resolve(responseMessages)
        }
      },
    })
    const reader = stream.getReader()
    const consume = async () => {
      try {
        while (true) {
          const { done } = await reader.read()
          if (done) break
        }
      } catch {
        if (!resolved) {
          resolved = true
          resolve([])
        }
      }
    }
    void consume()
  })

  const responseMessages = await resultPromise
  const lastAssistant = responseMessages.filter((m) => m.role === 'assistant').pop()
  let answer = ''
  if (lastAssistant?.parts) {
    for (const part of lastAssistant.parts as Array<{ type?: string; text?: string }>) {
      if (part?.type === 'text' && typeof part.text === 'string') {
        answer += part.text
      }
    }
  }

  return {
    answer: answer.trim() || 'No answer generated.',
    steps: stepCount || undefined,
    model: effectiveModel || undefined,
  }
}
