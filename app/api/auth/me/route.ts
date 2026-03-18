import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { username: true },
  })

  if (!user)
    return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ username: user.username })
}
