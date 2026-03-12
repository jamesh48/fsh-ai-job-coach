'use client'

import { useCallback, useEffect, useState } from 'react'

const KEY = 'autoPrint'

export function useAutoPrint() {
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    setEnabledState(localStorage.getItem(KEY) === 'true')
  }, [])

  const setEnabled = useCallback((val: boolean) => {
    setEnabledState(val)
    localStorage.setItem(KEY, String(val))
  }, [])

  return [enabled, setEnabled] as const
}
