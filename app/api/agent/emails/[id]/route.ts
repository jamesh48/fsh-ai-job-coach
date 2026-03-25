import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoute } from '@/lib/withRoute'

export const DELETE = withRoute(
  'agent/emails/[id]',
  async (_request: Request, ctx) => {
    const { id } = await ctx.params
    await prisma.agentEmail.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
)
