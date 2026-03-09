'use client'

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WorkIcon from '@mui/icons-material/Work'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { DailyLog } from '../types'

type Priority = 'quick_apply' | 'standard' | 'strong_interest' | 'hot_lead'

const PRIORITY_DISPLAY: Record<
  Priority,
  {
    label: string
    emoji: string
    color: 'default' | 'info' | 'warning' | 'error'
  }
> = {
  quick_apply: { label: '⚡ Quick Apply', emoji: '⚡', color: 'default' },
  standard: { label: '📋 Standard', emoji: '📋', color: 'info' },
  strong_interest: {
    label: '⭐ Strong Interest',
    emoji: '⭐',
    color: 'warning',
  },
  hot_lead: { label: '🔥 Hot Lead', emoji: '🔥', color: 'error' },
}

const PRIORITY_ORDER: Priority[] = [
  'hot_lead',
  'strong_interest',
  'standard',
  'quick_apply',
]

const PRIORITY_FROM_LABEL: Record<string, Priority> = {
  'Quick Apply (low effort, low expectations)': 'quick_apply',
  Standard: 'standard',
  'Strong Interest (tailored application)': 'strong_interest',
  'Hot Lead (referral or high-priority target)': 'hot_lead',
}

interface ParsedApp {
  jobTitle: string
  company: string
  priority: Priority
  applicationUrl?: string
  source?: string
  workArrangement?: string
  recruiter?: string
  roleDescription?: string
  impression?: string
}

function parseForDisplay(content: string): {
  notes: string
  applications: ParsedApp[]
} {
  const SECTION = '\nJob Applications Submitted Today:\n'
  const idx = content.indexOf(SECTION)
  if (idx === -1) return { notes: content, applications: [] }

  const notes = content.slice(0, idx).trim()
  const appsText = content.slice(idx + SECTION.length).trim()
  const blocks = appsText.split(/\n\n+/)

  const applications = blocks.map((block): ParsedApp => {
    const lines = block.split('\n')
    let header = lines[0].replace(/^\d+\.\s+/, '')
    if (header.endsWith(' (Easy Apply \u2014 low expectations)')) {
      header = header.slice(0, header.lastIndexOf(' (Easy Apply'))
    }
    const atIdx = header.lastIndexOf(' at ')
    const jobTitle = atIdx !== -1 ? header.slice(0, atIdx) : header
    const company = atIdx !== -1 ? header.slice(atIdx + 4) : ''
    const app: ParsedApp = { jobTitle, company, priority: 'quick_apply' }

    const KEY_RE = /^ {3}([A-Z][A-Za-z ]+): (.+)/
    let curKey = ''
    let curVal = ''

    const flush = () => {
      if (!curKey) return
      switch (curKey) {
        case 'Priority':
          app.priority = PRIORITY_FROM_LABEL[curVal] ?? 'quick_apply'
          break
        case 'Application URL':
          app.applicationUrl = curVal
          break
        case 'Source':
          app.source = curVal
          break
        case 'Work arrangement':
          app.workArrangement = curVal
          break
        case 'Recruiter':
          app.recruiter = curVal
          break
        case 'About the role':
          app.roleDescription = curVal
          break
        case 'My impression':
          app.impression = curVal
          break
      }
    }

    for (const line of lines.slice(1)) {
      const m = line.match(KEY_RE)
      if (m) {
        flush()
        curKey = m[1]
        curVal = m[2]
      } else if (curKey && line.startsWith('   '))
        curVal += `\n${line.slice(3)}`
    }
    flush()
    return app
  })

  return { notes, applications }
}

interface Props {
  log: DailyLog
  onEdit: (log: DailyLog) => void
  onDelete: (id: string) => void
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function LogCard({ log, onEdit, onDelete }: Props) {
  const { notes, applications } = parseForDisplay(log.content)
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      variant='outlined'
      sx={{
        borderRadius: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='flex-start'
        >
          <Typography
            variant='overline'
            color='text.secondary'
            fontWeight={600}
            letterSpacing={1}
          >
            {formatDate(log.date)}
          </Typography>
          <Box display='flex' gap={0.5} ml={1} flexShrink={0}>
            <Tooltip title='Edit'>
              <IconButton size='small' onClick={() => onEdit(log)}>
                <EditOutlinedIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Delete'>
              <IconButton
                size='small'
                color='error'
                onClick={() => onDelete(log.id)}
              >
                <DeleteOutlineIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {notes && (
          <Typography
            variant='body2'
            color='text.primary'
            mt={1}
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            {notes}
          </Typography>
        )}

        {applications.length > 0 && (
          <Box mt={notes ? 2 : 1}>
            {/* Collapsible header */}
            <Box
              component='button'
              onClick={() => setExpanded((e) => !e)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                width: '100%',
                py: 0.75,
                px: 0,
                background: 'none',
                border: 'none',
                borderTop: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                color: 'inherit',
                '&:hover .apps-label': { color: 'text.primary' },
              }}
            >
              <WorkIcon
                sx={{ fontSize: 13, color: 'text.secondary', flexShrink: 0 }}
              />
              <Typography
                className='apps-label'
                variant='caption'
                color='text.secondary'
                fontWeight={600}
                sx={{ flex: 1, textAlign: 'left', transition: 'color 0.15s' }}
              >
                {applications.length === 1
                  ? '1 JOB APPLICATION'
                  : `${applications.length} JOB APPLICATIONS`}
              </Typography>
              {/* Collapsed preview: one chip per unique priority level, highest first */}
              {!expanded && (
                <Box display='flex' gap={0.5} mr={0.5}>
                  {PRIORITY_ORDER.filter((p) =>
                    applications.some((a) => a.priority === p),
                  ).map((p) => {
                    const { emoji, color } = PRIORITY_DISPLAY[p]
                    const count = applications.filter(
                      (a) => a.priority === p,
                    ).length
                    return (
                      <Chip
                        key={p}
                        label={`${emoji} ${count}`}
                        color={color}
                        size='small'
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          pointerEvents: 'none',
                        }}
                      />
                    )
                  })}
                </Box>
              )}
              <ExpandMoreIcon
                sx={{
                  fontSize: 18,
                  color: 'text.secondary',
                  flexShrink: 0,
                  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </Box>

            {/* Expanded content */}
            <Collapse in={expanded} unmountOnExit>
              <Stack spacing={2} pt={1.5}>
                {applications.map((app) => {
                  const { label, color } = PRIORITY_DISPLAY[app.priority]
                  const meta = [
                    app.source,
                    app.workArrangement,
                    app.recruiter ? `Recruiter: ${app.recruiter}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <Box key={`${app.company}-${app.jobTitle}`}>
                      <Box
                        display='flex'
                        alignItems='center'
                        gap={1}
                        flexWrap='wrap'
                      >
                        <Chip label={label} color={color} size='small' />
                        <Typography variant='body2' fontWeight={600}>
                          {app.jobTitle} at {app.company}
                        </Typography>
                      </Box>
                      {app.applicationUrl && (
                        <Typography variant='caption' display='block' mt={0.5}>
                          <a
                            href={app.applicationUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{ color: 'inherit' }}
                          >
                            {app.applicationUrl}
                          </a>
                        </Typography>
                      )}
                      {meta && (
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          display='block'
                          mt={0.5}
                        >
                          {meta}
                        </Typography>
                      )}
                      {app.roleDescription && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          mt={0.5}
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {app.roleDescription}
                        </Typography>
                      )}
                      {app.impression && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                          mt={0.5}
                          fontStyle='italic'
                          sx={{ whiteSpace: 'pre-wrap' }}
                        >
                          {app.impression}
                        </Typography>
                      )}
                    </Box>
                  )
                })}
              </Stack>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
