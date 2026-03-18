import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ID = 'singleton'

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: ID } })
  return NextResponse.json(
    settings
      ? {
          ...settings,
          profileLinks: settings.profileLinks
            ? JSON.parse(settings.profileLinks)
            : [],
        }
      : {
          id: ID,
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
  const body = await request.json()
  const profileLinksJson = body.profileLinks?.length
    ? JSON.stringify(body.profileLinks)
    : null
  const settings = await prisma.settings.upsert({
    where: { id: ID },
    update: {
      anthropicApiKey: body.anthropicApiKey || null,
      agentSecret: body.agentSecret || null,
      careerProfile: body.careerProfile || null,
      resume: body.resume || null,
      jobSearchPlan: body.jobSearchPlan || null,
      profileLinks: profileLinksJson,
    },
    create: {
      id: ID,
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
