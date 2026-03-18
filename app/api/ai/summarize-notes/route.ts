import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(
  request: Request,
): Promise<NextResponse<{ summary: string } | { error: string }>> {
  const { notes } = await request.json().catch(() => ({}))
  if (!notes?.trim()) {
    return NextResponse.json({ error: 'No notes provided.' }, { status: 400 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.settings.findUnique({
    where: { userId: session.userId },
  })
  const apiKey = settings?.anthropicApiKey
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Add it in Settings.' },
      { status: 503 },
    )
  }

  try {
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
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings.' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to summarize notes. Please try again.' },
      { status: 502 },
    )
  }
}
