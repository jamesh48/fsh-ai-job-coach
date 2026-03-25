import { NextResponse } from 'next/server'
import { clearFiles, getFiles } from '@/lib/agentFiles'
import { getSession } from '@/lib/session'
import { withRoute } from '@/lib/withRoute'

export const GET = withRoute('agent/files', async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(getFiles(session.userId))
})

export const DELETE = withRoute('agent/files', async () => {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  clearFiles(session.userId)
  return NextResponse.json({ ok: true })
})
