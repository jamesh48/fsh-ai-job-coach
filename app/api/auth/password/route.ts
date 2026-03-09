import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request) {
  const { currentPassword, newPassword } = await request.json()

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 },
    )
  }

  const settings = await prisma.settings.findUnique({
    where: { id: 'singleton' },
  })

  if (settings?.passwordHash) {
    const valid = await bcrypt.compare(
      currentPassword ?? '',
      settings.passwordHash,
    )
    if (!valid) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 401 },
      )
    }
  }

  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.settings.upsert({
    where: { id: 'singleton' },
    update: { passwordHash: hash },
    create: { id: 'singleton', passwordHash: hash },
  })

  return NextResponse.json({ ok: true })
}
