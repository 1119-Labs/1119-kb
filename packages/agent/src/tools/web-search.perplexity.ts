import { generateText, tool, type LanguageModel } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'

const WEB_SEARCH_MODEL = 'openai/gpt-oss-120b:free'

function getOpenRouter() {
  return createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })
}

export const webSearchTool = tool({
  description: 'Search the web for up-to-date information. Use when you need current data, recent events, or facts not available in the documentation.',
  inputSchema: z.object({
    query: z.string().describe('The search query'),
  }),
  execute: async function* ({ query }, { abortSignal }) {
    yield { status: 'loading' as const }
    const start = Date.now()
    const openrouter = getOpenRouter()

    try {
      const { text } = await generateText({
        model: openrouter(WEB_SEARCH_MODEL) as unknown as LanguageModel,
        prompt: query,
        abortSignal,
      })

      const urlSources: Array<{ title: string, url: string }> = []
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
