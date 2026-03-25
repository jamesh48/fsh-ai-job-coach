import Anthropic from '@anthropic-ai/sdk'
import type { DocumentBlockParam } from '@anthropic-ai/sdk/resources/messages'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getDecryptedSettings } from '@/lib/settings'
import { withAiRoute } from '@/lib/withAiRoute'

export const POST = withAiRoute(
  'parse-resume',
  async (
    request: Request,
  ): Promise<NextResponse<{ text: string } | { error: string }>> => {
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

    let pdfBase64: string
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: 'No PDF file provided.' },
          { status: 400 },
        )
      }
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: 'File must be a PDF.' },
          { status: 400 },
        )
      }
      const buffer = await file.arrayBuffer()
      pdfBase64 = Buffer.from(buffer).toString('base64')
    } catch {
      return NextResponse.json(
        { error: 'Failed to read uploaded file.' },
        { status: 400 },
      )
    }

    const client = new Anthropic({ apiKey })

    const doc: DocumentBlockParam = {
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: pdfBase64,
      },
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            doc,
            {
              type: 'text',
              text: 'Extract this resume as clean plain text. Preserve the structure and all content faithfully — name, contact info, sections, job titles, companies, dates, bullet points, and skills. Output only the plain text resume with no commentary or preamble.',
            },
          ],
        },
      ],
    })

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    return NextResponse.json({ text })
  },
)
