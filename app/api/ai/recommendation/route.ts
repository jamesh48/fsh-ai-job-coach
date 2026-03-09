import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import type { AiRecommendationResponse, StoredRecommendationResponse } from '@/features/ai/types'
import { prisma } from '@/lib/prisma'

const ID = 'singleton'

export async function GET(): Promise<NextResponse<StoredRecommendationResponse>> {
  const settings = await prisma.settings.findUnique({ where: { id: ID } })
  return NextResponse.json({
    recommendation: settings?.lastRecommendation ?? null,
    date: settings?.lastRecommendationDate ?? null,
  })
}

export async function POST(
  request: Request,
): Promise<NextResponse<AiRecommendationResponse | { error: string }>> {
  const { date } = await request.json().catch(() => ({}))
  const settings = await prisma.settings.findUnique({
    where: { id: ID },
  })
  const apiKey = settings?.anthropicApiKey

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key is not configured. Add it in Settings.' },
      { status: 503 },
    )
  }

  const logs = await prisma.dailyLog.findMany({ orderBy: { date: 'asc' } })

  if (logs.length === 0) {
    return NextResponse.json({
      recommendation:
        'No activity logged yet. Start by adding your first daily entry — even a small step counts.',
    })
  }

  const logText = logs.map((log) => `${log.date}:\n${log.content}`).join('\n\n')
  const today = date ?? new Date().toISOString().slice(0, 10)

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are an expert job search coach. The user shares their daily job search activity log, one entry per day.
Today's date is ${today}.

Job application entries may include a Priority field — use it to calibrate your advice:
- Quick Apply: low-effort submission (e.g. LinkedIn Easy Apply). Low expectations. Do NOT recommend following up on these unless there is a compelling reason.
- Standard: a genuine application worth following up after one week of silence.
- Strong Interest: the user is excited about this role — prioritize follow-up, interview prep, and tailoring outreach.
- Hot Lead: highest priority — often a referral, networking connection, or dream company. Always recommend proactive outreach, preparation, or next steps for these.

The Source field may name a specific person (e.g. "Referred by John Smith") — treat this as a warm networking lead and factor it into follow-up advice when relevant.

Review the full log and provide one specific, actionable task the user should complete TODAY to maximize their job search success.
Be direct and concrete — name specific companies, roles, or contacts from the log where possible.
Keep it to 2-4 sentences. No preamble, just the advice.`,
      messages: [
        {
          role: 'user',
          content: `Here is my job search activity log:\n\n${logText}`,
        },
      ],
    })

    const recommendation = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')

    await prisma.settings.upsert({
      where: { id: ID },
      update: { lastRecommendation: recommendation, lastRecommendationDate: today },
      create: { id: ID, lastRecommendation: recommendation, lastRecommendationDate: today },
    })

    return NextResponse.json({ recommendation })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings' },
        { status: 401 },
      )
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        {
          error:
            'Anthropic rate limit reached. Please wait a moment and try again.',
        },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to reach the AI service. Please try again.' },
      { status: 502 },
    )
  }
}
