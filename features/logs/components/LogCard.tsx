'use client'

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ModeEditOutlineIcon from '@mui/icons-material/ModeEditOutline'
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
import type { JobApplicationEntry } from '../applicationFormUtils'
import { parseContent, STATUS_LABELS } from '../applicationFormUtils'
import type { DailyLog } from '../types'
import { AddApplicationDialog } from './AddApplicationDialog'

type Priority = JobApplicationEntry['priority']

const PRIORITY_DISPLAY: Record<
  Priority,
  {
    label: string
    emoji: string
    color: 'default' | 'primary' | 'info' | 'warning' | 'error'
  }
> = {
  quick_apply: { label: '⚡ Quick Apply', emoji: '⚡', color: 'default' },
  standard: { label: '📋 Standard', emoji: '📋', color: 'primary' },
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
  const { notes, applications } = parseContent(log.content)
  const [expanded, setExpanded] = useState(false)
  const [addingApp, setAddingApp] = useState(false)
  const [editingApp, setEditingApp] = useState<
    { app: JobApplicationEntry; index: number } | undefined
  >(undefined)

  return (
    <>
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

          <Box mt={notes ? 2 : 1}>
            {/* Collapsible header — always shown so Add button is always accessible */}
            {/* biome-ignore lint/a11y/useSemanticElements: cannot use <button> because it contains nested IconButtons */}
            <Box
              role='button'
              tabIndex={0}
              onClick={() => setExpanded((e) => !e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v)
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                width: '100%',
                py: 0.75,
                px: 0,
                borderTop: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                color: 'inherit',
                userSelect: 'none',
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
                {applications.length === 0
                  ? 'JOB APPLICATIONS'
                  : applications.length === 1
                    ? '1 JOB APPLICATION'
                    : `${applications.length} JOB APPLICATIONS`}
              </Typography>

              {/* Priority chips — collapsed preview */}
              {!expanded && applications.length > 0 && (
                <Box display='flex' gap={0.5} mr={0.5}>
                  {PRIORITY_ORDER.filter((p) =>
                    applications.some((a) => a.priority === p),
                  ).map((p) => {
                    const { emoji, color, label } = PRIORITY_DISPLAY[p]
                    const appsForPriority = applications.filter(
                      (a) => a.priority === p,
                    )
                    return (
                      <Tooltip
                        key={p}
                        title={
                          <Box>
                            <Box
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                                borderBottom: '1px solid rgba(255,255,255,0.2)',
                                pb: 0.5,
                              }}
                            >
                              {label}
                            </Box>
                            {appsForPriority.map((a) => (
                              <div key={`${a.company}-${a.jobTitle}`}>
                                {a.jobTitle} at {a.company}
                              </div>
                            ))}
                          </Box>
                        }
                      >
                        <Chip
                          label={`${emoji} ${appsForPriority.length}`}
                          color={color}
                          size='small'
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </Tooltip>
                    )
                  })}
                </Box>
              )}

              {/* Add application button */}
              <Tooltip title='Add Job Application'>
                <IconButton
                  size='small'
                  onClick={(e) => {
                    e.stopPropagation()
                    setAddingApp(true)
                  }}
                  sx={{ color: 'text.secondary' }}
                >
                  <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

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
            {applications.length > 0 && (
              <Collapse in={expanded} unmountOnExit>
                <Stack spacing={2} pt={1.5}>
                  {applications.map((app) => {
                    const { label, color } = PRIORITY_DISPLAY[app.priority]
                    const meta = [app.source, app.workArrangement]
                      .filter(Boolean)
                      .join(' · ')
                    const statusLabel = STATUS_LABELS[app.status] ?? app.status
                    return (
                      <Box key={`${app.company}-${app.jobTitle}`}>
                        <Box
                          display='flex'
                          alignItems='center'
                          gap={1}
                          flexWrap='wrap'
                        >
                          <Chip label={label} color={color} size='small' />
                          <Chip
                            label={statusLabel}
                            size='small'
                            variant='outlined'
                          />
                          <Typography
                            variant='body2'
                            fontWeight={600}
                            sx={{ flex: 1 }}
                          >
                            {app.jobTitle} at {app.company}
                          </Typography>
                          <Tooltip title='Edit application'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                setEditingApp({
                                  app,
                                  index: applications.indexOf(app),
                                })
                              }
                              sx={{ color: 'text.secondary' }}
                            >
                              <ModeEditOutlineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        {app.applicationUrl && (
                          <Typography
                            variant='caption'
                            display='block'
                            mt={0.5}
                          >
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
                        {(app.recruiter ||
                          app.recruiterLinkedin ||
                          app.recruiterPhone ||
                          app.recruiterEmail) && (
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            display='block'
                            mt={0.5}
                          >
                            {'Recruiter: '}
                            {app.recruiter && app.recruiterLinkedin ? (
                              <a
                                href={app.recruiterLinkedin}
                                target='_blank'
                                rel='noopener noreferrer'
                                style={{ color: 'inherit' }}
                              >
                                {app.recruiter}
                              </a>
                            ) : app.recruiterLinkedin ? (
                              <a
                                href={app.recruiterLinkedin}
                                target='_blank'
                                rel='noopener noreferrer'
                                style={{ color: 'inherit' }}
                              >
                                LinkedIn
                              </a>
                            ) : (
                              app.recruiter && <span>{app.recruiter}</span>
                            )}
                            {app.recruiterPhone && (
                              <>
                                {(app.recruiter || app.recruiterLinkedin) &&
                                  ' · '}
                                <a
                                  href={`tel:${app.recruiterPhone}`}
                                  style={{ color: 'inherit' }}
                                >
                                  {app.recruiterPhone}
                                </a>
                              </>
                            )}
                            {app.recruiterEmail && (
                              <>
                                {(app.recruiter ||
                                  app.recruiterLinkedin ||
                                  app.recruiterPhone) &&
                                  ' · '}
                                <a
                                  href={`mailto:${app.recruiterEmail}`}
                                  style={{ color: 'inherit' }}
                                >
                                  {app.recruiterEmail}
                                </a>
                              </>
                            )}
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
            )}
          </Box>
        </CardContent>
      </Card>

      <AddApplicationDialog
        open={addingApp}
        log={log}
        onClose={() => setAddingApp(false)}
      />
      <AddApplicationDialog
        open={editingApp !== undefined}
        log={log}
        editing={editingApp}
        onClose={() => setEditingApp(undefined)}
      />
    </>
  )
}
