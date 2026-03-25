import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDecryptedSettings } from '@/lib/settings'
import { withAiRoute } from '@/lib/withAiRoute'

interface FillResult {
  jobTitle?: string
  company?: string
  roleDescription?: string
  workArrangement?: string
  compensation?: string
  fitScore?: 1 | 2 | 3 | 4
  fitRationale?: string
  source?: string
  isEasyApply?: boolean
}

function extractPageText(html: string): string {
  // Pull out the LinkedIn job description block if present
  const liMatch = html.match(
    /show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/,
  )
  const focused = liMatch ? liMatch[1] : html

  return focused
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
}

function detectSource(
  url: string,
  html: string,
): { source: string; isEasyApply: boolean } | null {
  if (!/linkedin\.com\/jobs\//i.test(url)) return null
  const isEasyApply =
    /EASY_APPLY/i.test(html) ||
    /easy-apply/i.test(html) ||
    /"applyType"\s*:\s*"EASY/i.test(html)
  return {
    source: isEasyApply ? 'LinkedIn Easy Apply' : 'LinkedIn',
    isEasyApply,
  }
}

function extractMeta(html: string): { title: string; company: string } {
  const titleMatch = html.match(/<title>([^<]*)<\/title>/)
  const raw = titleMatch?.[1] ?? ''
  // LinkedIn format: "Company hiring Job Title in City | LinkedIn"
  const liMatch = raw.match(/^(.+?) hiring (.+?) (?:in|at) /)
  if (liMatch) return { company: liMatch[1].trim(), title: liMatch[2].trim() }
  // Canonical slug: "job-title-at-company-id"
  const canonMatch = html.match(/rel="canonical" href="[^"]*\/([^"/?]+)-(\d+)"/)
  if (canonMatch) {
    const slug = canonMatch[1].replace(/-\d+$/, '')
    const atIdx = slug.lastIndexOf('-at-')
    if (atIdx !== -1) {
      return {
        title: slug
          .slice(0, atIdx)
          .split('-')
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(' '),
        company: slug
          .slice(atIdx + 4)
          .split('-')
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(' '),
      }
    }
  }
  return { title: raw, company: '' }
}

export const POST = withAiRoute(
  'fill-from-url',
  async (
    request: Request,
  ): Promise<NextResponse<FillResult | { error: string }>> => {
    const { url } = await request.json().catch(() => ({}))
    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
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
    const careerProfile = settings.careerProfile ?? null
    const resume = settings.resume ?? null
    const hasFitContext = !!(careerProfile?.trim() || resume?.trim())

    let html: string
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) {
        return NextResponse.json(
          { error: `Could not fetch URL (${res.status}).` },
          { status: 422 },
        )
      }
      html = await res.text()
    } catch {
      return NextResponse.json(
        { error: 'Could not reach that URL. Check it and try again.' },
        { status: 422 },
      )
    }

    const { title: metaTitle, company: metaCompany } = extractMeta(html)
    const bodyText = extractPageText(html)

    const fitScoringFields = hasFitContext
      ? `- fitScore: 1 | 2 | 3 | 4 (how well this role matches the candidate below: 4=Strong Fit, 3=Good Fit, 2=Partial Fit, 1=Weak Fit)
- fitRationale: string (1-2 sentences explaining the score — name specific matches or gaps)`
      : ''

    const candidateContext = hasFitContext
      ? `\nCandidate context for fit scoring:\n${careerProfile ? `Profile: ${careerProfile}\n` : ''}${resume ? `Resume:\n${resume}\n` : ''}`
      : ''

    const client = new Anthropic({ apiKey })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system:
        'You extract structured job posting data. Always respond with valid JSON only — no markdown, no explanation.',
      messages: [
        {
          role: 'user',
          content: `Extract the following fields from this job posting content. Return a JSON object with these keys:
- jobTitle: string (the role title)
- company: string (the hiring company name)
- roleDescription: string (plain text summary of the role, 4-6 sentences, no bullet points)
- workArrangement: "Remote" | "Hybrid" | "On-site" | "" (infer from context)
- compensation: string (salary range or hourly rate exactly as stated, e.g. "$120,000 - $150,000/yr" or "$45-55/hr"; empty string if not mentioned)
${fitScoringFields}

Hints from page metadata — use these if the content doesn't make it clearer:
Title hint: ${metaTitle}
Company hint: ${metaCompany}
${candidateContext}
Job posting content:
${bodyText}`,
        },
      ],
    })

    const raw = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const parsed: FillResult = JSON.parse(jsonStr)

    // Apply same AI-sniff sanitization as the assist route
    if (parsed.roleDescription) {
      parsed.roleDescription = parsed.roleDescription
        .replace(/\u2014/g, ' - ')
        .replace(/\u2013/g, ' - ')
        .replace(/\u2018|\u2019/g, "'")
        .replace(/\u201C|\u201D/g, '"')
        .replace(/\u2026/g, '...')
    }

    const sourceInfo = detectSource(url, html)
    if (sourceInfo) {
      parsed.source = sourceInfo.source
      parsed.isEasyApply = sourceInfo.isEasyApply
    }

    return NextResponse.json(parsed)
  },
)
