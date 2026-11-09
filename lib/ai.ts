import type Anthropic from '@anthropic-ai/sdk'

/**
 * Model IDs used across the app. Change them here to upgrade every route.
 * - main: user-facing writing, coaching, extraction
 * - fast: high-volume classification and tiny helper calls
 */
export const AI_MODELS = {
  main: 'claude-sonnet-5-5',
  fast: 'claude-haiku-5-5',
} as const

/** Thrown when Claude declines a request (`stop_reason: "refusal"`). */
export class AiRefusalError extends Error {
  constructor() {
    super(
      'Claude declined this request. Try rephrasing it or removing sensitive content.',
    )
    this.name = 'AiRefusalError'
  }
}

/**
 * Returns the concatenated text blocks of a response. Content is read by
 * block type because current models can return `thinking` blocks before the
 * answer. Throws on refusals, and when thinking used up `max_tokens` before
 * any answer was written, so routes never return a silent empty string.
 */
export function getResponseText(message: Anthropic.Message): string {
  if (message.stop_reason === 'refusal') throw new AiRefusalError()

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')

  if (!text.trim() && message.stop_reason === 'max_tokens') {
    throw new Error(
      'Claude ran out of room before writing a response. Please try again.',
    )
  }
  return text
}
