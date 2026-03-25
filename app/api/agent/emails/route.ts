import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { withRoute } from '@/lib/withRoute'

const EXPIRY_DAYS = 90

export const GET = withRoute('agent/emails', async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS)

  // Prune expired emails on each fetch
  await prisma.agentEmail.deleteMany({
    where: { userId: session.userId, receivedAt: { lt: cutoff } },
  })

  const emails = await prisma.agentEmail.findMany({
    where: { userId: session.userId },
    orderBy: { receivedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(emails)
})

export const DELETE = withRoute('agent/emails', async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await prisma.agentEmail.deleteMany({ where: { userId: session.userId } })
  return NextResponse.json({ ok: true })
})
