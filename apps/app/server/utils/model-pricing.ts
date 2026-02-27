interface ModelPricing {
  input: number // cost per token in USD
  output: number
}

type PricingRecord = Record<string, ModelPricing>

/** Optional OpenRouter model pricing (USD per token). Unknown models return 0. Add entries from https://openrouter.ai/docs#models as needed. */
const OPENROUTER_PRICING: PricingRecord = {}

export const getModelPricingMap = defineCachedFunction(
  async (): Promise<PricingRecord> => await Promise.resolve(OPENROUTER_PRICING),
  {
    maxAge: 3600,
    swr: true,
    name: 'model-pricing',
    getKey: () => 'v1',
  },
)

export function computeEstimatedCost(
  byModel: Array<{ model: string, inputTokens: number, outputTokens: number }>,
  pricingMap: PricingRecord,
) {
  const byModelCosts = byModel.map((m) => {
    const pricing = pricingMap[m.model]
    if (!pricing) return { model: m.model, inputCost: 0, outputCost: 0, totalCost: 0 }
    const inputCost = m.inputTokens * pricing.input
    const outputCost = m.outputTokens * pricing.output
    return { model: m.model, inputCost, outputCost, totalCost: inputCost + outputCost }
  })

  return {
    total: byModelCosts.reduce((sum, m) => sum + m.totalCost, 0),
    byModel: byModelCosts,
  }
}
