import { NextResponse } from 'next/server'
import { withRoute } from '@/lib/withRoute'

export const GET = withRoute('healthcheck', async () => {
  return NextResponse.json({ ok: true })
})
