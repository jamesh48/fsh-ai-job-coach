import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EXPIRY_DAYS = 90

export async function GET() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS)

  await prisma.agentCalendarEvent.deleteMany({
    where: { receivedAt: { lt: cutoff } },
  })

  const events = await prisma.agentCalendarEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(events)
}

export async function DELETE() {
  await prisma.agentCalendarEvent.deleteMany({})
  return NextResponse.json({ ok: true })
}
