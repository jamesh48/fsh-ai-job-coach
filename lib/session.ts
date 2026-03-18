import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

const SESSION_COOKIE = 'session'
// 30 days
const EXPIRES_IN = 60 * 60 * 24 * 30

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET environment variable is not set')
  return new TextEncoder().encode(secret)
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ authenticated: true, userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(getSecret())

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: EXPIRES_IN,
    path: '/',
  })
}

export async function getSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    const userId = payload.userId
    if (typeof userId !== 'string') return null
    return { userId }
  } catch {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
