'use client'

import { useCallback, useState } from 'react'

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^#+\s/gm, '')
    .replace(/^[-*]\s/gm, '• ')
    .trim()
}

function formatDateUS(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${month}-${day}-${year}`
}

function buildEscPosData(recommendation: string): Uint8Array {
  const ESC = 0x1b
  const GS = 0x1d
  const encode = (s: string) => new TextEncoder().encode(s)
  const bytes = (arr: number[]) => new Uint8Array(arr)

  const parts: Uint8Array[] = [
    bytes([ESC, 0x40]),                         // init
    bytes([ESC, 0x64, 2]),                       // feed 2
    bytes([ESC, 0x61, 0x01]),                    // center
    encode('--------------------------------\n'),
    bytes([ESC, 0x45, 0x01]),                    // bold on
    encode('JOB SEARCH COACH\n'),
    bytes([ESC, 0x45, 0x00]),                    // bold off
    encode(`${formatDateUS(new Date().toISOString().slice(0, 10))}\n`),
    encode('--------------------------------\n'),
    encode('\n'),
    bytes([ESC, 0x61, 0x00]),                    // left align
    encode(`${stripMarkdown(recommendation)}\n`),
    encode('\n'),
    bytes([ESC, 0x61, 0x01]),                    // center
    encode('--------------------------------\n'),
    bytes([ESC, 0x64, 5]),                       // feed 5
    bytes([GS, 0x56, 0x41, 0x05]),              // partial cut
  ]

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
      for (const iface of device.configuration!.interfaces) {
        const bulkOut = iface.alternates[0]?.endpoints.find(
          (e) => e.direction === 'out' && e.type === 'bulk',
        )
        if (bulkOut) {
          interfaceNumber = iface.interfaceNumber
          endpointNumber = bulkOut.endpointNumber
          break
        }
      }

      if (endpointNumber === -1) throw new Error('No bulk OUT endpoint found on this device.')

      await device.claimInterface(interfaceNumber)
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
    async (recommendation: string) => {
      if (!printer) return
      setPrinting(true)
      setError(null)
      try {
        const data = buildEscPosData(recommendation)
        await printer.device.transferOut(printer.endpointNumber, data.buffer as ArrayBuffer)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Print failed.')
      } finally {
        setPrinting(false)
      }
    },
    [printer],
  )

  return { printer, connecting, printing, error, isSupported, connect, disconnect, print }
}
