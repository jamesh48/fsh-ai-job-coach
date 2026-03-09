import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
): Promise<NextResponse<{ summary: string } | { error: string }>> {
  const { description } = await request.json().catch(() => ({}))
  if (!description?.trim()) {
    return NextResponse.json(
      { error: 'No description provided.' },
      { status: 400 },
    )
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
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
        'You are a concise job description summarizer. Given a full job posting, extract the most important details: role responsibilities, required skills and experience, seniority level, and any notable context (company stage, team size, perks). Write 4–6 clear sentences. Plain prose only — no bullet points, no headers.',
      messages: [{ role: 'user', content: description }],
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
      { error: 'Failed to summarize. Please try again.' },
      { status: 502 },
    )
  }
}
