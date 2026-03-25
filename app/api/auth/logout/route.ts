import { NextResponse } from 'next/server'
import { destroySession } from '@/lib/session'
import { withRoute } from '@/lib/withRoute'

export const POST = withRoute('auth/logout', async () => {
  await destroySession()
  return NextResponse.json({ ok: true })
})
