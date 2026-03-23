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
  sender: string,
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
          content: `You are filtering job search emails for a job seeker. Classify whether this email is worth surfacing to them.

IMPORTANT: Only classify as relevant emails that were RECEIVED by the job seeker — i.e. emails sent to them by a recruiter, hiring manager, or employer. If the sender appears to be the job seeker themselves (e.g. the email is in their Sent folder, or the sender address matches a personal name rather than a company/recruiter), return relevant: false.

Return relevant: true for any of the following:
- Recruiter or hiring manager outreach, intros, or follow-ups
- Interview requests, confirmations, or emails containing meeting links/dial-in details (even if the email body includes automated Teams/Zoom/calendar content — what matters is that a human recruiter sent it)
- Requests for availability or scheduling
- Application confirmations or status updates from a staffing agency, recruiter, or employer (e.g. "we received your application and are reviewing it") — these confirm the application is being actively handled
- Offer details or next steps
- Rejection letters — ALWAYS mark relevant: true for any rejection, even automated ones from an ATS

Return relevant: false for: purely automated mass emails (generic job alert digests, LinkedIn job recommendation emails, automated "we received your online application" from large ATS systems with no personal address), AND emails sent by the job seeker themselves.

When in doubt, err on the side of relevant: true.

From: ${sender}
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

  const { userId, ...body } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const settings = await prisma.settings.findUnique({
    where: { userId },
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
    : await classifyEmail(apiKey, body.subject, body.snippet, body.from ?? '')

  // Classification failed — fail open (don't store)
  if (!classification) {
    return NextResponse.json({ relevant: true, classification: null })
  }

  if (!classification.relevant) {
    return NextResponse.json({ relevant: false })
  }

  await prisma.agentEmail.upsert({
    where: { userId_emailId: { userId, emailId: body.id } },
    create: {
      userId,
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
