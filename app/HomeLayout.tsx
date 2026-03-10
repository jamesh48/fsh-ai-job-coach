'use client'

import { useState } from 'react'
import { AiRecommendation } from '@/features/ai'
import { LogList } from '@/features/logs'

const PANEL_EXPANDED_HEIGHT = '50vh'
const PANEL_COLLAPSED_HEIGHT = '49px'

export function HomeLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        <LogList />
      </div>
      <div
        style={{
          height: collapsed ? PANEL_COLLAPSED_HEIGHT : PANEL_EXPANDED_HEIGHT,
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          transition: 'height 0.3s ease',
          overflow: 'hidden',
        }}
      >
        <AiRecommendation
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>
    </div>
  )
}
