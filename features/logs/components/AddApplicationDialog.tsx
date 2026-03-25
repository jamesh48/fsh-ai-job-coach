'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { MagicWandIcon, SparkleIcon } from '@phosphor-icons/react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import * as yup from 'yup'
import { downloadAsPdf } from '@/features/ai/components/AiAssistDialog'
import {
  useAiAssistMutation,
  useDraftImpressionMutation,
  useFillFromUrlMutation,
  useSummarizeJobMutation,
  useUpdateLogMutation,
} from '@/lib/api'
import type {
  AppDocument,
  FitScore,
  JobApplicationEntry,
} from '../applicationFormUtils'
import {
  DOCUMENT_LABEL_OPTIONS,
  EMPTY_APPLICATION,
  FIT_SCORE_DISPLAY,
  formatPhone,
  parseContent,
  SOURCE_SUGGESTIONS,
  STATUS_LABELS,
  serializeToContent,
  WORK_ARRANGEMENTS,
} from '../applicationFormUtils'
import type { DailyLog } from '../types'
import { DocumentViewerDialog } from './DocumentViewerDialog'

interface Props {
  open: boolean
  log: DailyLog
  editing?: { app: JobApplicationEntry; index: number }
  onClose: () => void
  onSwitchToView?: () => void
}

const schema = yup.object({
  jobTitle: yup.string().required('Job title is required'),
  company: yup.string().required('Company is required'),
  applicationUrl: yup.string().url('Must be a valid URL').default(''),
  source: yup.string().default(''),
  recruiter: yup.string().default(''),
  recruiterLinkedin: yup.string().url('Must be a valid URL').default(''),
  recruiterPhone: yup.string().default(''),
  recruiterEmail: yup.string().email('Must be a valid email').default(''),
  workArrangement: yup.string().default(''),
  compensation: yup.string().default(''),
  roleDescription: yup.string().default(''),
  impression: yup.string().default(''),
  priority: yup
    .string()
    .oneOf(['quick_apply', 'standard', 'strong_interest', 'hot_lead'])
    .default('quick_apply'),
  status: yup
    .string()
    .oneOf(['applied', 'recruiter_screen', 'interviewing', 'offer', 'rejected'])
    .default('applied'),
  fitScore: yup.mixed<FitScore>().nullable().default(null),
  fitRationale: yup.string().default(''),
  activities: yup.array().default([]),
  documents: yup.array().default([]),
})

export function AddApplicationDialog({
  open,
  log,
  editing,
  onClose,
  onSwitchToView,
}: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [updateLog] = useUpdateLogMutation()
  const [summarizeJob] = useSummarizeJobMutation()
  const [draftImpression] = useDraftImpressionMutation()
  const [fillFromUrl] = useFillFromUrlMutation()
  const [aiAssist, { isLoading: aiLoading }] = useAiAssistMutation()

  const [activeTab, setActiveTab] = useState(0)
  const [summarizing, setSummarizing] = useState(false)
  const [draftingImpression, setDraftingImpression] = useState(false)
  const [fillingFromUrl, setFillingFromUrl] = useState(false)
  const [localDocs, setLocalDocs] = useState<AppDocument[]>([])

  // AI Writing Assistant state
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiFilename, setAiFilename] = useState('ai-response')
  const [aiSaveLabel, setAiSaveLabel] = useState('')
  const [aiAutoSave, setAiAutoSave] = useState(true)
  const [aiDeletingId, setAiDeletingId] = useState<string | null>(null)
  const [aiViewingDoc, setAiViewingDoc] = useState<AppDocument | null>(null)
  const [aiConfirmDeleteDoc, setAiConfirmDeleteDoc] =
    useState<AppDocument | null>(null)
  const [addDocOpen, setAddDocOpen] = useState(false)
  const [addDocLabel, setAddDocLabel] = useState('')
  const [addDocContent, setAddDocContent] = useState('')

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<JobApplicationEntry>({
    resolver: yupResolver(schema),
    defaultValues: { ...EMPTY_APPLICATION },
  })

  const applicationUrl = useWatch({ control, name: 'applicationUrl' })
  const fitScore = useWatch({ control, name: 'fitScore' }) as FitScore | null
  const fitRationale = useWatch({ control, name: 'fitRationale' })
  const impressionValue = useWatch({ control, name: 'impression' })
  const jobTitle = useWatch({ control, name: 'jobTitle' })
  const company = useWatch({ control, name: 'company' })

  useEffect(() => {
    if (open) {
      reset(editing ? { ...editing.app } : { ...EMPTY_APPLICATION })
      setLocalDocs(editing?.app.documents ?? [])
      setActiveTab(0)
      setAiPrompt('')
      setAiResponse('')
      setAiFilename('ai-response')
      setAiSaveLabel('')
      setAiAutoSave(true)
      setAiViewingDoc(null)
      setAiConfirmDeleteDoc(null)
    }
  }, [open, reset, editing])

  // ── Details tab handlers ──────────────────────────────────────────────────

  const handleSummarize = async () => {
    const description = getValues('roleDescription')
    if (!description?.trim()) return
    setSummarizing(true)
    try {
      const data = await summarizeJob({ description }).unwrap()
      setValue('roleDescription', data.summary)
    } catch {
      // silently ignore — field stays unchanged
    } finally {
      setSummarizing(false)
    }
  }

  const handleFillFromUrl = async () => {
    const url = getValues('applicationUrl')
    if (!url?.trim()) return
    setFillingFromUrl(true)
    try {
      const {
        jobTitle: jt,
        company: co,
        roleDescription,
        workArrangement,
        compensation,
        fitScore: score,
        fitRationale: rationale,
        source,
        isEasyApply,
      } = await fillFromUrl({ url }).unwrap()
      if (jt) setValue('jobTitle', jt)
      if (co) setValue('company', co)
      if (roleDescription) setValue('roleDescription', roleDescription)
      if (workArrangement) setValue('workArrangement', workArrangement)
      if (compensation) setValue('compensation', compensation)
      if (score) setValue('fitScore', score)
      if (rationale) setValue('fitRationale', rationale)
      if (source) {
        setValue('source', source)
        if (isEasyApply) {
          setValue('priority', 'quick_apply')
          setValue('status', 'applied')
        }
      }
      enqueueSnackbar('Fields filled from URL.', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar(
        (err as { data?: { error?: string } }).data?.error ??
          'Failed to fill from URL.',
        { variant: 'error' },
      )
    } finally {
      setFillingFromUrl(false)
    }
  }

  const handleDraftImpression = async () => {
    const app = getValues()
    setDraftingImpression(true)
    try {
      const data = await draftImpression({
        impression: app.impression,
        jobTitle: app.jobTitle,
        company: app.company,
        roleDescription: app.roleDescription,
      }).unwrap()
      setValue('impression', data.impression)
    } catch {
      // silently ignore — field stays unchanged
    } finally {
      setDraftingImpression(false)
    }
  }

  // ── Document management (shared by Details + AI tabs) ────────────────────

  const handleSaveDocument = (doc: AppDocument) => {
    setLocalDocs((prev) => [...prev, doc])
  }

  const handleUpdateDocument = (doc: AppDocument) => {
    setLocalDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)))
  }

  const handleDeleteDocument = (docId: string) => {
    setLocalDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  // ── AI Writing Assistant handlers ─────────────────────────────────────────

  function handleAiConfirmDelete() {
    if (!aiConfirmDeleteDoc) return
    setAiDeletingId(aiConfirmDeleteDoc.id)
    setAiConfirmDeleteDoc(null)
    handleDeleteDocument(aiConfirmDeleteDoc.id)
    setAiDeletingId(null)
  }

  function handleAiSaveDoc() {
    if (!aiSaveLabel.trim()) return
    handleSaveDocument({
      id: crypto.randomUUID(),
      label: aiSaveLabel.trim(),
      content: aiResponse,
      createdAt: new Date().toISOString(),
    })
    enqueueSnackbar('Saved to application.', { variant: 'success' })
    setAiSaveLabel('')
  }

  function aiFilenameToLabel(name: string): string {
    return name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  async function handleAiAsk() {
    if (!aiPrompt.trim()) return
    try {
      const data = await aiAssist({
        prompt: aiPrompt,
        jobContext: {
          jobTitle,
          company,
          roleDescription: getValues('roleDescription'),
        },
      }).unwrap()
      setAiResponse(data.response)
      setAiFilename(data.filename)
      if (aiAutoSave) {
        handleSaveDocument({
          id: crypto.randomUUID(),
          label: aiFilenameToLabel(data.filename),
          content: data.response,
          createdAt: new Date().toISOString(),
        })
        enqueueSnackbar('Saved to application.', { variant: 'success' })
      }
    } catch (err) {
      enqueueSnackbar(
        (err as { data?: { error?: string } }).data?.error ??
          'Failed to get a response.',
        { variant: 'error' },
      )
    }
  }

  // ── Form submit ───────────────────────────────────────────────────────────

  const onSubmit = async (app: JobApplicationEntry) => {
    const { notes, applications } = parseContent(log.content)
    const withActivities: JobApplicationEntry = {
      ...app,
      activities: editing ? (editing.app.activities ?? []) : [],
      documents: localDocs,
    }
    const updatedApps =
      editing !== undefined
        ? applications.map((a, i) => (i === editing.index ? withActivities : a))
        : [...applications, withActivities]
    const updated = serializeToContent({ notes, applications: updatedApps })
    try {
      await updateLog({ ...log, content: updated }).unwrap()
      enqueueSnackbar(editing ? 'Application updated.' : 'Application added.', {
        variant: 'success',
      })
      onClose()
    } catch {
      enqueueSnackbar('Failed to save application.', { variant: 'error' })
    }
  }

  const hasJobContext = !!(jobTitle && company)

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return
        onClose()
      }}
      fullWidth
      maxWidth='md'
      slotProps={{ paper: { sx: { height: '90vh' } } }}
    >
      <DialogTitle sx={{ pr: onSwitchToView ? 10 : 6 }}>
        {editing ? 'Edit Job Application' : 'Add Job Application'}
        {onSwitchToView && (
          <Tooltip title='View application'>
            <IconButton
              size='small'
              onClick={onSwitchToView}
              sx={{ position: 'absolute', top: 12, right: 44 }}
            >
              <VisibilityOutlinedIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        )}
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label='Details' />
          <Tab
            label='AI Writing Assistant'
            icon={<SparkleIcon size={14} weight='fill' />}
            iconPosition='start'
            sx={{ gap: 0.5 }}
          />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {/* ── Details Tab ── */}
          <div role='tabpanel' hidden={activeTab !== 0}>
            <Stack spacing={2}>
              {/* Application URL */}
              <Box>
                <TextField
                  label='Application URL'
                  fullWidth
                  placeholder='https://company.com/jobs/…'
                  type='url'
                  error={!!errors.applicationUrl}
                  helperText={errors.applicationUrl?.message}
                  {...register('applicationUrl')}
                />
                <Box
                  display='flex'
                  alignItems='center'
                  gap={1}
                  flexWrap='wrap'
                  mt={0.5}
                >
                  <Button
                    size='small'
                    startIcon={<MagicWandIcon size={16} weight='fill' />}
                    onClick={handleFillFromUrl}
                    disabled={fillingFromUrl || !applicationUrl?.trim()}
                  >
                    {fillingFromUrl ? 'Filling…' : 'Fill from URL'}
                  </Button>
                  {fitScore && (
                    <Tooltip title={fitRationale || ''} placement='right'>
                      <Chip
                        label={FIT_SCORE_DISPLAY[fitScore].label}
                        color={FIT_SCORE_DISPLAY[fitScore].color}
                        size='small'
                      />
                    </Tooltip>
                  )}
                  {fitScore && fitRationale && (
                    <Typography variant='caption' color='text.secondary'>
                      {fitRationale}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Company + job title */}
              <Stack direction='row' spacing={2}>
                <Box sx={{ position: 'relative', flex: 1 }}>
                  <TextField
                    label='Company'
                    fullWidth
                    required
                    error={!!errors.company}
                    helperText={errors.company?.message}
                    sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
                    {...register('company')}
                  />
                  {fillingFromUrl && (
                    <Skeleton
                      variant='rectangular'
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ position: 'relative', flex: 1 }}>
                  <TextField
                    label='Job Title'
                    fullWidth
                    required
                    error={!!errors.jobTitle}
                    helperText={errors.jobTitle?.message}
                    sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
                    {...register('jobTitle')}
                  />
                  {fillingFromUrl && (
                    <Skeleton
                      variant='rectangular'
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
              </Stack>

              {/* Priority toggle */}
              <Box sx={{ position: 'relative' }}>
                <Controller
                  name='priority'
                  control={control}
                  render={({ field }) => (
                    <ToggleButtonGroup
                      exclusive
                      fullWidth
                      size='small'
                      value={field.value}
                      onChange={(_, val) => val && field.onChange(val)}
                      sx={{
                        visibility: fillingFromUrl ? 'hidden' : 'visible',
                      }}
                    >
                      <ToggleButton value='quick_apply'>
                        ⚡ Quick Apply
                      </ToggleButton>
                      <ToggleButton value='standard'>📋 Standard</ToggleButton>
                      <ToggleButton value='strong_interest'>
                        ⭐ Strong Interest
                      </ToggleButton>
                      <ToggleButton value='hot_lead'>🔥 Hot Lead</ToggleButton>
                    </ToggleButtonGroup>
                  )}
                />
                {fillingFromUrl && (
                  <Skeleton
                    variant='rectangular'
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: 1,
                    }}
                  />
                )}
              </Box>

              {/* Status */}
              <Box sx={{ position: 'relative' }}>
                <FormControl
                  fullWidth
                  sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
                >
                  <InputLabel>Status</InputLabel>
                  <Controller
                    name='status'
                    control={control}
                    render={({ field }) => (
                      <Select label='Status' {...field}>
                        {(
                          Object.entries(STATUS_LABELS) as [
                            JobApplicationEntry['status'],
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <MenuItem key={value} value={value}>
                            {label}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  />
                </FormControl>
                {fillingFromUrl && (
                  <Skeleton
                    variant='rectangular'
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: 1,
                    }}
                  />
                )}
              </Box>

              {/* Source */}
              <Controller
                name='source'
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    freeSolo
                    options={SOURCE_SUGGESTIONS}
                    value={field.value}
                    onChange={(_, val) => field.onChange(val ?? '')}
                    onInputChange={(_, val) => field.onChange(val)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label='How did you find this?'
                        fullWidth
                        placeholder='LinkedIn Easy Apply, company website, referred by [name]…'
                      />
                    )}
                  />
                )}
              />

              {/* Recruiter */}
              <Stack direction='row' spacing={2}>
                <TextField
                  label='Recruiter Name'
                  fullWidth
                  placeholder='Jane Smith'
                  {...register('recruiter')}
                />
                <TextField
                  label='Recruiter LinkedIn'
                  fullWidth
                  type='url'
                  placeholder='https://linkedin.com/in/…'
                  error={!!errors.recruiterLinkedin}
                  helperText={errors.recruiterLinkedin?.message}
                  {...register('recruiterLinkedin')}
                />
              </Stack>
              <Stack direction='row' spacing={2}>
                <TextField
                  label='Recruiter Phone'
                  fullWidth
                  type='tel'
                  placeholder='+1 (555) 000-0000'
                  {...register('recruiterPhone')}
                  onChange={(e) =>
                    setValue('recruiterPhone', formatPhone(e.target.value))
                  }
                />
                <TextField
                  label='Recruiter Email'
                  fullWidth
                  type='email'
                  placeholder='recruiter@company.com'
                  error={!!errors.recruiterEmail}
                  helperText={errors.recruiterEmail?.message}
                  {...register('recruiterEmail')}
                />
              </Stack>

              {/* Work arrangement + Compensation */}
              <Stack direction='row' spacing={2}>
                <Box sx={{ position: 'relative', flex: 1 }}>
                  <FormControl
                    fullWidth
                    sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
                  >
                    <InputLabel>Work Arrangement</InputLabel>
                    <Controller
                      name='workArrangement'
                      control={control}
                      render={({ field }) => (
                        <Select label='Work Arrangement' {...field}>
                          <MenuItem value=''>Not specified</MenuItem>
                          {WORK_ARRANGEMENTS.map((w) => (
                            <MenuItem key={w} value={w}>
                              {w}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                    />
                  </FormControl>
                  {fillingFromUrl && (
                    <Skeleton
                      variant='rectangular'
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ position: 'relative', flex: 1 }}>
                  <TextField
                    label='Compensation'
                    fullWidth
                    placeholder='$120,000 - $150,000/yr'
                    sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
                    {...register('compensation')}
                  />
                  {fillingFromUrl && (
                    <Skeleton
                      variant='rectangular'
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
              </Stack>

              {/* Role description */}
              <Box>
                <Box sx={{ position: 'relative' }}>
                  <TextField
                    label='About the Role'
                    multiline
                    rows={6}
                    fullWidth
                    placeholder='Paste the full job description or write a brief summary…'
                    sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
                    {...register('roleDescription')}
                  />
                  {fillingFromUrl && (
                    <Skeleton
                      variant='rectangular'
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        borderRadius: 1,
                      }}
                    />
                  )}
                </Box>
                <Button
                  size='small'
                  startIcon={<MagicWandIcon size={16} weight='fill' />}
                  onClick={handleSummarize}
                  disabled={summarizing}
                  sx={{ mt: 0.5 }}
                >
                  {summarizing ? 'Summarizing…' : 'Summarize with AI'}
                </Button>
              </Box>

              {/* Impression */}
              <Box>
                <TextField
                  label='My Impression'
                  multiline
                  rows={4}
                  fullWidth
                  placeholder='Jot down your raw thoughts — excitement, concerns, fit — then use "Clean up with AI" to polish them…'
                  {...register('impression')}
                />
                <Button
                  size='small'
                  startIcon={<MagicWandIcon size={16} weight='fill' />}
                  onClick={handleDraftImpression}
                  disabled={draftingImpression || !impressionValue?.trim()}
                  sx={{ mt: 0.5 }}
                >
                  {draftingImpression ? 'Cleaning up…' : 'Clean up with AI'}
                </Button>
              </Box>
            </Stack>
          </div>

          {/* ── AI Writing Assistant Tab ── */}
          <div role='tabpanel' hidden={activeTab !== 1}>
            {hasJobContext && (
              <Box sx={{ mb: 2 }}>
                <Chip
                  size='small'
                  label={`${jobTitle} @ ${company}`}
                  color='secondary'
                  variant='outlined'
                />
              </Box>
            )}

            <TextField
              label='What do you need help with?'
              multiline
              rows={6}
              fullWidth
              placeholder={
                hasJobContext
                  ? 'e.g. Write a cover letter for this role, give me feedback on my answer to "Tell me about yourself", draft a follow-up email…'
                  : 'Fill in the company and job title on the Details tab first, then ask away…'
              }
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAiAsk()
              }}
              slotProps={{ inputLabel: { shrink: true } }}
            />

            <Box
              display='flex'
              alignItems='center'
              gap={1}
              flexWrap='wrap'
              mt={1.5}
            >
              <Button
                variant='contained'
                color='secondary'
                startIcon={
                  aiLoading ? (
                    <CircularProgress size={14} color='inherit' />
                  ) : (
                    <MagicWandIcon size={16} weight='fill' />
                  )
                }
                onClick={handleAiAsk}
                disabled={aiLoading || !aiPrompt.trim()}
              >
                {aiLoading ? 'Thinking…' : 'Ask Claude'}
              </Button>
              <FormControlLabel
                control={
                  <Switch
                    size='small'
                    checked={aiAutoSave}
                    onChange={(e) => setAiAutoSave(e.target.checked)}
                  />
                }
                label={
                  <Typography variant='caption'>Auto-save response</Typography>
                }
              />
            </Box>

            {aiLoading && (
              <Box
                sx={{
                  mt: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 2,
                  pt: 1,
                  pb: 2,
                }}
              >
                <Skeleton width='35%' height={16} sx={{ mb: 1.5 }} />
                <Skeleton height={14} />
                <Skeleton height={14} />
                <Skeleton width='90%' height={14} sx={{ mb: 1.5 }} />
                <Skeleton height={14} />
                <Skeleton width='80%' height={14} sx={{ mb: 1.5 }} />
                <Skeleton height={14} />
                <Skeleton width='75%' height={14} />
              </Box>
            )}

            {!aiLoading && aiResponse && (
              <Box
                sx={{
                  mt: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  px: 2,
                  pt: 1,
                  pb: 2,
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant='caption' color='text.secondary'>
                    Response
                  </Typography>
                  <Box display='flex' gap={0.5}>
                    <Tooltip title={`Download as PDF (${aiFilename}.pdf)`}>
                      <IconButton
                        size='small'
                        onClick={() => downloadAsPdf(aiResponse, aiFilename)}
                      >
                        <DownloadIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title='Copy to clipboard'>
                      <IconButton
                        size='small'
                        onClick={() => {
                          navigator.clipboard.writeText(aiResponse)
                          enqueueSnackbar('Copied to clipboard.', {
                            variant: 'success',
                          })
                        }}
                      >
                        <ContentCopyIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box
                  onCopy={(e) => {
                    const selection = window.getSelection()
                    if (!selection || selection.isCollapsed) return
                    e.preventDefault()
                    e.clipboardData.setData('text/plain', selection.toString())
                  }}
                  sx={{
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    '& p': { mt: 0, mb: 1.5 },
                    '& p:last-child': { mb: 0 },
                    '& h1': {
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      mt: 2,
                      mb: 1,
                    },
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
                    '& code': {
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      bgcolor: 'action.hover',
                      px: 0.5,
                      borderRadius: 0.5,
                    },
                    '& blockquote': {
                      borderLeft: '3px solid',
                      borderColor: 'divider',
                      pl: 1.5,
                      ml: 0,
                      color: 'text.secondary',
                    },
                  }}
                >
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </Box>

                {!aiAutoSave && (
                  <Stack direction='row' spacing={1} alignItems='center' mt={2}>
                    <Autocomplete
                      freeSolo
                      size='small'
                      options={DOCUMENT_LABEL_OPTIONS}
                      value={aiSaveLabel}
                      onInputChange={(_, val) => setAiSaveLabel(val)}
                      sx={{ width: 220 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label='Save as…'
                          placeholder='Cover Letter'
                        />
                      )}
                    />
                    <Button
                      size='small'
                      variant='outlined'
                      startIcon={<BookmarkAddIcon fontSize='small' />}
                      disabled={!aiSaveLabel.trim()}
                      onClick={handleAiSaveDoc}
                    >
                      Save to Application
                    </Button>
                  </Stack>
                )}
              </Box>
            )}

            <Divider sx={{ mt: 3, mb: 1.5 }} />
            <Box display='flex' alignItems='center' gap={0.5} sx={{ mb: 1 }}>
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ flex: 1 }}
              >
                Saved Documents
              </Typography>
              <Tooltip title='Add document'>
                <IconButton
                  size='small'
                  onClick={() => {
                    setAddDocLabel('')
                    setAddDocContent('')
                    setAddDocOpen(true)
                  }}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'success.main' },
                  }}
                >
                  <AddCircleOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
            {!localDocs.length ? (
              <Typography variant='caption' color='text.secondary'>
                No documents saved yet.
              </Typography>
            ) : (
              <Stack spacing={0.5}>
                {localDocs.map((doc) => (
                  <Box
                    key={doc.id}
                    display='flex'
                    alignItems='center'
                    gap={1}
                    sx={{
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ArticleOutlinedIcon
                      sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant='body2'
                      sx={{
                        flex: 1,
                        cursor: 'pointer',
                        '&:hover': { color: 'primary.main' },
                      }}
                      onClick={() => setAiViewingDoc(doc)}
                    >
                      {doc.label}
                    </Typography>
                    <Tooltip title='Delete'>
                      <IconButton
                        size='small'
                        disabled={aiDeletingId === doc.id}
                        onClick={() => setAiConfirmDeleteDoc(doc)}
                        sx={{ '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))}
              </Stack>
            )}
          </div>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color='inherit' variant='outlined'>
            Cancel
          </Button>
          <Button type='submit' variant='contained' disableElevation>
            {editing ? 'Update Application' : 'Add Application'}
          </Button>
        </DialogActions>
      </form>

      <DocumentViewerDialog
        open={!!aiViewingDoc}
        doc={aiViewingDoc}
        onClose={() => setAiViewingDoc(null)}
        onUpdate={handleUpdateDocument}
      />

      {/* AI delete confirm */}
      <Dialog
        open={!!aiConfirmDeleteDoc}
        onClose={() => setAiConfirmDeleteDoc(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            "{aiConfirmDeleteDoc?.label}" will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAiConfirmDeleteDoc(null)}
            color='inherit'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleAiConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add custom document */}
      <Dialog
        open={addDocOpen}
        onClose={() => setAddDocOpen(false)}
        fullWidth
        maxWidth='md'
        slotProps={{ paper: { sx: { minHeight: '60vh' } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          Add Document
          <IconButton
            size='small'
            onClick={() => setAddDocOpen(false)}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Autocomplete
              freeSolo
              options={DOCUMENT_LABEL_OPTIONS}
              value={addDocLabel}
              onInputChange={(_, val) => setAddDocLabel(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label='Label'
                  placeholder='Cover Letter, Thank You Note…'
                  autoFocus
                />
              )}
            />
            <TextField
              label='Content'
              multiline
              rows={16}
              fullWidth
              placeholder='Write your document here…'
              value={addDocContent}
              onChange={(e) => setAddDocContent(e.target.value)}
              slotProps={{
                input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setAddDocOpen(false)}
            color='inherit'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            disabled={!addDocLabel.trim() || !addDocContent.trim()}
            onClick={() => {
              handleSaveDocument({
                id: crypto.randomUUID(),
                label: addDocLabel.trim(),
                content: addDocContent,
                createdAt: new Date().toISOString(),
              })
              enqueueSnackbar('Document saved.', { variant: 'success' })
              setAddDocOpen(false)
            }}
          >
            Save Document
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  )
}
