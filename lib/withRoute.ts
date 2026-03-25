import { NextResponse } from 'next/server'

type RouteContext = { params: Promise<Record<string, string>> }
type RouteHandler = (req: Request, ctx: RouteContext) => Promise<NextResponse>

function deriveMessage(e: unknown): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'string' && e) return e
  return 'Unknown error'
}

export function withRoute(name: string, handler: RouteHandler): RouteHandler {
  return async (req: Request, ctx: RouteContext) => {
    try {
      return await handler(req, ctx)
    } catch (e) {
      const message = deriveMessage(e)
      console.error(`[${name}] ${message}`, e)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
