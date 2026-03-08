import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { createSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const { password } = await request.json()

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } })

  // First-time setup: no password set yet
  if (!settings?.passwordHash) {
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 },
      )
    }
    const hash = await bcrypt.hash(password, 12)
    await prisma.settings.upsert({
      where: { id: 'singleton' },
      update: { passwordHash: hash },
      create: { id: 'singleton', passwordHash: hash },
    })
    await createSession()
    return NextResponse.json({ ok: true })
  }

  const valid = await bcrypt.compare(password, settings.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  await createSession()
  return NextResponse.json({ ok: true })
}
