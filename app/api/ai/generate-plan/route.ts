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
      max_tokens: 2048,
      system: `You are a job search coach generating a structured plan that will be used as context by an AI recommendation engine — not read directly by the user.

Output a compact, information-dense brief:
- Phase or week headings with 1-2 sentence focus summaries
- Key numeric targets per phase (applications, outreach, prep hours)
- Stated priorities and profile details woven in explicitly so the AI can reference them
- Flag any time-sensitive milestones (e.g., "week 3: target 2 phone screens")
- No motivational filler, no generic advice — only signal the recommendation AI can act on

Keep the total response under 900 words. Prioritize structure and specificity over completeness.`,
      messages: [{ role: 'user', content: context }],
    })

    const plan = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: { jobSearchPlan: plan },
      create: { id: 'singleton', jobSearchPlan: plan },
    })

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
