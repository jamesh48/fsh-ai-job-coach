import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
): Promise<NextResponse<{ plan: string } | { error: string }>> {
  const { startDate, durationWeeks, priorities, additionalContext } =
    await request.json().catch(() => ({}))

  if (!startDate && !durationWeeks && !priorities) {
    return NextResponse.json(
      { error: 'Fill in at least a start date, duration, or priorities.' },
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

  const context = [
    startDate && `Start date: ${startDate}`,
    durationWeeks && `Duration: ${durationWeeks} weeks`,
    priorities && `Top priorities / focus areas:\n${priorities}`,
    additionalContext && `Additional context:\n${additionalContext}`,
    settings.careerProfile && `Candidate profile:\n${settings.careerProfile}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `You are an expert job search coach. Generate a detailed, week-by-week job search plan based on the user's inputs.

The plan should:
- Use SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
- Be structured week by week or by phase, with clear focus for each period
- Include concrete daily/weekly targets (e.g., applications per week, networking messages, hours of prep)
- Cover the full arc: pipeline building, applications, networking, interview prep, and follow-up cadence
- Reference the candidate's profile and stated priorities when provided

Format as plain prose organized by week or phase. Be direct and motivating. No bullet-point-only lists — write it as a real plan the person will actually follow.`,
      messages: [{ role: 'user', content: context }],
    })

    const plan = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    return NextResponse.json({ plan })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings.' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to generate plan. Please try again.' },
      { status: 502 },
    )
  }
}
