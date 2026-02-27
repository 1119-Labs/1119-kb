export function formatModelName(modelId: string): string {
  const acronyms = ['gpt'] // words that should be uppercase
  const modelName = modelId.split('/')[1] || modelId

  return modelName
    .split('-')
    .map((word) => {
      const lowerWord = word.toLowerCase()
      return acronyms.includes(lowerWord)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

/** OpenRouter models with tools + structured_outputs. See docs/OPENROUTER-MODELS.md. */
export function useModels() {
  const models = [
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
  ]

  const model = useCookie<string>('model', { default: () => 'openai/gpt-5.3-codex' })

  return {
    models,
    model,
    formatModelName
  }
}
