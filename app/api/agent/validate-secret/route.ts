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

  let storedSecret: string
  try {
    storedSecret = decrypt(settings.agentSecret)
  } catch (err) {
    console.error('[validate-secret] failed to decrypt agent secret:', err)
    return NextResponse.json({ authorized: false })
  }

  if (storedSecret !== secret) {
    return NextResponse.json({ authorized: false })
  }

  return NextResponse.json({ authorized: true, userId: settings.userId })
}
