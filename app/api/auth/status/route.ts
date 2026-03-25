import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoute } from '@/lib/withRoute'

export const GET = withRoute('auth/status', async () => {
  const count = await prisma.user.count()
  return NextResponse.json({ hasUsers: count > 0 })
})
