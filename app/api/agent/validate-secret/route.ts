import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const { secret } = await request.json()

  if (!secret || typeof secret !== 'string') {
    return NextResponse.json({ authorized: false })
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
  })

  const expected = settings?.agentSecret

  if (!expected) {
    return NextResponse.json({ authorized: false })
  }

  return NextResponse.json({ authorized: secret === expected })
}
