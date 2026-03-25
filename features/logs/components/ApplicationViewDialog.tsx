'use client'

import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type {
  ActivityType,
  AppDocument,
  JobApplicationEntry,
} from '../applicationFormUtils'
import {
  ACTIVITY_LABELS,
  FIT_SCORE_DISPLAY,
  formatPhone,
  STATUS_LABELS,
} from '../applicationFormUtils'
import { DocumentViewerDialog } from './DocumentViewerDialog'

const PRIORITY_DISPLAY: Record<
  JobApplicationEntry['priority'],
  {
    label: string
    color: 'default' | 'primary' | 'info' | 'warning' | 'error'
  }
> = {
  quick_apply: { label: '⚡ Quick Apply', color: 'default' },
  standard: { label: '📋 Standard', color: 'primary' },
  strong_interest: { label: '⭐ Strong Interest', color: 'warning' },
  hot_lead: { label: '🔥 Hot Lead', color: 'error' },
}

const ACTIVITY_COLORS: Record<
  ActivityType,
  'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'success' | 'info'
> = {
  recruiter_outreach: 'primary',
  phone_screen: 'info',
  interview: 'secondary',
  follow_up: 'default',
  offer_call: 'success',
  rejection: 'error',
  note: 'default',
}

interface Props {
  open: boolean
  app: JobApplicationEntry | null
  onClose: () => void
  onEdit: () => void
}

export function ApplicationViewDialog({ open, app, onClose, onEdit }: Props) {
  const [viewingDoc, setViewingDoc] = useState<AppDocument | null>(null)

  if (!app) return null

  const { label: priorityLabel, color: priorityColor } =
    PRIORITY_DISPLAY[app.priority]
  const statusLabel = STATUS_LABELS[app.status] ?? app.status

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
        <DialogTitle sx={{ pr: 10 }}>
          {app.jobTitle} at {app.company}
          <Tooltip title='Edit application'>
            <IconButton
              size='small'
              onClick={onEdit}
              sx={{ position: 'absolute', top: 12, right: 44 }}
            >
              <EditOutlinedIcon fontSize='small' />
            </IconButton>
          </Tooltip>
          <IconButton
            size='small'
            onClick={onClose}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2.5}>
            {/* Status chips */}
            <Box display='flex' gap={0.5} flexWrap='wrap'>
              <Chip label={priorityLabel} color={priorityColor} size='small' />
              <Chip label={statusLabel} size='small' variant='outlined' />
              {app.fitScore && (
                <Tooltip title={app.fitRationale || ''} placement='top'>
                  <Chip
                    label={FIT_SCORE_DISPLAY[app.fitScore].label}
                    color={FIT_SCORE_DISPLAY[app.fitScore].color}
                    size='small'
                  />
                </Tooltip>
              )}
            </Box>

            {/* Application URL */}
            {app.applicationUrl && (
              <Box>
                <Typography
                  variant='overline'
                  color='text.secondary'
                  fontWeight={600}
                  display='block'
                >
                  Application URL
                </Typography>
                <Typography variant='body2'>
                  <a
                    href={app.applicationUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    style={{ color: 'inherit' }}
                  >
                    {app.applicationUrl}
                  </a>
                </Typography>
              </Box>
            )}

            {/* Source / Work arrangement / Compensation */}
            {(app.source || app.workArrangement || app.compensation) && (
              <Box display='flex' gap={3} flexWrap='wrap'>
                {app.source && (
                  <Box>
                    <Typography
                      variant='overline'
                      color='text.secondary'
                      fontWeight={600}
                      display='block'
                    >
                      Source
                    </Typography>
                    <Typography variant='body2'>{app.source}</Typography>
                  </Box>
                )}
                {app.workArrangement && (
                  <Box>
                    <Typography
                      variant='overline'
                      color='text.secondary'
                      fontWeight={600}
                      display='block'
                    >
                      Work Arrangement
                    </Typography>
                    <Typography variant='body2'>
                      {app.workArrangement}
                    </Typography>
                  </Box>
                )}
                {app.compensation && (
                  <Box>
                    <Typography
                      variant='overline'
                      color='text.secondary'
                      fontWeight={600}
                      display='block'
                    >
                      Compensation
                    </Typography>
                    <Typography variant='body2'>{app.compensation}</Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Recruiter */}
            {(app.recruiter ||
              app.recruiterLinkedin ||
              app.recruiterPhone ||
              app.recruiterEmail) && (
              <Box>
                <Typography
                  variant='overline'
                  color='text.secondary'
                  fontWeight={600}
                  display='block'
                >
                  Recruiter
                </Typography>
                <Typography variant='body2' color='text.secondary'>
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
                      {(app.recruiter || app.recruiterLinkedin) && ' · '}
                      <a
                        href={`tel:${app.recruiterPhone}`}
                        style={{ color: 'inherit' }}
                      >
                        {formatPhone(app.recruiterPhone)}
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
              </Box>
            )}

            {/* Role description */}
            {app.roleDescription && (
              <Box>
                <Typography
                  variant='overline'
                  color='text.secondary'
                  fontWeight={600}
                  display='block'
                >
                  About the Role
                </Typography>
                <Typography
                  variant='body2'
                  sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
                >
                  {app.roleDescription}
                </Typography>
              </Box>
            )}

            {/* Impression */}
            {app.impression && (
              <Box>
                <Typography
                  variant='overline'
                  color='text.secondary'
                  fontWeight={600}
                  display='block'
                >
                  My Impression
                </Typography>
                <Typography
                  variant='body2'
                  fontStyle='italic'
                  sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
                >
                  {app.impression}
                </Typography>
              </Box>
            )}

            {/* Activities */}
            {app.activities.length > 0 && (
              <Box>
                <Divider sx={{ mb: 1.5 }}>
                  <Typography
                    variant='overline'
                    color='text.secondary'
                    fontWeight={600}
                  >
                    History
                  </Typography>
                </Divider>
                <Stack spacing={0.75}>
                  {[...app.activities]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((act) => (
                      <Box
                        key={act.id}
                        display='flex'
                        alignItems='baseline'
                        gap={1}
                        flexWrap='wrap'
                      >
                        <Chip
                          label={ACTIVITY_LABELS[act.type] ?? act.type}
                          color={ACTIVITY_COLORS[act.type] ?? 'default'}
                          size='small'
                          sx={{ height: 18, fontSize: '0.68rem' }}
                        />
                        <Typography
                          variant='caption'
                          color='text.secondary'
                          sx={{ flexShrink: 0 }}
                        >
                          {act.date.replace(
                            /^(\d{4})-(\d{2})-(\d{2})$/,
                            '$2-$3-$1',
                          )}
                        </Typography>
                        {act.notes && (
                          <Typography variant='caption' color='text.secondary'>
                            {act.notes}
                          </Typography>
                        )}
                      </Box>
                    ))}
                </Stack>
              </Box>
            )}

            {/* Documents */}
            {app.documents && app.documents.length > 0 && (
              <Box>
                <Divider sx={{ mb: 1.5 }}>
                  <Typography
                    variant='overline'
                    color='text.secondary'
                    fontWeight={600}
                  >
                    Documents
                  </Typography>
                </Divider>
                <Stack spacing={0.75}>
                  {app.documents.map((doc) => (
                    <Box
                      key={doc.id}
                      display='flex'
                      alignItems='center'
                      gap={1}
                      onClick={() => setViewingDoc(doc)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        px: 0.5,
                        py: 0.25,
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:hover .doc-icon': { color: 'primary.main' },
                      }}
                    >
                      <ArticleOutlinedIcon
                        className='doc-icon'
                        sx={{
                          fontSize: 14,
                          color: 'text.secondary',
                          flexShrink: 0,
                          transition: 'color 0.15s',
                        }}
                      />
                      <Chip
                        label={doc.label}
                        size='small'
                        sx={{
                          height: 18,
                          fontSize: '0.68rem',
                          pointerEvents: 'none',
                        }}
                      />
                      <Typography variant='caption' color='text.secondary'>
                        {new Date(doc.createdAt).toLocaleDateString('en-US', {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
      </Dialog>

      <DocumentViewerDialog
        open={!!viewingDoc}
        doc={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
    </>
  )
}
