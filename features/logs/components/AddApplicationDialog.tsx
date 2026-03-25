'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { MagicWandIcon, SparkleIcon } from '@phosphor-icons/react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import { AiAssistDialog } from '@/features/ai/components/AiAssistDialog'
import {
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

interface Props {
  open: boolean
  log: DailyLog
  editing?: { app: JobApplicationEntry; index: number }
  onClose: () => void
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

export function AddApplicationDialog({ open, log, editing, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [updateLog] = useUpdateLogMutation()
  const [summarizeJob] = useSummarizeJobMutation()
  const [draftImpression] = useDraftImpressionMutation()
  const [fillFromUrl] = useFillFromUrlMutation()
  const [summarizing, setSummarizing] = useState(false)
  const [draftingImpression, setDraftingImpression] = useState(false)
  const [fillingFromUrl, setFillingFromUrl] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)

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
  const formDocuments = useWatch({
    control,
    name: 'documents',
  }) as AppDocument[]

  useEffect(() => {
    if (open) reset(editing ? { ...editing.app } : { ...EMPTY_APPLICATION })
  }, [open, reset, editing])

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
        jobTitle,
        company,
        roleDescription,
        workArrangement,
        compensation,
        fitScore: score,
        fitRationale: rationale,
        source,
        isEasyApply,
      } = await fillFromUrl({ url }).unwrap()
      if (jobTitle) setValue('jobTitle', jobTitle)
      if (company) setValue('company', company)
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

  const handleSaveDocument = async (doc: AppDocument) => {
    const { notes, applications } = parseContent(log.content)
    if (editing !== undefined) {
      // Existing app — persist immediately and keep form state in sync
      const updatedApps = applications.map((a, i) =>
        i === editing.index
          ? { ...a, documents: [...(a.documents ?? []), doc] }
          : a,
      )
      await updateLog({
        ...log,
        content: serializeToContent({ notes, applications: updatedApps }),
      }).unwrap()
      setValue('documents', [...(getValues('documents') ?? []), doc])
    } else {
      // New app — append to the in-progress form's documents field
      const current = getValues('documents') ?? []
      setValue('documents', [...current, doc])
    }
  }

  const handleUpdateDocument = async (doc: AppDocument) => {
    if (editing !== undefined) {
      const { notes, applications } = parseContent(log.content)
      const updatedApps = applications.map((a, i) =>
        i === editing.index
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
      setValue(
        'documents',
        (getValues('documents') ?? []).map((d) => (d.id === doc.id ? doc : d)),
      )
    } else {
      const current = getValues('documents') ?? []
      setValue(
        'documents',
        current.map((d) => (d.id === doc.id ? doc : d)),
      )
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    if (editing !== undefined) {
      const { notes, applications } = parseContent(log.content)
      const updatedApps = applications.map((a, i) =>
        i === editing.index
          ? {
              ...a,
              documents: (a.documents ?? []).filter((d) => d.id !== docId),
            }
          : a,
      )
      await updateLog({
        ...log,
        content: serializeToContent({ notes, applications: updatedApps }),
      }).unwrap()
      setValue(
        'documents',
        (getValues('documents') ?? []).filter((d) => d.id !== docId),
      )
    } else {
      const current = getValues('documents') ?? []
      setValue(
        'documents',
        current.filter((d) => d.id !== docId),
      )
    }
  }

  const onSubmit = async (app: JobApplicationEntry) => {
    const { notes, applications } = parseContent(log.content)
    // Preserve activities — they're managed by the activities drawer, not this form
    // Documents are kept in sync via handleSaveDocument/Update/Delete, so use form state
    const withActivities: JobApplicationEntry = {
      ...app,
      activities: editing ? (editing.app.activities ?? []) : [],
      documents: app.documents ?? [],
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

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return
        onClose()
      }}
      fullWidth
      maxWidth='md'
    >
      <DialogTitle sx={{ pr: 6 }}>
        {editing ? 'Edit Job Application' : 'Add Job Application'}
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
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
                    sx={{ visibility: fillingFromUrl ? 'hidden' : 'visible' }}
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
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color='inherit' variant='outlined'>
            Cancel
          </Button>
          <Button
            color='secondary'
            startIcon={<SparkleIcon size={16} weight='fill' />}
            onClick={() => setAssistOpen(true)}
            sx={{ mr: 'auto' }}
          >
            AI Assist
          </Button>
          <Button type='submit' variant='contained' disableElevation>
            {editing ? 'Update Application' : 'Add Application'}
          </Button>
        </DialogActions>
      </form>

      <AiAssistDialog
        open={assistOpen}
        onClose={() => setAssistOpen(false)}
        jobContext={{
          jobTitle: getValues('jobTitle'),
          company: getValues('company'),
          roleDescription: getValues('roleDescription'),
        }}
        documents={formDocuments ?? []}
        onSaveDocument={handleSaveDocument}
        onUpdateDocument={handleUpdateDocument}
        onDeleteDocument={handleDeleteDocument}
      />
    </Dialog>
  )
}
