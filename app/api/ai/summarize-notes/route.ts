import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDecryptedSettings } from '@/lib/settings'
import { withAiRoute } from '@/lib/withAiRoute'

export const POST = withAiRoute(
  'summarize-notes',
  async (
    request: Request,
  ): Promise<NextResponse<{ summary: string } | { error: string }>> => {
    const { notes } = await request.json().catch(() => ({}))
    if (!notes?.trim()) {
      return NextResponse.json({ error: 'No notes provided.' }, { status: 400 })
    }

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await getDecryptedSettings(session.userId)
    if (!result) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Add it in Settings.' },
        { status: 503 },
      )
    }
    const { apiKey } = result

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system:
        'You are helping a job seeker clean up their daily activity notes. Given a raw brain-dump of job search activities, rewrite it as a clear, concise summary of what was accomplished. Keep the first-person voice. Preserve all meaningful details — outreach, applications, interviews, research, networking. Remove filler words and redundancy. Plain prose only — no bullet points, no headers.',
      messages: [{ role: 'user', content: notes }],
    })
    const summary = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    return NextResponse.json({ summary })
  },
)
