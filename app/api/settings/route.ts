import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ID = 'singleton'

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: ID } })
  return NextResponse.json(
    settings ?? {
      id: ID,
      anthropicApiKey: null,
      careerProfile: null,
      jobSearchPlan: null,
      updatedAt: new Date().toISOString(),
    },
  )
}

export async function PUT(request: Request) {
  const body = await request.json()

  const hasPlan =
    body.planStartDate ||
    body.planEndDate ||
    body.planPhases?.length > 0 ||
    body.planNotes

  const jobSearchPlan = hasPlan
    ? JSON.stringify({
        startDate: body.planStartDate || '',
        endDate: body.planEndDate || '',
        phases: body.planPhases || [],
        notes: body.planNotes || '',
      })
    : null

  const settings = await prisma.settings.upsert({
    where: { id: ID },
    update: {
      anthropicApiKey: body.anthropicApiKey || null,
      careerProfile: body.careerProfile || null,
      jobSearchPlan,
    },
    create: {
      id: ID,
      anthropicApiKey: body.anthropicApiKey || null,
      careerProfile: body.careerProfile || null,
      jobSearchPlan,
    },
  })
  return NextResponse.json(settings)
}
