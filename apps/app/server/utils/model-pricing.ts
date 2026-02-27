interface ModelPricing {
  input: number // cost per token in USD
  output: number
}

type PricingRecord = Record<string, ModelPricing>

/** Static OpenAI model pricing (USD per token). Updated from https://openai.com/api/pricing/ */
const OPENAI_PRICING: PricingRecord = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 },
  'gpt-4.1': { input: 2.50 / 1_000_000, output: 10.00 / 1_000_000 },
  'gpt-4.1-mini': { input: 0.40 / 1_000_000, output: 1.60 / 1_000_000 },
}

export const getModelPricingMap = defineCachedFunction(
  async (): Promise<PricingRecord> => await Promise.resolve(OPENAI_PRICING),
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
