'use client'

import dayjs from 'dayjs'
import { useCallback, useState } from 'react'

const ESC = 0x1b
const GS = 0x1d
const encode = (s: string) => new TextEncoder().encode(s)
const bytes = (arr: number[]) => new Uint8Array(arr)
const BOLD_ON = bytes([ESC, 0x45, 0x01])
const BOLD_OFF = bytes([ESC, 0x45, 0x00])
const ALIGN_LEFT = bytes([ESC, 0x61, 0x00])
const ALIGN_CENTER = bytes([ESC, 0x61, 0x01])
const SEP = '--------------------------------'

// Render a line with inline **bold** markers as ESC/POS bold sequences
function renderInline(text: string): Uint8Array[] {
  const result: Uint8Array[] = []
  const segments = text.split(/(\*\*.*?\*\*)/)
  for (const seg of segments) {
    if (seg.startsWith('**') && seg.endsWith('**')) {
      result.push(BOLD_ON, encode(seg.slice(2, -2)), BOLD_OFF)
    } else if (seg) {
      result.push(encode(seg))
    }
  }
  return result
}

function buildEscPosData(recommendation: string, date?: string): Uint8Array {
  const parts: Uint8Array[] = [
    bytes([ESC, 0x40]), // init
    bytes([ESC, 0x64, 2]), // feed 2
    ALIGN_CENTER,
    encode(`${SEP}\n`),
    BOLD_ON,
    encode('JOB SEARCH COACH\n'),
    BOLD_OFF,
    encode(`${date ?? dayjs().format('MM-DD-YYYY hh:mm:ss')}\n`),
    encode(`${SEP}\n\n`),
    ALIGN_LEFT,
  ]

  for (const raw of recommendation.split('\n')) {
    const line = raw.trimEnd()

    if (!line.trim()) {
      parts.push(encode('\n'))
      continue
    }

    // H1: # heading — centered bold
    if (line.match(/^#{1}\s/)) {
      parts.push(
        ALIGN_CENTER,
        BOLD_ON,
        encode(`${line.replace(/^#+\s/, '')}\n`),
        BOLD_OFF,
        ALIGN_LEFT,
      )
      continue
    }

    // H2+: ## heading — left bold
    if (line.match(/^#{2,}\s/)) {
      parts.push(BOLD_ON, encode(`${line.replace(/^#+\s/, '')}\n`), BOLD_OFF)
      continue
    }

    // Bullet: - item or * item
    if (line.match(/^\s*[-*]\s/)) {
      parts.push(
        encode('• '),
        ...renderInline(line.replace(/^\s*[-*]\s/, '')),
        encode('\n'),
      )
      continue
    }

    // Numbered list: 1. item
    if (line.match(/^\s*\d+\.\s/)) {
      const m = line.match(/^\s*(\d+\.\s)(.*)$/)
      if (m)
        parts.push(
          BOLD_ON,
          encode(m[1]),
          BOLD_OFF,
          ...renderInline(m[2]),
          encode('\n'),
        )
      continue
    }

    // Regular text with inline bold
    parts.push(...renderInline(line), encode('\n'))
  }

  parts.push(
    encode('\n'),
    ALIGN_CENTER,
    encode(`${SEP}\n`),
    bytes([ESC, 0x64, 5]), // feed 5
    bytes([GS, 0x56, 0x41, 0x05]), // partial cut
  )

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0)
  const result = new Uint8Array(new ArrayBuffer(totalLength))
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

type PrinterState = {
  device: USBDevice
  endpointNumber: number
}

export function useWebUsbPrinter() {
  const [printer, setPrinter] = useState<PrinterState | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported = typeof navigator !== 'undefined' && 'usb' in navigator

  const connect = useCallback(async () => {
    setConnecting(true)
    setError(null)
    try {
      const device = await navigator.usb.requestDevice({ filters: [] })
      await device.open()
      if (device.configuration === null) await device.selectConfiguration(1)

      // Find the first interface with a bulk OUT endpoint
      let endpointNumber = -1
      let interfaceNumber = -1
      for (const iface of device.configuration?.interfaces ?? []) {
        const bulkOut = iface.alternates[0]?.endpoints.find(
          (e) => e.direction === 'out' && e.type === 'bulk',
        )
        if (bulkOut) {
          interfaceNumber = iface.interfaceNumber
          endpointNumber = bulkOut.endpointNumber
          break
        }
      }

      if (endpointNumber === -1)
        throw new Error('No bulk OUT endpoint found on this device.')

      try {
        await device.claimInterface(interfaceNumber)
      } catch {
        throw new Error(
          'Could not claim the printer interface. If this printer is installed as a system printer, ' +
            'remove it from your OS print settings and try again — WebUSB requires exclusive access to the USB interface.',
        )
      }
      setPrinter({ device, endpointNumber })
    } catch (e) {
      if (e instanceof Error && e.name !== 'NotFoundError') {
        setError(e.message)
      }
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (printer) {
      try {
        await printer.device.close()
      } catch {}
      setPrinter(null)
    }
  }, [printer])

  const print = useCallback(
    async (recommendation: string, date?: string) => {
      if (!printer) return
      setPrinting(true)
      setError(null)
      try {
        const data = buildEscPosData(recommendation, date)
        await printer.device.transferOut(
          printer.endpointNumber,
          data.buffer as ArrayBuffer,
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Print failed.')
      } finally {
        setPrinting(false)
      }
    },
    [printer],
  )

  return {
    printer,
    connecting,
    printing,
    error,
    isSupported,
    connect,
    disconnect,
    print,
  }
}
