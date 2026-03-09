import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
): Promise<NextResponse<{ impression: string } | { error: string }>> {
  const { jobTitle, company, priority, roleDescription } = await request
    .json()
    .catch(() => ({}))

  if (!jobTitle && !company && !roleDescription) {
    return NextResponse.json(
      {
        error:
          'Fill in at least the job title, company, or role description first.',
      },
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
    jobTitle && `Role: ${jobTitle}`,
    company && `Company: ${company}`,
    priority && `Priority: ${priority}`,
    roleDescription && `Role description: ${roleDescription}`,
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system:
        'You are helping a job seeker articulate their honest reaction to a job opportunity. Given context about the role, write 2–3 sentences capturing their excitement level, any concerns, and how well it fits their goals. If initial thoughts are provided, polish and condense them. Be candid and first-person. Plain prose only.',
      messages: [{ role: 'user', content: context }],
    })
    const impression = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    return NextResponse.json({ impression })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid Anthropic API key. Check your key in Settings.' },
        { status: 401 },
      )
    }
    return NextResponse.json(
      { error: 'Failed to draft impression. Please try again.' },
      { status: 502 },
    )
  }
}
