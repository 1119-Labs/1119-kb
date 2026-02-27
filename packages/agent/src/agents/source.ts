import { stepCountIs, ToolLoopAgent, type LanguageModel, type StepResult, type ToolSet, type UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { log } from 'evlog'
import { DEFAULT_MODEL, getModelFallbackOptions } from '../router/schema'
import { routeQuestion } from '../router/route-question'
import { buildChatSystemPrompt } from '../prompts/chat'
import { applyComplexity } from '../prompts/shared'
import { compactContext } from '../core/context'
import { callOptionsSchema } from '../core/schemas'
import { sanitizeToolCallInputs } from '../core/sanitize'
import { countConsecutiveToolSteps, shouldForceTextOnlyStep } from '../core/policy'
import { webSearchTool } from '../tools/web-search'
import type { AgentConfigData, AgentCallOptions, AgentExecutionContext, RoutingResult } from '../types'

export interface SourceAgentOptions {
  tools: Record<string, unknown>
  getAgentConfig: () => Promise<AgentConfigData>
  messages: UIMessage[]
  /** OpenRouter API key. Optional — falls back to OPENROUTER_API_KEY env var. */
  apiKey?: string
  requestId?: string
  /** Falls back to agentConfig.defaultModel then DEFAULT_MODEL */
  defaultModel?: string
  /** Restrict search to these sandbox-relative paths (e.g. docs/repo1/[branch]-master). When empty/omitted, search whole docs. */
  searchPaths?: string[]
  onRouted?: (result: RoutingResult) => void
  onStepFinish?: (stepResult: any) => void
  onFinish?: (result: any) => void
}

export function createSourceAgent({
  tools,
  getAgentConfig,
  messages,
  apiKey,
  requestId,
  defaultModel = DEFAULT_MODEL,
  searchPaths,
  onRouted,
  onStepFinish,
  onFinish,
}: SourceAgentOptions) {
  const id = requestId ?? crypto.randomUUID().slice(0, 8)
  let maxSteps = 15
  const openrouter = createOpenRouter({ apiKey: apiKey ?? undefined })

  return new ToolLoopAgent({
    model: openrouter(DEFAULT_MODEL) as unknown as LanguageModel,
    callOptionsSchema,
    prepareCall: async ({ options, ...settings }) => {
      const modelOverride = (options as AgentCallOptions | undefined)?.model
      const customContext = (options as AgentCallOptions | undefined)?.context

      const [routerConfig, agentConfig] = await Promise.all([
        routeQuestion(messages, id, apiKey),
        getAgentConfig(),
      ])

      const effectiveMaxSteps = Math.round(routerConfig.maxSteps * agentConfig.maxStepsMultiplier)
      const effectiveModel = modelOverride ?? agentConfig.defaultModel ?? defaultModel

      maxSteps = effectiveMaxSteps
      onRouted?.({ routerConfig, agentConfig, effectiveModel, effectiveMaxSteps })

      const executionContext: AgentExecutionContext = {
        mode: 'chat',
        effectiveModel,
        maxSteps: effectiveMaxSteps,
        routerConfig,
        agentConfig,
        customContext,
        searchPaths: searchPaths?.length ? searchPaths : undefined,
      }

      let instructions = applyComplexity(buildChatSystemPrompt(agentConfig), routerConfig)
      if (searchPaths?.length) {
        instructions += `\n\n## Search scope\nSearch only in these directories (relative to the sandbox root):\n${searchPaths.map(p => `- \`${p}\``).join('\n')}\nUse these paths in your grep/find/cat commands (e.g. \`grep -rl "keyword" ${searchPaths[0]}/ --include="*.md" | head -5\`).`
      }

      return {
        ...settings,
        model: openrouter(effectiveModel) as unknown as LanguageModel,
        instructions,
        tools: { ...tools, web_search: webSearchTool },
        stopWhen: stepCountIs(effectiveMaxSteps),
        providerOptions: getModelFallbackOptions(effectiveModel),
        experimental_context: executionContext,
      }
    },
    prepareStep: ({ stepNumber, messages: stepMessages, steps }) => {
      sanitizeToolCallInputs(stepMessages)
      const normalizedSteps = (steps as StepResult<ToolSet>[] | undefined) ?? []
      const compactedMessages = compactContext({ messages: stepMessages, steps: normalizedSteps })

      if (shouldForceTextOnlyStep({ stepNumber, maxSteps, steps: normalizedSteps })) {
        log.info({ event: 'agent.force_text_step', step: stepNumber + 1, maxSteps, toolStreak: countConsecutiveToolSteps(normalizedSteps) })
        return {
          tools: {},
          toolChoice: 'none' as const,
          activeTools: [],
          ...(compactedMessages !== stepMessages ? { messages: compactedMessages } : {}),
        }
      }

      if (compactedMessages !== stepMessages) {
        return { messages: compactedMessages }
      }
    },
    onStepFinish,
    onFinish,
  })
}
