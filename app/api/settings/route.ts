import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await prisma.settings.findUnique({
    where: { userId: session.userId },
  })
  return NextResponse.json(
    settings
      ? {
          ...settings,
          profileLinks: settings.profileLinks
            ? JSON.parse(settings.profileLinks)
            : [],
        }
      : {
          anthropicApiKey: null,
          agentSecret: null,
          careerProfile: null,
          resume: null,
          jobSearchPlan: null,
          profileLinks: [],
          updatedAt: new Date().toISOString(),
        },
  )
}

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const profileLinksJson = body.profileLinks?.length
    ? JSON.stringify(body.profileLinks)
    : null
  const settings = await prisma.settings.upsert({
    where: { userId: session.userId },
    update: {
      anthropicApiKey: body.anthropicApiKey || null,
      agentSecret: body.agentSecret || null,
      careerProfile: body.careerProfile || null,
      resume: body.resume || null,
      jobSearchPlan: body.jobSearchPlan || null,
      profileLinks: profileLinksJson,
    },
    create: {
      userId: session.userId,
      anthropicApiKey: body.anthropicApiKey || null,
      agentSecret: body.agentSecret || null,
      careerProfile: body.careerProfile || null,
      resume: body.resume || null,
      jobSearchPlan: body.jobSearchPlan || null,
      profileLinks: profileLinksJson,
    },
  })
  return NextResponse.json({
    ...settings,
    profileLinks: settings.profileLinks
      ? JSON.parse(settings.profileLinks)
      : [],
  })
}
