import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST(
  request: Request,
): Promise<NextResponse<{ impression: string } | { error: string }>> {
  const { impression, jobTitle, company, roleDescription } = await request
    .json()
    .catch(() => ({}))

  if (!impression?.trim()) {
    return NextResponse.json(
      {
        error:
          'Write your initial thoughts first, then use this to clean them up.',
      },
      { status: 400 },
    )
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

  const context = [
    `My thoughts: ${impression}`,
    jobTitle && `Role: ${jobTitle}`,
    company && `Company: ${company}`,
    roleDescription && `Role description: ${roleDescription}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system:
        'You are helping a job seeker clean up and clarify their own thoughts about a job opportunity. Your job is to polish what they wrote — improving clarity, grammar, and flow — while strictly preserving their ideas, opinions, and voice. Do not add new thoughts, assessments, or enthusiasm they did not express. Keep it first-person, concise (2–3 sentences), and plain prose only.',
      messages: [{ role: 'user', content: context }],
    })
    const impression = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    return NextResponse.json({ impression })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings.' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to draft impression. Please try again.' },
      { status: 502 },
    )
  }
}
