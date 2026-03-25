import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getDecryptedSettings } from '@/lib/settings'
import { withAiRoute } from '@/lib/withAiRoute'

export const POST = withAiRoute(
  'generate-plan',
  async (
    request: Request,
  ): Promise<NextResponse<{ plan: string } | { error: string }>> => {
    const { startDate, durationWeeks, priorities, additionalContext } =
      await request.json().catch(() => ({}))

    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!startDate && !durationWeeks && !priorities) {
      return NextResponse.json(
        { error: 'Fill in at least a start date, duration, or priorities.' },
        { status: 400 },
      )
    }

    const result = await getDecryptedSettings(session.userId)
    if (!result) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured. Add it in Settings.' },
        { status: 503 },
      )
    }
    const { apiKey, settings } = result

    const context = [
      startDate && `Start date: ${startDate}`,
      durationWeeks && `Duration: ${durationWeeks} weeks`,
      priorities && `Top priorities / focus areas:\n${priorities}`,
      additionalContext && `Additional context:\n${additionalContext}`,
      settings?.careerProfile &&
        `Candidate profile:\n${settings.careerProfile}`,
    ]
      .filter(Boolean)
      .join('\n\n')

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
      where: { userId: session.userId },
      update: { jobSearchPlan: plan },
      create: { userId: session.userId, jobSearchPlan: plan },
    })

    return NextResponse.json({ plan })
  },
)
