import { createGateway } from '@ai-sdk/gateway'

interface ModelPricing {
  input: number // cost per token in USD
  output: number
}

let cachedPricing: Map<string, ModelPricing> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

export async function getModelPricingMap(): Promise<Map<string, ModelPricing>> {
  if (cachedPricing && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedPricing
  }

  try {
    const config = useRuntimeConfig()
    const gateway = createGateway({ apiKey: config.savoir?.apiKey })
    const { models } = await gateway.getAvailableModels()

    const pricing = new Map<string, ModelPricing>()
    for (const model of models) {
      if (model.pricing) {
        pricing.set(model.id, {
          input: parseFloat(model.pricing.input),
          output: parseFloat(model.pricing.output),
        })
      }
    }

    cachedPricing = pricing
    cacheTimestamp = Date.now()
    return pricing
  } catch {
    // Return empty map on failure — cost will show as $0
    return cachedPricing ?? new Map()
  }
}

export function computeEstimatedCost(
  byModel: Array<{ model: string, inputTokens: number, outputTokens: number }>,
  pricingMap: Map<string, ModelPricing>,
) {
  const byModelCosts = byModel.map((m) => {
    const pricing = pricingMap.get(m.model)
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
