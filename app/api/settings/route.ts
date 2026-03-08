import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

const ID = 'singleton'

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: ID } })
  return NextResponse.json(
    settings ?? { id: ID, anthropicApiKey: null, updatedAt: new Date().toISOString() },
  )
}

export async function PUT(request: Request) {
  const body = await request.json()
  const settings = await prisma.settings.upsert({
    where: { id: ID },
    update: { anthropicApiKey: body.anthropicApiKey || null },
    create: { id: ID, anthropicApiKey: body.anthropicApiKey || null },
  })
  return NextResponse.json(settings)
}
