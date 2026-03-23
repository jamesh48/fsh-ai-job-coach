import { NextResponse } from 'next/server'
import { sendToAgent } from '@/lib/agentFiles'
import { getSession } from '@/lib/session'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  const sent = sendToAgent({
    type: 'save_file',
    payload: { filename: file.name, base64 },
  })

  if (!sent) {
    return NextResponse.json(
      { error: 'Agent is not connected' },
      { status: 503 },
    )
  }

  return NextResponse.json({ ok: true })
}
