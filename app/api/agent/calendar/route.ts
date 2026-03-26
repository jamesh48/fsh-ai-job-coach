import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDecryptedSettings } from '@/lib/settings'
import { withRoute } from '@/lib/withRoute'

type CalendarClassification = {
  relevant: boolean
  type: string
  reason: string
}

async function classifyCalendarEvent(
  apiKey: string,
  summary: string,
  description: string,
  organizer: string,
): Promise<CalendarClassification | null> {
  try {
    const client = new Anthropic({ apiKey })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      tools: [
        {
          name: 'classify_calendar_event',
          description:
            'Classify whether this calendar event is relevant to a job search.',
          input_schema: {
            type: 'object' as const,
            properties: {
              relevant: { type: 'boolean' },
              type: {
                type: 'string',
                enum: [
                  'phone_screen',
                  'technical_interview',
                  'onsite',
                  'recruiter_call',
                  'hiring_manager_call',
                  'offer_discussion',
                  'reference_check',
                  'other',
                ],
              },
              reason: { type: 'string' },
            },
            required: ['relevant', 'type', 'reason'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'classify_calendar_event' },
      messages: [
        {
          role: 'user',
          content: `You are filtering job search calendar events. Classify whether this calendar event is relevant to a job search.

Return relevant: true ONLY for events that represent job search activity: interviews (phone screens, technical rounds, onsite, final rounds), recruiter calls, hiring manager calls, offer discussions, reference checks, or any meeting with a company you're interviewing with.

Return relevant: false for everything else: personal events, internal team meetings, dentist appointments, social events, generic "busy" blocks, etc.

Event title: ${summary}
Organizer: ${organizer}
Description: ${description}`,
        },
      ],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') return null
    return toolUse.input as CalendarClassification
  } catch {
    return null
  }
}

export const POST = withRoute('agent/calendar', async (request: Request) => {
  const secret = request.headers.get('x-internal-secret')
  if (!process.env.INTERNAL_SECRET || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, ...body } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  const result = await getDecryptedSettings(userId)

  // No API key — fail open
  if (!result) {
    return NextResponse.json({ relevant: true, classification: null })
  }

  const { apiKey } = result

  const classification = await classifyCalendarEvent(
    apiKey,
    body.summary ?? '',
    body.description ?? '',
    body.organizer ?? '',
  )

  // Classification failed — fail open
  if (!classification) {
    return NextResponse.json({ relevant: true, classification: null })
  }

  if (!classification.relevant) {
    return NextResponse.json({ relevant: false })
  }

  const eventId =
    body.id ??
    body.eventId ??
    `${body.summary ?? 'event'}-${body.start ?? Date.now()}`
  await prisma.agentCalendarEvent.upsert({
    where: { userId_eventId: { userId, eventId } },
    create: {
      userId,
      eventId,
      summary: body.summary ?? '',
      description: body.description ?? null,
      start: body.start ?? null,
      end: body.end ?? null,
      organizer: body.organizer ?? null,
      classification,
    },
    update: {},
  })

  return NextResponse.json({ relevant: true, classification })
})
