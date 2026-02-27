# OpenRouter Models for Knowledge Agent

This product uses [OpenRouter](https://openrouter.ai) for chat, title generation, routing, OCR (vision), and agents. All models below support **tools** and **structured_outputs**, which are required for the agent loop and router.

## Product requirements

| Use case | Needs | Example |
|---------|--------|---------|
| **Router** | Structured output (object), fast/cheap | Classify question complexity, pick model |
| **Title generation** | Short text, cheap | Generate chat title from first message |
| **Chat / agents** | Tools, structured output, long context | Main conversation, tool loops, web search |
| **OCR** | Vision (image input), structured output | Extract source configs from screenshots/docs |

So suitable models must have in `supported_parameters`: `tools`, `structured_outputs`. For OCR and image-based flows, `architecture.input_modalities` must include `image`.

---

## Free models (zero cost)

These have `pricing.prompt === "0"` and `pricing.completion === "0"` (or use the `:free` variant).

| Model ID | Context | Vision | Notes |
|----------|---------|--------|--------|
| `openrouter/free` | 200K | Yes | Router over free models; good for router/title. |
| `openai/gpt-oss-120b:free` | — | — | Used as router and title model in this repo. |
| `arcee-ai/trinity-large-preview:free` | — | — | Good for chat; already in app list. |
| `arcee-ai/trinity-mini:free` | — | — | Lighter free option. |
| `qwen/qwen3-vl-235b-a22b-thinking` | 256K+ | Yes | Default chat + OCR in this repo; strong reasoning. |
| `qwen/qwen3-vl-30b-a3b-thinking` | — | Yes | Smaller vision + reasoning. |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 262K | — | Text-only, good for chat. |
| `qwen/qwen3-235b-a22b-thinking-2507` | — | — | Alternative Qwen reasoning. |
| `qwen/qwen3-4b:free` | — | — | Very small, fast. |
| `mistralai/mistral-small-3.1-24b-instruct:free` | — | — | Good balance of quality and cost. |
| `upstage/solar-pro-3:free` | — | — | Free Solar. |
| `nvidia/nemotron-nano-9b-v2:free` | — | — | Small free option. |

Use **`openrouter/free`** if you want OpenRouter to choose a free model automatically. Use **`openai/gpt-oss-120b:free`** for router/title when you rely on the current defaults.

---

## Paid models (by tier)

Pricing is USD per token (input / output). Check [OpenRouter pricing](https://openrouter.ai/docs#models) for current values.

### Budget (low cost)

| Model ID | Input / output (approx) | Context | Vision | Notes |
|----------|--------------------------|---------|--------|--------|
| `qwen/qwen3-coder-next` | $0.12 / $0.75 per 1M | 256K | No | Very cheap, coding/agents. |
| `liquid/lfm-2-24b-a2b` | $0.03 / $0.12 per 1M | 32K | No | Efficient MoE. |
| `mistralai/ministral-3b-2512` | $0.10 / $0.10 per 1M | — | No | Tiny, fast. |
| `z-ai/glm-4.7-flash` | $0.06 / $0.40 per 1M | — | — | Low cost. |
| `bytedance-seed/seed-1.6-flash` | $0.075 / $0.30 per 1M | — | — | Fast, cheap. |
| `xiaomi/mimo-v2-flash` | $0.09 / $0.29 per 1M | — | — | Budget flash. |

### Mid-tier (quality/cost balance)

| Model ID | Input / output (approx) | Context | Vision | Notes |
|----------|--------------------------|---------|--------|--------|
| `qwen/qwen3.5-flash-02-23` | $0.10 / $0.40 per 1M | 1M | Yes | Fast, vision, long context. |
| `qwen/qwen3.5-35b-a3b` | $0.25 / $2.00 per 1M | 256K | Yes | Good vision + reasoning. |
| `qwen/qwen3.5-27b` | $0.30 / $2.40 per 1M | 256K | Yes | Strong vision. |
| `bytedance-seed/seed-2.0-mini` | $0.10 / $0.40 per 1M | 256K | Yes | Multimodal, reasoning modes. |
| `deepseek/deepseek-v3.2` | $0.25 / $0.40 per 1M | — | — | Strong general model. |
| `minimax/minimax-m2.5` | $0.30 / $1.10 per 1M | 196K | No | Good for coding/agents. |
| `moonshotai/kimi-k2.5` | $0.45 / $2.20 per 1M | — | — | Kimi 2.5. |
| `anthropic/claude-sonnet-4.6` | $3 / $15 per 1M | 1M | Yes | Strong all-round, tools, vision. |

### Premium (best quality)

| Model ID | Input / output (approx) | Context | Vision | Notes |
|----------|--------------------------|---------|--------|--------|
| `qwen/qwen3.5-122b-a10b` | $0.40 / $3.20 per 1M | 256K | Yes | Top Qwen VL. |
| `qwen/qwen3.5-397b-a17b` | $0.55 / $3.50 per 1M | 256K | Yes | Frontier Qwen. |
| `google/gemini-3.1-pro-preview` | $2 / $12 per 1M | 1M | Yes | 1M context, multimodal. |
| `google/gemini-3.1-pro-preview-customtools` | $2 / $12 per 1M | 1M | Yes | Tuned for tool use. |
| `anthropic/claude-opus-4.6` | $5 / $25 per 1M | 1M | Yes | Top-tier Claude. |
| `openai/gpt-5.3-codex` | $1.75 / $14 per 1M | 400K | Yes | Strong coding/agent. |

---

## Vision-capable models (for OCR)

Use these (or their free equivalents) when the flow needs **image** input (e.g. OCR, screenshots):

- **Free:** `openrouter/free`, `qwen/qwen3-vl-235b-a22b-thinking`, `qwen/qwen3-vl-30b-a3b-thinking`
- **Paid:** `qwen/qwen3.5-flash-02-23`, `qwen/qwen3.5-35b-a3b`, `qwen/qwen3.5-27b`, `qwen/qwen3.5-122b-a10b`, `bytedance-seed/seed-2.0-mini`, `google/gemini-3.1-pro-preview`, `anthropic/claude-sonnet-4.6`, `anthropic/claude-opus-4.6`, `openai/gpt-5.3-codex`

---

## Where models are configured in this repo

| Location | Purpose |
|----------|---------|
| `packages/agent/src/router/schema.ts` | `ROUTER_MODEL`, `DEFAULT_MODEL` (fallback), `OPENROUTER_MODELS` enum for router output. `getDefaultConfig().model` uses `openai/gpt-oss-120b:free` as fallback. |
| `apps/app/app/composables/useModels.ts` | UI model picker list; default selection is `openai/gpt-5.3-codex`. |
| `apps/app/server/utils/bot/ai.ts` | Router and chat model. |
| `apps/app/server/utils/chat/generate-title.ts` | Title generation (`ROUTER_MODEL`). |
| `apps/app/server/api/sources/ocr.post.ts` | OCR vision models (primary + fallback). |
| `packages/agent/src/tools/web-search.ts` | Web search model. |

To add or change models, update the enum in `schema.ts` and the list in `useModels.ts` so the UI and router stay in sync. Use [OpenRouter Models API](https://openrouter.ai/docs/api-reference/models/get-models) to confirm latest IDs and that each model supports `tools` and `structured_outputs`.
