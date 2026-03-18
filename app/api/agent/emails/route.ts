import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const EXPIRY_DAYS = 90

export async function GET() {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS)

  // Prune expired emails on each fetch
  await prisma.agentEmail.deleteMany({ where: { receivedAt: { lt: cutoff } } })

  const emails = await prisma.agentEmail.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(emails)
}

export async function DELETE() {
  await prisma.agentEmail.deleteMany({})
  return NextResponse.json({ ok: true })
}
