import { NextResponse } from 'next/server'
import { decrypt } from '@/lib/crypto'
import { prisma } from '@/lib/prisma'
import { withRoute } from '@/lib/withRoute'

export const POST = withRoute(
  'agent/validate-secret',
  async (request: Request) => {
    const { secret } = await request.json()

    if (!secret || typeof secret !== 'string') {
      return NextResponse.json({ authorized: false })
    }

    const allSettings = await prisma.settings.findMany({
      select: { agentSecret: true, userId: true },
      where: { agentSecret: { not: null } },
    })

    for (const row of allSettings) {
      if (!row.agentSecret) continue
      try {
        const storedSecret = decrypt(row.agentSecret)
        if (storedSecret === secret) {
          return NextResponse.json({ authorized: true, userId: row.userId })
        }
      } catch {
        // skip rows that fail to decrypt
      }
    }

    return NextResponse.json({ authorized: false })
  },
)
