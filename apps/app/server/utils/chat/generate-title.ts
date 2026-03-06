import { generateText, type LanguageModel, type UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { log } from 'evlog'
import { GENERATE_TITLE_MODEL } from '@savoir/agent'

const MAX_TITLE_LENGTH = 30
const MAX_PROMPT_LENGTH = 500

/** Extract plain text from a UIMessage (no file refs or JSON blob). Keeps payload small for title models. */
function getMessageText(message: UIMessage): string {
  if (!message.parts?.length) return ''
  const parts = message.parts as Array<{ type: string; text?: string }>
  const text = parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('').trim()
  return text.slice(0, MAX_PROMPT_LENGTH)
}

function fallbackTitle(userText: string): string {
  const t = userText.trim().slice(0, MAX_TITLE_LENGTH)
  return t || 'New conversation'
}

interface GenerateTitleOptions {
  firstMessage: UIMessage
  chatId: string
  requestId: string
  /** OpenRouter API key. Optional — falls back to OPENROUTER_API_KEY env var. */
  apiKey?: string
}

/**
 * Generate and persist a chat title independently from any stream.
 * Returns the generated title, or null on failure.
 * Uses only the message text (not full UIMessage) to avoid provider errors from large payloads.
 */
export async function generateTitle({ firstMessage, chatId, requestId, apiKey }: GenerateTitleOptions): Promise<string | null> {
  const userText = getMessageText(firstMessage)
  const fallback = fallbackTitle(userText)

  try {
    const openrouter = createOpenRouter({ apiKey: apiKey ?? undefined })
    const { text: title } = await generateText({
      model: openrouter(GENERATE_TITLE_MODEL) as unknown as LanguageModel,
      system: `Generate a short chat title (max ${MAX_TITLE_LENGTH} chars) from the user's message.
Rules: no quotes, no colons, no punctuation, plain text only.
If the message is a simple greeting (hi, hey, hello, etc.), respond with a generic title like "New conversation" or "Quick chat".`,
      prompt: userText || 'First message',
    })

    const finalTitle = (title?.trim().slice(0, MAX_TITLE_LENGTH)) || fallback
    await db.update(schema.chats).set({ title: finalTitle }).where(eq(schema.chats.id, chatId))
    log.info('chat', `${requestId} Title: ${finalTitle}`)
    return finalTitle
  } catch (error) {
    log.error('chat', `${requestId} Title generation failed: ${error instanceof Error ? error.message : String(error)}`)
    await db.update(schema.chats).set({ title: fallback }).where(eq(schema.chats.id, chatId))
    return fallback
  }
}
