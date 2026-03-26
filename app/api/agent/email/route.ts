import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDecryptedSettings } from '@/lib/settings'
import { withRoute } from '@/lib/withRoute'

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
  } catch (err) {
    console.error('[agent/email] classifyEmail error:', err)
    return null
  }
}

export const POST = withRoute('agent/email', async (request: Request) => {
  console.log('[agent/email] POST received')

  const secret = request.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    console.log(
      '[agent/email] Unauthorized — secret mismatch or INTERNAL_SECRET not set',
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, ...body } = await request.json()
  console.log(
    `[agent/email] userId=${userId} emailId=${body.id} subject="${body.subject}" from="${body.from}"`,
  )

  if (!userId) {
    console.log('[agent/email] Missing userId')
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const result = await getDecryptedSettings(userId)

  // No API key — fail open so emails aren't silently dropped
  if (!result) {
    console.log(
      '[agent/email] No API key configured — failing open (relevant: true, no classification)',
    )
    return NextResponse.json({ relevant: true, classification: null })
  }

  const { apiKey } = result

  const BYPASS_PHRASE = 'fsh-test'
  const isBypass =
    body.subject?.includes(BYPASS_PHRASE) ||
    body.snippet?.includes(BYPASS_PHRASE)

  if (isBypass) {
    console.log(
      '[agent/email] Test bypass phrase detected — skipping classification',
    )
  } else {
    console.log('[agent/email] Sending to Claude Haiku for classification...')
  }

  const classification = isBypass
    ? { relevant: true, type: 'other', reason: 'Test bypass' }
    : await classifyEmail(apiKey, body.subject, body.snippet, body.from ?? '')

  // Classification failed — fail open (don't store)
  if (!classification) {
    console.log(
      '[agent/email] Classification returned null — failing open (relevant: true, no store)',
    )
    return NextResponse.json({ relevant: true, classification: null })
  }

  console.log(
    `[agent/email] Classification result: relevant=${classification.relevant} type=${classification.type} reason="${classification.reason}"`,
  )

  if (!classification.relevant) {
    console.log('[agent/email] Email classified as not relevant — dropping')
    return NextResponse.json({ relevant: false })
  }

  console.log(`[agent/email] Upserting to DB: emailId=${body.id}`)
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
  console.log(`[agent/email] Upsert complete — returning relevant: true`)

  return NextResponse.json({ relevant: true, classification })
})
