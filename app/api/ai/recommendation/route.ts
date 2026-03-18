import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import type {
  AiRecommendationResponse,
  StoredRecommendationResponse,
} from '@/features/ai/types'
import { prisma } from '@/lib/prisma'

const ID = 'singleton'

export async function GET(): Promise<
  NextResponse<StoredRecommendationResponse>
> {
  const settings = await prisma.settings.findUnique({ where: { id: ID } })
  return NextResponse.json({
    recommendation: settings?.lastRecommendation ?? null,
    date: settings?.lastRecommendationAt
      ? new Date(settings.lastRecommendationAt).toISOString()
      : null,
  })
}

function buildPlanContext(plan: string | null): string {
  if (!plan?.trim()) return ''
  return `\nJob search plan:\n${plan.trim()}\n`
}

export async function POST(
  request: Request,
): Promise<NextResponse<AiRecommendationResponse | { error: string }>> {
  const { date } = await request.json().catch(() => ({}))
  const settings = await prisma.settings.findUnique({
    where: { id: ID },
  })
  const apiKey = settings?.anthropicApiKey
  const careerProfile = settings?.careerProfile
  const resume = settings?.resume ?? null
  const jobSearchPlan = settings?.jobSearchPlan ?? null
  const profileLinks: { label: string; url: string }[] = settings?.profileLinks
    ? JSON.parse(settings.profileLinks)
    : []
  const linksContext =
    profileLinks.length > 0
      ? `\nCandidate links:\n${profileLinks.map((l) => `- ${l.label}: ${l.url}`).join('\n')}\n`
      : ''

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Anthropic API key is not configured. Add it in Settings.' },
      { status: 503 },
    )
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  const [recentLogs, oldPriorityLogs, recentEmails] = await Promise.all([
    prisma.dailyLog.findMany({
      where: { date: { gte: cutoffStr } },
      orderBy: { date: 'asc' },
    }),
    prisma.dailyLog.findMany({
      where: {
        date: { lt: cutoffStr },
        OR: [
          { content: { contains: 'Priority: Hot Lead' } },
          { content: { contains: 'Priority: Strong Interest' } },
        ],
      },
      orderBy: { date: 'asc' },
    }),
    prisma.agentEmail.findMany({
      where: { receivedAt: { gte: cutoff } },
      orderBy: { receivedAt: 'asc' },
    }),
  ])

  const seen = new Set<string>()
  const logs = [...oldPriorityLogs, ...recentLogs].filter((l) => {
    if (seen.has(l.id)) return false
    seen.add(l.id)
    return true
  })

  if (logs.length === 0) {
    return NextResponse.json({
      recommendation:
        'No activity logged yet. Start by adding your first daily entry — even a small step counts.',
    })
  }

  const logText = logs.map((log) => `${log.date}:\n${log.content}`).join('\n\n')
  const today = date ?? new Date().toISOString().slice(0, 10)
  const planContext = buildPlanContext(jobSearchPlan)

  const emailContext =
    recentEmails.length > 0
      ? `\nRecent notable emails (auto-detected, AI-filtered):\n${recentEmails
          .map(
            (e: {
              subject: string
              sender: string
              date: string
              classification: unknown
            }) => {
              const c = e.classification as {
                type: string
                reason: string
              } | null
              return `- "${e.subject}" from ${e.sender} (${e.date})${c ? ` [${c.type}]: ${c.reason}` : ''}`
            },
          )
          .join('\n')}\n`
      : ''

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You are an expert job search coach. The user shares their daily job search activity log.
Today's date is ${today}. When referring to dates, always write them in human-readable form (e.g. "March 15" or "March 15, 2026") — never use YYYY-MM-DD format.
${careerProfile ? `\nCandidate profile:\n${careerProfile}\n` : ''}${resume ? `\nCandidate resume:\n${resume}\n` : ''}${linksContext}${planContext}${emailContext}

Job application priority levels — use these to calibrate follow-up advice:
- Quick Apply: low-effort submission (e.g. LinkedIn Easy Apply). Do NOT recommend following up unless there is a compelling reason.
- Standard: a genuine application worth following up after one week of silence.
- Strong Interest: the user is excited about this role — prioritize follow-up, interview prep, and tailoring outreach.
- Hot Lead: highest priority — often a referral, networking connection, or dream company. Always recommend proactive outreach, preparation, or next steps.

The Source field may name a specific person (e.g. "Referred by John Smith") — treat this as a warm networking lead.

Review the activity log${planContext ? ' and the job search plan above' : ''}, then give today's coaching advice. Structure your response as 2–3 short paragraphs:

1. **Today's focus** — one or two specific actions for today, tied to the current plan phase if a plan is provided. Name specific companies, roles, or contacts from the log.
2. **Follow-up priorities** — any high-priority applications (Standard, Strong Interest, or Hot Lead) that warrant action now.
3. **Momentum check** — a brief observation about the overall search: what's going well, what gap to address, or what to keep in mind this week given where the user is in their plan.

Be direct and concrete. No preamble. Use markdown formatting (bold headers, short paragraphs).`,
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
      update: {
        lastRecommendation: recommendation,
        lastRecommendationAt: new Date(),
      },
      create: {
        id: ID,
        lastRecommendation: recommendation,
        lastRecommendationAt: new Date(),
      },
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
