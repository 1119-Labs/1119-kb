import { generateText, tool } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

function getOpenAI() {
  return createOpenAI(process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : {})
}

export const webSearchTool = tool({
  description: 'Search the web for up-to-date information. Use when you need current data, recent events, or facts not available in the documentation.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async function* ({ query }, { abortSignal }) {
    yield { status: 'loading' as const }
    const start = Date.now()
    const openai = getOpenAI()

    try {
      const { text, sources } = await generateText({
        model: openai('gpt-4o-mini'),
        tools: { web_search: openai.tools.webSearch() } as Parameters<typeof generateText>[0]['tools'],
        toolChoice: { type: 'tool', toolName: 'web_search' },
        prompt: query,
        abortSignal,
      })

      const urlSources = sources
        ?.filter(s => s.sourceType === 'url')
        .map(s => ({ title: s.title, url: (s as Extract<typeof s, { sourceType: 'url' }>).url }))
        ?? []

      const sourcesPreview = urlSources.map(s => `${s.title || s.url}\n  ${s.url}`).join('\n')

      yield {
        status: 'done' as const,
        durationMs: Date.now() - start,
        text,
        sources: urlSources,
        commands: [
          {
            title: `Web search: "${query}"`,
            command: '',
            stdout: sourcesPreview || text.slice(0, 500),
            stderr: '',
            exitCode: 0,
            success: true,
          },
        ],
      }
    } catch (error) {
      yield {
        status: 'done' as const,
        durationMs: Date.now() - start,
        text: '',
        sources: [],
        commands: [
          {
            title: `Web search: "${query}"`,
            command: '',
            stdout: '',
            stderr: error instanceof Error ? error.message : 'Search failed',
            exitCode: 1,
            success: false,
          },
        ],
      }
    }
  },
})
