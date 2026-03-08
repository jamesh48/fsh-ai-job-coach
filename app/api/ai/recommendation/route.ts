import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import type { AiRecommendationResponse } from '@/features/ai/types'
import { prisma } from '@/lib/prisma'

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '• ')
    .trim()
}

function formatDateUS(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${month}-${day}-${year}`
}

function buildEscPosBuffer(text: string): Buffer {
  const ESC = 0x1b
  const GS = 0x1d

  const init = Buffer.from([ESC, 0x40])
  const center = Buffer.from([ESC, 0x61, 0x01])
  const left = Buffer.from([ESC, 0x61, 0x00])
  const boldOn = Buffer.from([ESC, 0x45, 0x01])
  const boldOff = Buffer.from([ESC, 0x45, 0x00])
  const feed = (n: number) => Buffer.from([ESC, 0x64, n])
  const cut = Buffer.from([GS, 0x56, 0x41, 0x05])

  const sep = Buffer.from(`${'-'.repeat(32)}\n`, 'utf8')
  const nl = Buffer.from('\n', 'utf8')
  const today = formatDateUS(new Date().toISOString().slice(0, 10))

  return Buffer.concat([
    init,
    feed(2),
    center,
    sep,
    boldOn,
    Buffer.from('JOB SEARCH COACH\n', 'utf8'),
    boldOff,
    Buffer.from(`${today}\n`, 'utf8'),
    sep,
    nl,
    left,
    Buffer.from(`${stripMarkdown(text)}\n`, 'utf8'),
    nl,
    center,
    sep,
    feed(5),
    cut,
  ])
}

export async function POST(): Promise<NextResponse<AiRecommendationResponse | { error: string }>> {
  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })
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

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `You are an expert job search coach. The user will share their job search activity log with one entry per day.
Today's date is ${new Date().toISOString().slice(0, 10)}.
Review the log and provide one specific, actionable task the user should complete TODAY to maximize their job search success.
Be direct and concrete — name specific companies, roles, or contacts from their log where possible.
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

    return NextResponse.json({ recommendation })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings or .env.' },
        { status: 401 },
      )
    }
    if (e instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: 'Anthropic rate limit reached. Please wait a moment and try again.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to reach the AI service. Please try again.' },
      { status: 502 },
    )
  }
}
