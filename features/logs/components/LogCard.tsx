'use client'

import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ModeEditOutlineIcon from '@mui/icons-material/ModeEditOutline'
import TimelineIcon from '@mui/icons-material/Timeline'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import WorkIcon from '@mui/icons-material/Work'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListSubheader,
  MenuItem,
  MenuList,
  Popover,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { SparkleIcon } from '@phosphor-icons/react'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { AiAssistDialog } from '@/features/ai/components/AiAssistDialog'
import { useUpdateLogMutation } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type {
  ActivityType,
  AppDocument,
  JobApplicationEntry,
} from '../applicationFormUtils'
import {
  ACTIVITY_LABELS,
  FIT_SCORE_DISPLAY,
  formatPhone,
  parseContent,
  STATUS_LABELS,
  serializeToContent,
} from '../applicationFormUtils'
import type { DailyLog } from '../types'
import { AddApplicationDialog } from './AddApplicationDialog'
import { ApplicationActivitiesDrawer } from './ApplicationActivitiesDrawer'
import { ApplicationViewDialog } from './ApplicationViewDialog'

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
  searchTerm?: string
}

function appMatchesTerm(app: JobApplicationEntry, term: string): boolean {
  return [
    app.jobTitle,
    app.company,
    app.source,
    app.workArrangement,
    app.compensation,
    app.roleDescription,
    app.impression,
    app.recruiter,
  ]
    .filter(Boolean)
    .some((v) => v.toLowerCase().includes(term))
}

export function LogCard({ log, onEdit, onDelete, searchTerm }: Props) {
  const { notes, applications: allApplications } = parseContent(log.content)
  const applications = searchTerm
    ? allApplications.filter((a) => appMatchesTerm(a, searchTerm))
    : allApplications
  const [expanded, setExpanded] = useState(false)
  const [addingApp, setAddingApp] = useState(false)
  const [editingApp, setEditingApp] = useState<
    { app: JobApplicationEntry; index: number } | undefined
  >(undefined)
  const [viewingApp, setViewingApp] = useState<
    { app: JobApplicationEntry; index: number } | undefined
  >(undefined)
  const [activitiesAppIndex, setActivitiesAppIndex] = useState<number | null>(
    null,
  )
  const [chipPopover, setChipPopover] = useState<{
    el: HTMLElement
    label: string
    apps: JobApplicationEntry[]
  } | null>(null)
  const [viewingDoc, setViewingDoc] = useState<AppDocument | null>(null)
  const [viewingDocAppIndex, setViewingDocAppIndex] = useState(-1)
  const [docEditContent, setDocEditContent] = useState<string | null>(null)
  const [savingDocEdit, setSavingDocEdit] = useState(false)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<AppDocument | null>(
    null,
  )
  const [assistApp, setAssistApp] = useState<{
    app: JobApplicationEntry
    index: number
  } | null>(null)
  const [updateLog] = useUpdateLogMutation()
  const { enqueueSnackbar } = useSnackbar()

  const handleDeleteDocument = async (
    appOriginalIndex: number,
    docIndex: number,
  ) => {
    const { notes, applications: all } = parseContent(log.content)
    const updatedApps = all.map((a, i) =>
      i === appOriginalIndex
        ? {
            ...a,
            documents: (a.documents ?? []).filter((_, di) => di !== docIndex),
          }
        : a,
    )
    await updateLog({
      ...log,
      content: serializeToContent({ notes, applications: updatedApps }),
    })
  }

  const handleSaveDocumentFromAssist = async (doc: AppDocument) => {
    if (!assistApp) return
    const { notes, applications: all } = parseContent(log.content)
    const updatedApps = all.map((a, i) =>
      i === assistApp.index
        ? { ...a, documents: [...(a.documents ?? []), doc] }
        : a,
    )
    await updateLog({
      ...log,
      content: serializeToContent({ notes, applications: updatedApps }),
    }).unwrap()
  }

  const handleUpdateDocumentFromAssist = async (doc: AppDocument) => {
    if (!assistApp) return
    const { notes, applications: all } = parseContent(log.content)
    const updatedApps = all.map((a, i) =>
      i === assistApp.index
        ? {
            ...a,
            documents: (a.documents ?? []).map((d) =>
              d.id === doc.id ? doc : d,
            ),
          }
        : a,
    )
    await updateLog({
      ...log,
      content: serializeToContent({ notes, applications: updatedApps }),
    }).unwrap()
  }

  const handleDeleteDocumentFromAssist = async (docId: string) => {
    if (!assistApp) return
    const { notes, applications: all } = parseContent(log.content)
    const updatedApps = all.map((a, i) =>
      i === assistApp.index
        ? { ...a, documents: (a.documents ?? []).filter((d) => d.id !== docId) }
        : a,
    )
    await updateLog({
      ...log,
      content: serializeToContent({ notes, applications: updatedApps }),
    }).unwrap()
  }

  function closeDocViewer() {
    setViewingDoc(null)
    setDocEditContent(null)
  }

  async function handleSaveDocEdit() {
    if (viewingDocAppIndex < 0 || !viewingDoc || docEditContent === null) return
    setSavingDocEdit(true)
    try {
      const { notes, applications: all } = parseContent(log.content)
      const updatedDoc = { ...viewingDoc, content: docEditContent }
      const updatedApps = all.map((a, i) =>
        i === viewingDocAppIndex
          ? {
              ...a,
              documents: (a.documents ?? []).map((d) =>
                d.id === viewingDoc.id ? updatedDoc : d,
              ),
            }
          : a,
      )
      await updateLog({
        ...log,
        content: serializeToContent({ notes, applications: updatedApps }),
      }).unwrap()
      setViewingDoc(updatedDoc)
      setDocEditContent(null)
    } catch {
      enqueueSnackbar('Failed to save document.', { variant: 'error' })
    } finally {
      setSavingDocEdit(false)
    }
  }

  async function handleConfirmDeleteDoc() {
    if (viewingDocAppIndex < 0 || !confirmDeleteDoc) return
    try {
      const { notes, applications: all } = parseContent(log.content)
      const updatedApps = all.map((a, i) =>
        i === viewingDocAppIndex
          ? {
              ...a,
              documents: (a.documents ?? []).filter(
                (d) => d.id !== confirmDeleteDoc.id,
              ),
            }
          : a,
      )
      await updateLog({
        ...log,
        content: serializeToContent({ notes, applications: updatedApps }),
      }).unwrap()
      setConfirmDeleteDoc(null)
      setViewingDoc(null)
    } catch {
      enqueueSnackbar('Failed to delete document.', { variant: 'error' })
    }
  }

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
                      <Chip
                        key={p}
                        label={`${emoji} ${appsForPriority.length}`}
                        color={color}
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation()
                          setChipPopover({
                            el: e.currentTarget,
                            label,
                            apps: appsForPriority,
                          })
                        }}
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                        }}
                      />
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
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'success.main' },
                  }}
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
                  {applications.map((app, appIndex) => {
                    const { label, color } = PRIORITY_DISPLAY[app.priority]
                    const meta = [app.source, app.workArrangement]
                      .filter(Boolean)
                      .join(' · ')
                    const statusLabel = STATUS_LABELS[app.status] ?? app.status
                    const originalIndex = allApplications.indexOf(app)
                    return (
                      <Box key={`${app.company}-${app.jobTitle}`}>
                        <Box display='flex' alignItems='center' gap={0.5}>
                          <Typography
                            variant='body2'
                            fontWeight={600}
                            sx={{ flex: 1 }}
                          >
                            {app.jobTitle} at {app.company}
                          </Typography>
                          <Tooltip title='AI Assist'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                setAssistApp({ app, index: originalIndex })
                              }
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'secondary.main' },
                              }}
                            >
                              <SparkleIcon size={15} weight='fill' />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Activities'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                setActivitiesAppIndex(originalIndex)
                              }
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main' },
                              }}
                            >
                              <TimelineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='View application'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                setViewingApp({ app, index: originalIndex })
                              }
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main' },
                              }}
                            >
                              <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title='Edit application'>
                            <IconButton
                              size='small'
                              onClick={() =>
                                setEditingApp({
                                  app,
                                  index: originalIndex,
                                })
                              }
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main' },
                              }}
                            >
                              <ModeEditOutlineIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box display='flex' gap={0.5} flexWrap='wrap' mt={0.5}>
                          <Chip label={label} color={color} size='small' />
                          <Chip
                            label={statusLabel}
                            size='small'
                            variant='outlined'
                          />
                          {app.fitScore && (
                            <Tooltip
                              title={app.fitRationale || ''}
                              placement='top'
                            >
                              <Chip
                                label={FIT_SCORE_DISPLAY[app.fitScore].label}
                                color={FIT_SCORE_DISPLAY[app.fitScore].color}
                                size='small'
                              />
                            </Tooltip>
                          )}
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
                        {app.activities.length > 0 && (
                          <>
                            <Divider sx={{ mt: 1.5 }}>
                              <Typography
                                variant='overline'
                                color='text.secondary'
                                fontWeight={600}
                              >
                                History
                              </Typography>
                            </Divider>
                            <Stack spacing={0.75} mt={1}>
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
                                      label={
                                        ACTIVITY_LABELS[act.type] ?? act.type
                                      }
                                      color={
                                        ACTIVITY_COLORS[act.type] ?? 'default'
                                      }
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
                                      <Typography
                                        variant='caption'
                                        color='text.secondary'
                                      >
                                        {act.notes}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                            </Stack>
                          </>
                        )}
                        {app.documents && app.documents.length > 0 && (
                          <>
                            <Divider sx={{ mt: 1.5 }}>
                              <Typography
                                variant='overline'
                                color='text.secondary'
                                fontWeight={600}
                              >
                                Documents
                              </Typography>
                            </Divider>
                            <Stack spacing={0.75} mt={1}>
                              {app.documents.map((doc, di) => (
                                <Box
                                  key={doc.id}
                                  display='flex'
                                  alignItems='center'
                                  gap={1}
                                  sx={{
                                    borderRadius: 1,
                                    px: 0.5,
                                    '&:hover': { bgcolor: 'action.hover' },
                                    '&:hover .doc-delete': { opacity: 1 },
                                  }}
                                >
                                  <Tooltip title='View document'>
                                    <Box
                                      display='flex'
                                      alignItems='center'
                                      gap={1}
                                      onClick={() => {
                                        setViewingDoc(doc)
                                        setViewingDocAppIndex(appIndex)
                                      }}
                                      sx={{
                                        cursor: 'pointer',
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      <ArticleOutlinedIcon
                                        sx={{
                                          fontSize: 14,
                                          color: 'text.secondary',
                                          flexShrink: 0,
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
                                      <Typography
                                        variant='caption'
                                        color='text.secondary'
                                        noWrap
                                      >
                                        {new Date(
                                          doc.createdAt,
                                        ).toLocaleDateString('en-US', {
                                          month: '2-digit',
                                          day: '2-digit',
                                          year: 'numeric',
                                        })}
                                      </Typography>
                                    </Box>
                                  </Tooltip>
                                  <Tooltip title='Delete document'>
                                    <IconButton
                                      className='doc-delete'
                                      size='small'
                                      color='error'
                                      onClick={() =>
                                        handleDeleteDocument(originalIndex, di)
                                      }
                                      sx={{
                                        opacity: 0,
                                        transition: 'opacity 0.15s',
                                        p: 0.25,
                                      }}
                                    >
                                      <DeleteOutlineIcon
                                        sx={{ fontSize: 14 }}
                                      />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              ))}
                            </Stack>
                          </>
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
        onSwitchToView={
          editingApp
            ? () => {
                const fresh = parseContent(log.content).applications[
                  editingApp.index
                ]
                setEditingApp(undefined)
                if (fresh)
                  setViewingApp({ app: fresh, index: editingApp.index })
              }
            : undefined
        }
      />
      <ApplicationViewDialog
        open={viewingApp !== undefined}
        app={viewingApp?.app ?? null}
        onClose={() => setViewingApp(undefined)}
        onEdit={() => {
          if (!viewingApp) return
          setViewingApp(undefined)
          setEditingApp(viewingApp)
        }}
      />
      {activitiesAppIndex !== null && (
        <ApplicationActivitiesDrawer
          open
          log={log}
          appIndex={activitiesAppIndex}
          onClose={() => setActivitiesAppIndex(null)}
        />
      )}

      <Popover
        open={Boolean(chipPopover)}
        anchorEl={chipPopover?.el}
        onClose={() => setChipPopover(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <MenuList dense sx={{ minWidth: 200 }}>
          <ListSubheader sx={{ lineHeight: '32px' }}>
            {chipPopover?.label}
          </ListSubheader>
          {chipPopover?.apps.map((a) => (
            <MenuItem
              key={`${a.company}-${a.jobTitle}`}
              onClick={() => {
                setEditingApp({ app: a, index: allApplications.indexOf(a) })
                setChipPopover(null)
              }}
            >
              <Typography variant='body2'>
                {a.jobTitle}{' '}
                <Typography
                  component='span'
                  variant='body2'
                  color='text.secondary'
                >
                  at {a.company}
                </Typography>
              </Typography>
            </MenuItem>
          ))}
        </MenuList>
      </Popover>

      <AiAssistDialog
        open={!!assistApp}
        onClose={() => setAssistApp(null)}
        jobContext={
          assistApp
            ? {
                jobTitle: assistApp.app.jobTitle,
                company: assistApp.app.company,
                roleDescription: assistApp.app.roleDescription,
              }
            : undefined
        }
        documents={
          assistApp
            ? (allApplications[assistApp.index]?.documents ?? [])
            : undefined
        }
        onSaveDocument={handleSaveDocumentFromAssist}
        onUpdateDocument={handleUpdateDocumentFromAssist}
        onDeleteDocument={handleDeleteDocumentFromAssist}
      />

      <Dialog
        open={!!viewingDoc}
        onClose={closeDocViewer}
        fullWidth
        maxWidth='md'
        slotProps={{ paper: { sx: { minHeight: '60vh' } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          {viewingDoc?.label}
          {docEditContent === null && (
            <Tooltip title='Edit'>
              <IconButton
                size='small'
                onClick={() => setDocEditContent(viewingDoc?.content ?? '')}
                sx={{ position: 'absolute', top: 12, right: 44 }}
              >
                <EditOutlinedIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size='small'
            onClick={closeDocViewer}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {docEditContent !== null ? (
            <TextField
              multiline
              fullWidth
              minRows={12}
              value={docEditContent}
              onChange={(e) => setDocEditContent(e.target.value)}
              slotProps={{
                input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } },
              }}
            />
          ) : (
            <Box
              onClick={() => setDocEditContent(viewingDoc?.content ?? '')}
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                cursor: 'text',
                '& p': { mt: 0, mb: 1.5 },
                '& p:last-child': { mb: 0 },
                '& h1': { fontSize: '1.25rem', fontWeight: 700, mt: 2, mb: 1 },
                '& h2': {
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  mt: 2,
                  mb: 0.75,
                },
                '& h3': {
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  mt: 1.5,
                  mb: 0.5,
                },
                '& ul, & ol': { pl: 2.5, mt: 0, mb: 1.5 },
                '& li': { mb: 0.5 },
                '& strong': { fontWeight: 700 },
                '& em': { fontStyle: 'italic' },
              }}
            >
              <ReactMarkdown>{viewingDoc?.content ?? ''}</ReactMarkdown>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Typography
            variant='caption'
            color='text.secondary'
            sx={{ mr: 'auto' }}
          >
            {viewingDoc &&
              new Date(viewingDoc.createdAt).toLocaleDateString('en-US', {
                month: '2-digit',
                day: '2-digit',
                year: 'numeric',
              })}
          </Typography>
          {docEditContent === null ? (
            <>
              <Tooltip title='Copy to clipboard'>
                <IconButton
                  size='small'
                  onClick={() => {
                    if (viewingDoc)
                      navigator.clipboard.writeText(viewingDoc.content)
                  }}
                >
                  <ContentCopyIcon fontSize='small' />
                </IconButton>
              </Tooltip>
              <Tooltip title='Delete'>
                <IconButton
                  size='small'
                  onClick={() => setConfirmDeleteDoc(viewingDoc)}
                  sx={{ '&:hover': { color: 'error.main' } }}
                >
                  <DeleteOutlineIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                onClick={() => setDocEditContent(null)}
                color='inherit'
                variant='outlined'
              >
                Cancel
              </Button>
              <Button
                variant='contained'
                disabled={savingDocEdit}
                onClick={handleSaveDocEdit}
              >
                {savingDocEdit ? 'Saving…' : 'Save'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!confirmDeleteDoc}
        onClose={() => setConfirmDeleteDoc(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            "{confirmDeleteDoc?.label}" will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDeleteDoc(null)}
            color='inherit'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleConfirmDeleteDoc}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
