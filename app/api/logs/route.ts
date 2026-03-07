import { NextResponse } from 'next/server'
import { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const logs = await prisma.dailyLog.findMany({
    orderBy: { date: 'desc' },
  })
  return NextResponse.json(logs)
}

export async function POST(request: Request) {
  const body = await request.json()
  try {
    const log = await prisma.dailyLog.create({
      data: { date: body.date, content: body.content },
    })
    return NextResponse.json(log, { status: 201 })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'An entry already exists for this date.' },
        { status: 409 },
      )
    }
    throw e
  }
}
