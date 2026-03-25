import { NextResponse } from 'next/server'
import {
  deleteFile,
  getFile,
  requestFileContent,
  sendToAgent,
} from '@/lib/agentFiles'
import { getSession } from '@/lib/session'
import { withRoute } from '@/lib/withRoute'

export const GET = withRoute(
  'agent/files/[id]',
  async (_request: Request, ctx) => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const file = getFile(session.userId, id)
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const content = await requestFileContent(file.path, 45000)
    if (!content) {
      return NextResponse.json(
        {
          error:
            'Agent did not respond — it may be disconnected or the file may no longer exist',
        },
        { status: 503 },
      )
    }

    return NextResponse.json({
      ...file,
      base64: content.base64,
      mimeType: content.mimeType,
    })
  },
)

export const DELETE = withRoute(
  'agent/files/[id]',
  async (_request: Request, ctx) => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const file = getFile(session.userId, id)
    if (!file) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const sent = sendToAgent({
      type: 'delete_file',
      payload: { path: file.path },
    })

    if (!sent) {
      return NextResponse.json(
        { error: 'Agent is not connected' },
        { status: 503 },
      )
    }

    deleteFile(session.userId, id)
    return NextResponse.json({ ok: true })
  },
)
