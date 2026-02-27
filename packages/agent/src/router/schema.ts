import { z } from 'zod'

export const ROUTER_MODEL = 'gpt-4o-mini'
export const DEFAULT_MODEL = 'gpt-4.1'

export const agentConfigSchema = z.object({
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex'])
    .describe('trivial=greeting, simple=single lookup, moderate=multi-search, complex=deep analysis'),

  maxSteps: z.number().min(1).max(30)
    .describe('Agent iterations: 4 trivial, 8 simple, 15 moderate, 25 complex'),

  model: z.enum([
    'gpt-4o-mini',
    'gpt-4.1',
  ]).describe('gpt-4o-mini for trivial/simple, gpt-4.1 for moderate/complex'),

  reasoning: z.string().max(200)
    .describe('Brief explanation of the classification'),
})

export type AgentConfig = z.infer<typeof agentConfigSchema>

export function getDefaultConfig(): AgentConfig {
  return {
    complexity: 'moderate',
    maxSteps: 15,
    model: 'gpt-4.1',
    reasoning: 'Default fallback configuration',
  }
}

/** No fallbacks when using direct OpenAI provider. */
export function getModelFallbackOptions(_model: string): undefined {
  return undefined
}
