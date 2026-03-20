import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDecryptedSettings } from '@/lib/settings'

export async function POST(
  request: Request,
): Promise<
  NextResponse<{ response: string; filename: string } | { error: string }>
> {
  const { prompt, jobContext } = await request.json().catch(() => ({}))

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await getDecryptedSettings(session.userId)
  if (!result) {
    return NextResponse.json(
      { error: 'Anthropic API key not configured. Add it in Settings.' },
      { status: 503 },
    )
  }
  const { apiKey, settings } = result

  const profileLinks: { label: string; url: string }[] = settings?.profileLinks
    ? JSON.parse(settings.profileLinks)
    : []
  const linksContext =
    profileLinks.length > 0
      ? `Candidate links (use only the 1-2 most relevant for the document type — do not include all of them):\n${profileLinks.map((l) => `- ${l.label}: ${l.url}`).join('\n')}`
      : null

  const systemParts = [
    `You are a job search writing assistant. Help the user with cover letters, prompt responses, interview prep, outreach messages, follow-ups, and any other job search writing tasks. Be direct and practical. Match the tone and length the user asks for — default to concise unless they request otherwise. Always format your response using markdown. Do NOT use horizontal rules (---). When writing a cover letter, do NOT include a standalone recipient line (e.g. "Hiring Team Acme") before the salutation — the salutation itself is sufficient. When writing emails, do NOT open with "Dear" — use "Hi [Name]," or "Hello [Name]," instead. In the closing of a cover letter, use this exact structure with a blank line between each:

Warm regards,

[Candidate Name]

[link1] | [link2] When the user explicitly asks you to write or draft a document (cover letter, email, message, bio, etc.), output ONLY the document itself — no intro sentence, no closing remarks, no follow-up questions. For all other requests (feedback, advice, brainstorming, explanation), respond naturally. Do NOT assume, invent, or infer specific tools, technologies, workflows, or preferences that are not explicitly stated in the candidate profile or resume. Only reference what is directly provided.`,
    settings?.careerProfile &&
      `Candidate profile (use this to personalize all responses):\n${settings.careerProfile}`,
    settings?.resume &&
      `Candidate resume (use this as the source of truth for experience, skills, and accomplishments):\n${settings.resume}`,
    linksContext,
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
    const promptSnippet = userParts.join(' ').slice(0, 300)

    const [message, filenameMessage] = await Promise.all([
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemParts.join('\n\n'),
        messages: [{ role: 'user', content: userParts.join('\n\n') }],
      }),
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 20,
        messages: [
          {
            role: 'user',
            content: `Suggest a short filename (kebab-case, no extension, max 5 words) for a document created from this request: "${promptSnippet}". Reply with ONLY the filename, nothing else.`,
          },
        ],
      }),
    ])

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

    const filename =
      filenameMessage.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'ai-response'

    return NextResponse.json({ response, filename })
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
