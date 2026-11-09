'use client'

import { Box, Skeleton } from '@mui/material'

// Each section: a heading line followed by body lines of varying width
const LINES = [
  { id: 'h1', width: '45%', heading: true },
  { id: 'a1', width: '100%' },
  { id: 'a2', width: '100%' },
  { id: 'a3', width: '85%', gap: true },
  { id: 'h2', width: '30%', heading: true },
  { id: 'b1', width: '100%' },
  { id: 'b2', width: '90%' },
  { id: 'b3', width: '100%', gap: true },
  { id: 'h3', width: '30%', heading: true },
  { id: 'c1', width: '100%' },
  { id: 'c2', width: '75%' },
  { id: 'c3', width: '100%', gap: true },
  { id: 'h4', width: '35%', heading: true },
  { id: 'd1', width: '100%' },
  { id: 'd2', width: '80%' },
  { id: 'd3', width: '100%' },
]

/**
 * Placeholder shaped like a multi-line TextField full of sectioned text.
 * Shown in place of a field while an AI action fills it.
 */
export function TextFieldSkeleton({ minHeight = 352 }: { minHeight?: number }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        px: 1.75,
        py: 1.5,
        minHeight,
      }}
    >
      {LINES.map((line) => (
        <Skeleton
          key={line.id}
          width={line.width}
          height={line.heading ? 14 : 12}
          sx={line.heading ? { mb: 1 } : line.gap ? { mb: 1.5 } : undefined}
        />
      ))}
    </Box>
  )
}
