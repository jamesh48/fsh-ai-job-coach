import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const printer = require('@thiagoelg/node-printer')
    const printers = printer.getPrinters()
    return NextResponse.json(printers)
  } catch (err) {
    console.info(err)
    return NextResponse.json(
      { error: 'Failed to list printers. Make sure a print spooler is running.' },
      { status: 503 },
    )
  }
}
