import { NextResponse } from 'next/server'
import { encrypt, isEncrypted, keyHint } from '@/lib/crypto'
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

  if (!settings) {
    return NextResponse.json({
      hasApiKey: false,
      apiKeyHint: null,
      hasAgentSecret: false,
      careerProfile: null,
      resume: null,
      jobSearchPlan: null,
      profileLinks: [],
      updatedAt: new Date().toISOString(),
    })
  }

  // Transparently migrate any legacy plain-text sensitive values to encrypted
  const updates: { anthropicApiKey?: string; agentSecret?: string } = {}
  if (settings.anthropicApiKey && !isEncrypted(settings.anthropicApiKey)) {
    updates.anthropicApiKey = encrypt(settings.anthropicApiKey)
  }
  if (settings.agentSecret && !isEncrypted(settings.agentSecret)) {
    updates.agentSecret = encrypt(settings.agentSecret)
  }
  if (Object.keys(updates).length > 0) {
    await prisma.settings.update({
      where: { userId: session.userId },
      data: updates,
    })
    if (updates.anthropicApiKey)
      settings.anthropicApiKey = updates.anthropicApiKey
    if (updates.agentSecret) settings.agentSecret = updates.agentSecret
  }

  return NextResponse.json({
    id: settings.id,
    hasApiKey: !!settings.anthropicApiKey,
    apiKeyHint: settings.anthropicApiKey
      ? keyHint(settings.anthropicApiKey)
      : null,
    hasAgentSecret: !!settings.agentSecret,
    careerProfile: settings.careerProfile,
    resume: settings.resume,
    jobSearchPlan: settings.jobSearchPlan,
    profileLinks: settings.profileLinks
      ? JSON.parse(settings.profileLinks)
      : [],
    updatedAt: settings.updatedAt,
  })
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

  // Only update sensitive fields if a new value was explicitly provided
  const sensitiveUpdate: { anthropicApiKey?: string; agentSecret?: string } = {}
  if (body.anthropicApiKey?.trim()) {
    sensitiveUpdate.anthropicApiKey = encrypt(body.anthropicApiKey.trim())
  }
  if (body.agentSecret?.trim()) {
    sensitiveUpdate.agentSecret = encrypt(body.agentSecret.trim())
  }

  const settings = await prisma.settings.upsert({
    where: { userId: session.userId },
    update: {
      ...sensitiveUpdate,
      careerProfile: body.careerProfile || null,
      resume: body.resume || null,
      jobSearchPlan: body.jobSearchPlan || null,
      profileLinks: profileLinksJson,
    },
    create: {
      userId: session.userId,
      ...sensitiveUpdate,
      careerProfile: body.careerProfile || null,
      resume: body.resume || null,
      jobSearchPlan: body.jobSearchPlan || null,
      profileLinks: profileLinksJson,
    },
  })

  return NextResponse.json({
    id: settings.id,
    hasApiKey: !!settings.anthropicApiKey,
    apiKeyHint: settings.anthropicApiKey
      ? keyHint(settings.anthropicApiKey)
      : null,
    hasAgentSecret: !!settings.agentSecret,
    careerProfile: settings.careerProfile,
    resume: settings.resume,
    jobSearchPlan: settings.jobSearchPlan,
    profileLinks: settings.profileLinks
      ? JSON.parse(settings.profileLinks)
      : [],
    updatedAt: settings.updatedAt,
  })
}
