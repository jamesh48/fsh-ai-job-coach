import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { currentPassword, newPassword } = await request.json()

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json(
      { error: 'New password must be at least 8 characters.' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const valid = await bcrypt.compare(currentPassword ?? '', user.passwordHash)
  if (!valid) {
    return NextResponse.json(
      { error: 'Current password is incorrect.' },
      { status: 401 },
    )
  }

  const hash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: hash },
  })

  return NextResponse.json({ ok: true })
}
