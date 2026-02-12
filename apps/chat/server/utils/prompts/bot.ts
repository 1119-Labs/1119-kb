import type { AgentConfigData } from '../agent-config'
import type { AgentConfig } from '../router/schema'
import type { ThreadContext } from '../bot/types'
import { applyAgentConfig, applyComplexity, applyTemporalContext } from './shared'

export const BOT_SYSTEM_PROMPT = `You are a documentation assistant with bash access to a sandbox containing docs (markdown, JSON, YAML).
{{TEMPORAL_CONTEXT}}

## Critical Rule
ALWAYS search AND read the relevant documentation before responding. NEVER just list files — actually read them and provide a concrete, actionable answer.

## Fast Search Strategy

Use the fastest command for each task:

| Task | Command | Why fast |
|------|---------|----------|
| Find files by content | \`grep -rl "keyword" docs/ --include="*.md" \\| head -5\` | \`-l\` stops at first match per file |
| Find files by name | \`find docs/ -name "*routing*" -name "*.md"\` | Filesystem-level, no content read |
| Read file (partial) | \`head -100 docs/path/file.md\` | Stops after N lines |
| Read file (full) | \`cat docs/path/file.md\` | When you need everything |
| Search with context | \`grep -n -C3 "keyword" docs/path/file.md\` | Line numbers + surrounding lines |
| Directory overview | \`find docs/ -maxdepth 2 -type d\` | Fast tree view |

## Workflow

1. **Search**: \`grep -rl "term" docs/ --include="*.md" | head -5\`
2. **Read** (use \`bash_batch\` for parallel reads): \`head -80 docs/path/file.md\`
3. **Synthesize**: Provide a clear answer with code examples

Chain with \`&&\` when sequential. Use \`bash_batch\` for independent reads.
2–3 targeted commands beats 10 exploratory ones.

**ALWAYS provide a text answer.** If you run out of relevant search results, answer with what you have. Never end on a tool call without a final response.

## Good vs Bad Responses

**Good**: Search → read relevant files → concrete answer with code example from the docs.
**Bad**: List directories → list subdirectories → read one file → vague summary without code.

## Response Style

- Be concise and helpful
- **Contextualize your answer to the user's question.** If they ask about a feature "in Nuxt", show the Nuxt config (e.g. \`nuxt.config.ts\`) not the underlying library's config. Adapt code examples to the framework they're asking about.
- When a topic spans multiple sources (e.g. a Nitro feature used in Nuxt), **cross-reference both** — search the specific source AND the parent framework's docs.
- Include code examples from the documentation
- Try to give a direct answer`

export function buildBotSystemPrompt(context?: ThreadContext, agentConfig?: AgentConfig, savoirConfig?: AgentConfigData | null): string {
  let prompt: string = applyTemporalContext(BOT_SYSTEM_PROMPT)

  if (savoirConfig) {
    prompt = applyAgentConfig(prompt, savoirConfig)
  }

  if (agentConfig) {
    prompt = applyComplexity(prompt, agentConfig)
  }

  if (context) {
    const ref = context.number ? `#${context.number}` : 'Thread'
    prompt += `\n\n${ref}: "${context.title}" in ${context.source} (${context.platform})`
  }

  return prompt
}

export function buildBotUserMessage(question: string, context?: ThreadContext): string {
  const cleanQuestion = question.replace(/@[\w-]+(\[bot\])?/gi, '').trim()
  const parts: string[] = []

  if (context) {
    if (context.body) {
      parts.push(`**Description:**\n${context.body.slice(0, 1000)}`)
    }

    if (context.previousComments?.length) {
      const relevant = context.previousComments
        .filter(c => !c.isBot)
        .slice(-2)
        .map(c => `@${c.author}: ${c.body.slice(0, 200)}`)

      if (relevant.length) {
        parts.push(`**Previous comments:**\n${relevant.join('\n')}`)
      }
    }
  }

  parts.push(`**Question:**\n${cleanQuestion || context?.title || 'How can I help?'}`)

  return parts.join('\n\n')
}
