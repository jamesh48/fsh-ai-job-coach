import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/session'

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (!username || typeof username !== 'string' || username.trim().length < 2) {
    return NextResponse.json(
      { error: 'Username must be at least 2 characters.' },
      { status: 400 },
    )
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters.' },
      { status: 400 },
    )
  }

  const trimmed = username.trim()
  const existing = await prisma.user.findUnique({
    where: { username: trimmed },
  })

  if (!existing) {
    // Registration — open to anyone
    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { username: trimmed, passwordHash: hash },
    })
    await createSession(user.id)
    return NextResponse.json({ ok: true })
  }

  // Login
  const valid = await bcrypt.compare(password, existing.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  await createSession(existing.id)
  return NextResponse.json({ ok: true })
}
