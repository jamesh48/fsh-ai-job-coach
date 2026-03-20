import { decrypt } from './crypto'
import { prisma } from './prisma'

/**
 * Fetches settings for a user and returns the decrypted Anthropic API key
 * alongside the full settings object. Returns null if settings are missing
 * or no API key is configured.
 *
 * Used by all AI routes to avoid repeating the settings + decrypt boilerplate.
 */
export async function getDecryptedSettings(userId: string) {
  const settings = await prisma.settings.findUnique({ where: { userId } })
  if (!settings?.anthropicApiKey) return null
  return { apiKey: decrypt(settings.anthropicApiKey), settings }
}
