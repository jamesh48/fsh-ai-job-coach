'use client'

import { useEffect, useRef } from 'react'
import { useAgentSocket } from './agentSocketContext'

export function AgentNotificationHandler() {
  const { lastEvent } = useAgentSocket()
  const shownRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted')
      return

    if (lastEvent?.type === 'email_detected') {
      const p = lastEvent.payload
      if (shownRef.current.has(p.id)) return
      shownRef.current.add(p.id)
      const classType = p.classification?.type?.replace(/_/g, ' ')
      new Notification(p.subject, {
        body: classType ? `${p.from} · ${classType}` : p.from,
        icon: '/favicon.ico',
        tag: p.id,
      })
    }

    if (lastEvent?.type === 'calendar_event') {
      const p = lastEvent.payload
      const key = p.id ?? p.summary
      if (!key || shownRef.current.has(key)) return
      shownRef.current.add(key)
      const classType = p.classification?.type?.replace(/_/g, ' ')
      const startStr = p.start ? ` · ${new Date(p.start).toLocaleString()}` : ''
      new Notification(p.summary, {
        body: classType
          ? `${classType}${startStr}`
          : startStr.slice(3) || 'Calendar event',
        icon: '/favicon.ico',
        tag: key,
      })
    }
  }, [lastEvent])

  return null
}
