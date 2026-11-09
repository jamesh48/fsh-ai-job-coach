import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDecryptedSettings } from '@/lib/settings'
import { withAiRoute } from '@/lib/withAiRoute'

const SYSTEM_PROMPT = `You write the "Career Profile" for a job seeker using an AI job search coaching app. The coach reads this profile on every request, so it must be a dense, accurate summary of the candidate.

Write in the first person, as plain prose paragraphs (no markdown headings, no bullet lists), under 300 words. Cover:
- Current/most recent role, seniority, and years of experience
- Core skills, technologies, and domains of strength
- Notable achievements or scope (team size, impact) evidenced in the resume
- Target roles and seniority
- Industries or company stages of interest
- Location and work arrangement preferences (remote / hybrid / on-site)
- Compensation expectations
- Dealbreakers

Only state facts supported by the resume, links, or existing profile. Never invent preferences. For anything the sources cannot answer (typically target roles, industries, location, compensation, dealbreakers), insert a placeholder in the form [fill in: <what is needed>] so the user can complete it.

If an existing profile is provided, treat the user's own statements in it as authoritative: keep their preferences and wording where possible, and use the resume to fill gaps and correct factual details.

Output only the profile text, with no preamble or commentary.`

export const POST = withAiRoute(
  'draft-profile',
  async (
    request: Request,
  ): Promise<NextResponse<{ profile: string } | { error: string }>> => {
    const { resume, existingProfile, profileLinks } = await request
      .json()
      .catch(() => ({}))

    if (typeof resume !== 'string' || !resume.trim()) {
      return NextResponse.json(
        { error: 'Add your resume first, then draft your profile from it.' },
        { status: 400 },
      )
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
    const { apiKey } = result

    const links = Array.isArray(profileLinks)
      ? profileLinks
          .filter(
            (l): l is { label: string; url: string } =>
              typeof l?.label === 'string' && typeof l?.url === 'string',
          )
          .map((l) => `- ${l.label}: ${l.url}`)
          .join('\n')
      : ''

    const context = [
      `<resume>\n${resume.trim()}\n</resume>`,
      links && `<profile_links>\n${links}\n</profile_links>`,
      typeof existingProfile === 'string' &&
        existingProfile.trim() &&
        `<existing_profile>\n${existingProfile.trim()}\n</existing_profile>`,
    ]
      .filter(Boolean)
      .join('\n\n')

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: context }],
    })

    const profile = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    return NextResponse.json({ profile })
  },
)
