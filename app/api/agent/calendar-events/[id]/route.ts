import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoute } from '@/lib/withRoute'

export const DELETE = withRoute(
  'agent/calendar-events/[id]',
  async (_request: Request, ctx) => {
    const { id } = await ctx.params
    await prisma.agentCalendarEvent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
)
