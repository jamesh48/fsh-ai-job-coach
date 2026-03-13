'use client'

import { useCallback, useEffect, useState } from 'react'

const KEY = 'autoPrint'
const EVENT = 'autoPrintChanged'

export function useAutoPrint() {
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    setEnabledState(localStorage.getItem(KEY) === 'true')

    const handler = () => setEnabledState(localStorage.getItem(KEY) === 'true')
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val)
    localStorage.setItem(KEY, String(val))
    window.dispatchEvent(new Event(EVENT))
  }, [])

  return [enabled, setEnabled] as const
}
