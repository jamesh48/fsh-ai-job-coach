import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type EmailClassification = {
  relevant: boolean
  type: string
  reason: string
}

async function classifyEmail(
  apiKey: string,
  subject: string,
  snippet: string,
): Promise<EmailClassification | null> {
  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      tools: [
        {
          name: 'classify_email',
          description:
            'Classify whether this job search email is worth surfacing to the user.',
          input_schema: {
            type: 'object' as const,
            properties: {
              relevant: { type: 'boolean' },
              type: {
                type: 'string',
                enum: [
                  'recruiter_intro',
                  'interview_request',
                  'interview_confirmation',
                  'next_steps',
                  'availability_request',
                  'offer',
                  'rejection',
                  'other',
                ],
              },
              reason: { type: 'string' },
            },
            required: ['relevant', 'type', 'reason'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'classify_email' },
      messages: [
        {
          role: 'user',
          content: `You are filtering job search emails. Classify whether this email is worth surfacing to a job seeker.

Return relevant: true ONLY for emails representing real human interaction or next steps: recruiter intros, interview requests or confirmations, hiring manager outreach, requests for availability, offer details, rejection letters from humans.

Return relevant: false for automated emails: application confirmations, "your application was received", job alert digests, LinkedIn notifications, automated status updates.

Subject: ${subject}
Snippet: ${snippet}`,
        },
      ],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return null
    return toolUse.input as EmailClassification
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
  })

  const apiKey = settings?.anthropicApiKey

  // No API key — fail open so emails aren't silently dropped
  if (!apiKey) {
    return NextResponse.json({ relevant: true, classification: null })
  }

  const BYPASS_PHRASE = 'fsh-test'
  const isBypass =
    body.subject?.includes(BYPASS_PHRASE) ||
    body.snippet?.includes(BYPASS_PHRASE)

  const classification = isBypass
    ? { relevant: true, type: 'other', reason: 'Test bypass' }
    : await classifyEmail(apiKey, body.subject, body.snippet)

  // Classification failed — fail open (don't store)
  if (!classification) {
    return NextResponse.json({ relevant: true, classification: null })
  }

  if (!classification.relevant) {
    return NextResponse.json({ relevant: false })
  }

  await prisma.agentEmail.upsert({
    where: { emailId: body.id },
    create: {
      emailId: body.id,
      threadId: body.threadId,
      subject: body.subject,
      sender: body.from,
      snippet: body.snippet,
      date: body.date,
      classification,
    },
    update: {},
  })

  return NextResponse.json({ relevant: true, classification })
}
