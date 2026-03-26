import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { sanitizeAiText } from '@/lib/utils'

type RouteHandler = (req: Request) => Promise<NextResponse>

function deriveMessage(e: unknown): string {
  // Anthropic APIError: prefer the parsed body's inner message over the raw SDK message
  if (e instanceof Anthropic.APIError) {
    const inner = (e.error as { error?: { message?: string } } | undefined)
      ?.error?.message
    if (inner) return inner
    if (e.message) return e.message
  }
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return 'Unknown error'
}

function isBillingError(e: unknown): boolean {
  if (!(e instanceof Anthropic.APIError)) return false
  const body = e.error as
    | { error?: { type?: string; message?: string } }
    | undefined
  const type = body?.error?.type
  const msg = body?.error?.message ?? e.message ?? ''
  return (
    type === 'billing_quota_exceeded' ||
    (type === 'invalid_request_error' && msg.toLowerCase().includes('credit'))
  )
}

async function sanitizeResponse(res: NextResponse): Promise<NextResponse> {
  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return res
  const body: Record<string, unknown> = await res.json()
  const sanitized = Object.fromEntries(
    Object.entries(body).map(([k, v]) => [
      k,
      typeof v === 'string' ? sanitizeAiText(v) : v,
    ]),
  )
  return NextResponse.json(sanitized, { status: res.status })
}

export function withAiRoute(name: string, handler: RouteHandler): RouteHandler {
  return async (req: Request) => {
    try {
      return await sanitizeResponse(await handler(req))
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

      if (isBillingError(e)) {
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
