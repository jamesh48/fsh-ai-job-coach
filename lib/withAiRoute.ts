import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

type RouteHandler = (req: Request) => Promise<NextResponse>

function deriveMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return 'Unknown error'
}

export function withAiRoute(name: string, handler: RouteHandler): RouteHandler {
  return async (req: Request) => {
    try {
      return await handler(req)
    } catch (e) {
      const message = deriveMessage(e)
      console.error(`[ai/${name}] ${message}`, e)

      if (e instanceof Anthropic.AuthenticationError) {
        return NextResponse.json(
          { error: 'Invalid Anthropic API key. Check your key in Settings.' },
          { status: 401 },
        )
      }

      if (e instanceof Anthropic.RateLimitError) {
        return NextResponse.json(
          {
            error:
              'Anthropic rate limit reached. Please wait a moment and try again.',
          },
          { status: 429 },
        )
      }

      if (
        e instanceof Anthropic.PermissionDeniedError &&
        (e.error as { type?: string } | undefined)?.type ===
          'billing_quota_exceeded'
      ) {
        return NextResponse.json(
          {
            error:
              'Your Anthropic account is out of credits. Add credits at console.anthropic.com.',
          },
          { status: 402 },
        )
      }

      const status =
        e instanceof Anthropic.APIError && e.status ? e.status : 502
      return NextResponse.json({ error: message }, { status })
    }
  }
}
