import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
): Promise<NextResponse<{ response: string } | { error: string }>> {
  const { prompt, jobContext } = await request.json().catch(() => ({}))

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
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

  const systemParts = [
    `You are a job search writing assistant. Help the user with cover letters, prompt responses, interview prep, outreach messages, follow-ups, and any other job search writing tasks. Be direct and practical. Match the tone and length the user asks for — default to concise unless they request otherwise.`,
    settings.careerProfile &&
      `Candidate profile (use this to personalize all responses):\n${settings.careerProfile}`,
  ].filter(Boolean)

  const userParts = [
    jobContext?.jobTitle &&
      jobContext?.company &&
      `Role: ${jobContext.jobTitle} at ${jobContext.company}`,
    jobContext?.roleDescription &&
      `Job description:\n${jobContext.roleDescription}`,
    `Request:\n${prompt}`,
  ].filter(Boolean)

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemParts.join('\n\n'),
      messages: [{ role: 'user', content: userParts.join('\n\n') }],
    })

    const raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')

    const response = raw
      .replace(/\u2014/g, ' - ') // em dash —
      .replace(/\u2013/g, ' - ') // en dash –
      .replace(/\u2018|\u2019/g, "'") // curly apostrophes ' '
      .replace(/\u201C|\u201D/g, '"') // curly quotes " "
      .replace(/\u2026/g, '...') // ellipsis …

    return NextResponse.json({ response })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings.' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to get a response. Please try again.' },
      { status: 502 },
    )
  }
}
