'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  parseContent,
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

  useEffect(() => {
    if (open) reset(editing ? { ...editing.app } : { ...EMPTY_APPLICATION })
  }, [open, reset, editing])

  const handleSummarize = async () => {
    const description = getValues('roleDescription')
    if (!description?.trim()) return
    setSummarizing(true)
    try {
      const result = await summarizeJob({ description })
      if (!('error' in result) && result.data) {
        setValue('roleDescription', result.data.summary)
      }
    } finally {
      setSummarizing(false)
    }
  }

  const handleFillFromUrl = async () => {
    const url = getValues('applicationUrl')
    if (!url?.trim()) return
    setFillingFromUrl(true)
    try {
      const result = await fillFromUrl({ url })
      if (!('error' in result) && result.data) {
        const {
          jobTitle,
          company,
          roleDescription,
          workArrangement,
          compensation,
          fitScore: score,
          fitRationale: rationale,
        } = result.data
        if (jobTitle) setValue('jobTitle', jobTitle)
        if (company) setValue('company', company)
        if (roleDescription) setValue('roleDescription', roleDescription)
        if (workArrangement) setValue('workArrangement', workArrangement)
        if (compensation) setValue('compensation', compensation)
        if (score) setValue('fitScore', score)
        if (rationale) setValue('fitRationale', rationale)
        enqueueSnackbar('Fields filled from URL.', { variant: 'success' })
      } else {
        enqueueSnackbar(
          'error' in result
            ? String(
                (result.error as { data?: { error?: string } }).data?.error ??
                  'Failed to fill from URL.',
              )
            : 'Failed to fill from URL.',
          { variant: 'error' },
        )
      }
    } finally {
      setFillingFromUrl(false)
    }
  }

  const handleDraftImpression = async () => {
    const app = getValues()
    setDraftingImpression(true)
    try {
      const result = await draftImpression({
        jobTitle: app.jobTitle,
        company: app.company,
        priority: app.priority,
        roleDescription: app.roleDescription,
      })
      if (!('error' in result) && result.data) {
        setValue('impression', result.data.impression)
      }
    } finally {
      setDraftingImpression(false)
    }
  }

  const handleSaveDocument = async (doc: AppDocument) => {
    const { notes, applications } = parseContent(log.content)
    if (editing !== undefined) {
      // Existing app — append directly to it in the log
      const updatedApps = applications.map((a, i) =>
        i === editing.index
          ? { ...a, documents: [...(a.documents ?? []), doc] }
          : a,
      )
      const result = await updateLog({
        ...log,
        content: serializeToContent({ notes, applications: updatedApps }),
      })
      if ('error' in result) throw new Error('Failed to save')
    } else {
      // New app — append to the in-progress form's documents field
      const current = getValues('documents') ?? []
      setValue('documents', [...current, doc])
    }
  }

  const onSubmit = async (app: JobApplicationEntry) => {
    const { notes, applications } = parseContent(log.content)
    // Preserve activities — they're managed by the activities drawer, not this form
    // For editing: merge original documents with any newly queued ones (app.documents)
    const withActivities: JobApplicationEntry = {
      ...app,
      activities: editing ? (editing.app.activities ?? []) : [],
      documents: editing
        ? [...(editing.app.documents ?? []), ...(app.documents ?? [])]
        : (app.documents ?? []),
    }
    const updatedApps =
      editing !== undefined
        ? applications.map((a, i) => (i === editing.index ? withActivities : a))
        : [...applications, withActivities]
    const updated = serializeToContent({ notes, applications: updatedApps })
    const result = await updateLog({ ...log, content: updated })
    if ('error' in result) {
      enqueueSnackbar('Failed to save application.', { variant: 'error' })
    } else {
      enqueueSnackbar(editing ? 'Application updated.' : 'Application added.', {
        variant: 'success',
      })
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle>
        {editing ? 'Edit Job Application' : 'Add Job Application'}
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
                  startIcon={<AutoFixHighIcon fontSize='small' />}
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
                  {...register('company')}
                />
                {fillingFromUrl && (
                  <Skeleton
                    variant='rectangular'
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 1,
                      zIndex: 1,
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
                  {...register('jobTitle')}
                />
                {fillingFromUrl && (
                  <Skeleton
                    variant='rectangular'
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 1,
                      zIndex: 1,
                    }}
                  />
                )}
              </Box>
            </Stack>

            {/* Priority toggle */}
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

            {/* Status */}
            <FormControl fullWidth>
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

            {/* Source */}
            <TextField
              label='How did you find this?'
              fullWidth
              placeholder='LinkedIn Easy Apply, company website, referred by [name]…'
              {...register('source')}
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
                <FormControl fullWidth>
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
                      inset: 0,
                      borderRadius: 1,
                      zIndex: 1,
                    }}
                  />
                )}
              </Box>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <TextField
                  label='Compensation'
                  fullWidth
                  placeholder='$120,000 - $150,000/yr'
                  {...register('compensation')}
                />
                {fillingFromUrl && (
                  <Skeleton
                    variant='rectangular'
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 1,
                      zIndex: 1,
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
                  {...register('roleDescription')}
                />
                {fillingFromUrl && (
                  <Skeleton
                    variant='rectangular'
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 1,
                      zIndex: 1,
                    }}
                  />
                )}
              </Box>
              <Button
                size='small'
                startIcon={<AutoFixHighIcon fontSize='small' />}
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
                placeholder='Excitement level, concerns, how well it fits your goals…'
                {...register('impression')}
              />
              <Button
                size='small'
                startIcon={<AutoFixHighIcon fontSize='small' />}
                onClick={handleDraftImpression}
                disabled={draftingImpression}
                sx={{ mt: 0.5 }}
              >
                {draftingImpression ? 'Drafting…' : 'Draft with AI'}
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
            startIcon={<AutoAwesomeIcon fontSize='small' />}
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
        onSaveDocument={handleSaveDocument}
      />
    </Dialog>
  )
}
