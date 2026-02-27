import { stepCountIs, ToolLoopAgent, type StepResult, type ToolSet } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { DEFAULT_MODEL, getModelFallbackOptions } from '../router/schema'
import { ADMIN_SYSTEM_PROMPT } from '../prompts/chat'
import { compactContext } from '../core/context'
import { callOptionsSchema } from '../core/schemas'
import { sanitizeToolCallInputs } from '../core/sanitize'
import type { AgentCallOptions, AgentExecutionContext } from '../types'

export interface AdminAgentOptions {
  tools: Record<string, unknown>
  /** Defaults to the built-in ADMIN_SYSTEM_PROMPT */
  systemPrompt?: string
  maxSteps?: number
  /** OpenAI API key. Optional — falls back to OPENAI_API_KEY env var. */
  apiKey?: string
  onStepFinish?: (stepResult: any) => void
  onFinish?: (result: any) => void
}

export function createAdminAgent({
  tools,
  systemPrompt = ADMIN_SYSTEM_PROMPT,
  maxSteps = 15,
  apiKey,
  onStepFinish,
  onFinish,
}: AdminAgentOptions) {
  const openai = createOpenAI(apiKey ? { apiKey } : {})

  return new ToolLoopAgent({
    model: openai(DEFAULT_MODEL),
    callOptionsSchema,
    prepareCall: ({ options, ...settings }) => {
      const modelOverride = (options as AgentCallOptions | undefined)?.model
      const customContext = (options as AgentCallOptions | undefined)?.context
      const effectiveModel = modelOverride ?? DEFAULT_MODEL

      const executionContext: AgentExecutionContext = {
        mode: 'admin',
        effectiveModel,
        maxSteps,
        customContext,
      }

      return {
        ...settings,
        model: openai(effectiveModel),
        instructions: systemPrompt,
        tools,
        stopWhen: stepCountIs(maxSteps),
        providerOptions: getModelFallbackOptions(effectiveModel),
        experimental_context: executionContext,
      }
    },
    prepareStep: ({ messages, steps }) => {
      sanitizeToolCallInputs(messages)
      const normalizedSteps = (steps as StepResult<ToolSet>[] | undefined) ?? []
      const compactedMessages = compactContext({ messages, steps: normalizedSteps })
      if (compactedMessages !== messages) {
        return { messages: compactedMessages }
      }
    },
    onStepFinish,
    onFinish,
  })
}
