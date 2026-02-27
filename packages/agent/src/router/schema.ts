import { z } from 'zod'

export const ROUTER_MODEL = 'openai/gpt-5.3-codex'
export const DEFAULT_MODEL = 'anthropic/claude-opus-4.6'
export const GENERATE_TITLE_MODEL = 'openai/gpt-oss-120b:free'

/** OpenRouter model IDs that support tools + structured_outputs. See docs/OPENROUTER-MODELS.md. */
const OPENROUTER_MODELS = [
  // Free
  'openrouter/free',
  'openai/gpt-oss-120b:free',
  'arcee-ai/trinity-large-preview:free',
  'arcee-ai/trinity-mini:free',
  'qwen/qwen3-vl-235b-a22b-thinking',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'mistralai/mistral-small-3.1-24b-instruct:free',
  // Paid
  'qwen/qwen3.5-flash-02-23',
  'qwen/qwen3.5-35b-a3b',
  'qwen/qwen3.5-122b-a10b',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.6',
  'google/gemini-3.1-pro-preview',
  'openai/gpt-5.3-codex',
] as const

export const agentConfigSchema = z.object({
  complexity: z.enum(['trivial', 'simple', 'moderate', 'complex'])
    .describe('trivial=greeting, simple=single lookup, moderate=multi-search, complex=deep analysis'),

  maxSteps: z.number().min(1).max(30)
    .describe('Agent iterations: 4 trivial, 8 simple, 15 moderate, 25 complex'),

  model: z.enum(OPENROUTER_MODELS)
    .describe('Free: openrouter/free, gpt-oss-120b:free, trinity-*, qwen3-vl-235b. Paid: qwen3.5-*, claude-sonnet-4.6, gemini-3.1-pro-preview'),

  reasoning: z.string().max(200)
    .describe('Brief explanation of the classification'),
})

export type AgentConfig = z.infer<typeof agentConfigSchema>

export function getDefaultConfig(): AgentConfig {
  return {
    complexity: 'moderate',
    maxSteps: 15,
    model: DEFAULT_MODEL,
    reasoning: 'Default fallback configuration',
  }
}

/** No fallbacks when using OpenRouter provider. */
export function getModelFallbackOptions(_model: string): undefined {
  return undefined
}
