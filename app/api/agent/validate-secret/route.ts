import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const { secret } = await request.json()

  if (!secret || typeof secret !== 'string') {
    return NextResponse.json({ authorized: false })
  }

  const settings = await prisma.settings.findFirst({
    select: { agentSecret: true, userId: true },
  })

  if (!settings?.agentSecret) {
    return NextResponse.json({ authorized: false })
  }

  const storedSecret = decrypt(settings.agentSecret)
  if (storedSecret !== secret) {
    return NextResponse.json({ authorized: false })
  }

  return NextResponse.json({ authorized: true, userId: settings.userId })
}
