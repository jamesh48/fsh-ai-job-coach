import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { withRoute } from '@/lib/withRoute'

export const PUT = withRoute('logs/[id]', async (request: Request, ctx) => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const body = await request.json()
  const log = await prisma.dailyLog.update({
    where: { id },
    data: { date: body.date, content: body.content },
  })
  return NextResponse.json(log)
})

export const DELETE = withRoute('logs/[id]', async (_request: Request, ctx) => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  await prisma.dailyLog.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
})
