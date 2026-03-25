import { NextResponse } from 'next/server'
import { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { withRoute } from '@/lib/withRoute'

export const GET = withRoute('logs', async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await prisma.dailyLog.findMany({
    where: { userId: session.userId },
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(logs)
})

export const POST = withRoute('logs', async (request: Request) => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  try {
    const log = await prisma.dailyLog.create({
      data: { userId: session.userId, date: body.date, content: body.content },
    })
    return NextResponse.json(log, { status: 201 })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An entry already exists for this date.' },
        { status: 409 },
      )
    }
    throw e
  }
})
