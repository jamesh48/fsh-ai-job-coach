'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

function getWsUrl() {
  if (typeof window === 'undefined') return null
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws/client`
}
const INITIAL_BACKOFF = 2000
const MAX_BACKOFF = 30000

// --- Event types ---

export interface AgentStatusPayload {
  status: string
  version?: string
}

export type EmailClassificationType =
  | 'recruiter_intro'
  | 'interview_request'
  | 'interview_confirmation'
  | 'next_steps'
  | 'availability_request'
  | 'offer'
  | 'rejection'
  | 'other'

export interface EmailClassification {
  relevant: true
  type: EmailClassificationType
  reason: string
}

export interface EmailDetectedPayload {
  id: string
  threadId: string
  subject: string
  from: string
  snippet: string
  date: string
  classification?: EmailClassification
}

export interface CalendarClassification {
  relevant: true
  type: string
  reason: string
}

export interface CalendarEventPayload {
  id: string
  summary: string
  start: string
  end: string
  description?: string
  organizer?: string
  isInterview: boolean
  classification?: CalendarClassification
}

export interface JobCapturedPayload {
  url: string
  title: string
  text: string
  capturedAt: string
}

export interface NewPdfPayload {
  filename: string
  path: string
  base64: string
  size: number
}

export type AgentEvent =
  | { type: 'agent_status'; payload: AgentStatusPayload; timestamp: string }
  | {
      type: 'agent_connected'
      payload: Record<string, never>
      timestamp: string
    }
  | {
      type: 'agent_disconnected'
      payload: Record<string, never>
      timestamp: string
    }
  | { type: 'email_detected'; payload: EmailDetectedPayload; timestamp: string }
  | { type: 'calendar_event'; payload: CalendarEventPayload; timestamp: string }
  | { type: 'job_captured'; payload: JobCapturedPayload; timestamp: string }
  | { type: 'new_pdf'; payload: NewPdfPayload; timestamp: string }

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

// --- Context ---

const MAX_EVENTS = 50

interface AgentSocketContextValue {
  status: ConnectionStatus
  agentConnected: boolean
  lastEvent: AgentEvent | null
  events: AgentEvent[]
  send: (msg: { type: string; payload?: Record<string, unknown> }) => void
  reset: () => void
}

const AgentSocketCtx = createContext<AgentSocketContextValue>({
  status: 'disconnected',
  agentConnected: false,
  lastEvent: null,
  events: [],
  send: () => {},
  reset: () => {},
})

// --- Provider ---

export function AgentSocketProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [agentConnected, setAgentConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<AgentEvent | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(INITIAL_BACKOFF)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  // Use refs for connect/schedule to avoid circular useCallback dependencies
  const scheduleRef = useRef<() => void>(() => {})
  const connectRef = useRef<() => void>(() => {})

  connectRef.current = () => {
    if (unmountedRef.current) return
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    setStatus('connecting')

    const url = getWsUrl()
    if (!url) return

    let ws: WebSocket
    try {
      ws = new WebSocket(url)
    } catch {
      // WebSocket constructor can throw synchronously for invalid URLs
      scheduleRef.current()
      return
    }

    wsRef.current = ws

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close()
        return
      }
      backoffRef.current = INITIAL_BACKOFF
      setStatus('connected')
      ws.send(JSON.stringify({ type: 'ping' }))
    }

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as AgentEvent
        if (event.type === 'agent_connected') setAgentConnected(true)
        if (event.type === 'agent_disconnected') setAgentConnected(false)
        setLastEvent(event)
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS))
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onerror = () => {
      // Intentionally silent — desktop agent may not be running
    }

    ws.onclose = () => {
      if (unmountedRef.current) return
      wsRef.current = null
      setStatus('disconnected')
      setAgentConnected(false)
      scheduleRef.current()
    }
  }

  scheduleRef.current = () => {
    if (unmountedRef.current) return
    timerRef.current = setTimeout(() => {
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF)
      connectRef.current()
    }, backoffRef.current)
  }

  useEffect(() => {
    unmountedRef.current = false
    connectRef.current()
    return () => {
      unmountedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [])

  const send = useCallback(
    (msg: { type: string; payload?: Record<string, unknown> }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(msg))
      }
    },
    [],
  )

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    backoffRef.current = INITIAL_BACKOFF
    setStatus('disconnected')
    setAgentConnected(false)
    setLastEvent(null)
    setEvents([])
    connectRef.current()
  }, [])

  return (
    <AgentSocketCtx.Provider
      value={{ status, agentConnected, lastEvent, events, send, reset }}
    >
      {children}
    </AgentSocketCtx.Provider>
  )
}

// --- Hook ---

export function useAgentSocket() {
  return useContext(AgentSocketCtx)
}
