'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import EditNoteIcon from '@mui/icons-material/EditNote'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WorkIcon from '@mui/icons-material/Work'
import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { MagicWandIcon } from '@phosphor-icons/react'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import * as yup from 'yup'
import {
  useDraftImpressionMutation,
  useFillFromUrlMutation,
  useSummarizeJobMutation,
  useSummarizeNotesMutation,
} from '@/lib/api'
import type { FitScore, JobApplicationEntry } from '../applicationFormUtils'
import {
  EMPTY_APPLICATION,
  parseContent,
  STATUS_LABELS,
  serializeToContent,
  WORK_ARRANGEMENTS,
} from '../applicationFormUtils'
import type { DailyLog, LogFormValues } from '../types'

interface InternalFormValues {
  date: string
  notes: string
  applications: JobApplicationEntry[]
}

interface Props {
  open: boolean
  editing: DailyLog | null
  existingDates: string[]
  onSubmit: (values: LogFormValues) => void
  onClose: () => void
}

export function LogForm({
  open,
  editing,
  existingDates,
  onSubmit,
  onClose,
}: Props) {
  const schema = useMemo(
    () =>
      yup.object({
        date: yup
          .string()
          .required('Date is required')
          .test(
            'unique-date',
            'An entry already exists for this date.',
            (value) => {
              const takenDates = editing
                ? existingDates.filter((d) => d !== editing.date)
                : existingDates
              return !takenDates.includes(value ?? '')
            },
          ),
        notes: yup
          .string()
          .default('')
          .test(
            'notes-or-apps',
            'Describe your activities or add at least one job application.',
            function (value) {
              const { applications } = this.parent as InternalFormValues
              return !!(value?.trim() || applications?.length > 0)
            },
          ),
        applications: yup
          .array()
          .of(
            yup.object({
              jobTitle: yup.string().required('Job title is required'),
              company: yup.string().required('Company is required'),
              applicationUrl: yup
                .string()
                .url('Must be a valid URL')
                .default(''),
              source: yup.string().default(''),
              recruiter: yup.string().default(''),
              recruiterLinkedin: yup
                .string()
                .url('Must be a valid URL')
                .default(''),
              recruiterPhone: yup.string().default(''),
              recruiterEmail: yup
                .string()
                .email('Must be a valid email')
                .default(''),
              workArrangement: yup.string().default(''),
              compensation: yup.string().default(''),
              roleDescription: yup.string().default(''),
              impression: yup.string().default(''),
              priority: yup
                .string()
                .oneOf([
                  'quick_apply',
                  'standard',
                  'strong_interest',
                  'hot_lead',
                ])
                .default('quick_apply'),
              status: yup
                .string()
                .oneOf([
                  'applied',
                  'recruiter_screen',
                  'interviewing',
                  'offer',
                  'rejected',
                ])
                .default('applied'),
              fitScore: yup.mixed<FitScore>().nullable().default(null),
              fitRationale: yup.string().default(''),
              activities: yup.array().default([]),
              documents: yup.array().default([]),
            }),
          )
          .default([]),
      }),
    [existingDates, editing],
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<InternalFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { date: '', notes: '', applications: [] },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'applications',
  })

  const [tab, setTab] = useState(0)
  const [expandedApps, setExpandedApps] = useState<Set<number>>(new Set())

  const toggleApp = (index: number) =>
    setExpandedApps((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })

  const appendApp = () => {
    const index = fields.length
    append({ ...EMPTY_APPLICATION })
    setExpandedApps((prev) => new Set(prev).add(index))
  }

  const removeApp = (index: number) => {
    remove(index)
    setExpandedApps((prev) => {
      const next = new Set<number>()
      for (const i of prev) {
        if (i < index) next.add(i)
        else if (i > index) next.add(i - 1)
      }
      return next
    })
  }
  const [summarizingIndex, setSummarizingIndex] = useState<number | null>(null)
  const [impressionIndex, setImpressionIndex] = useState<number | null>(null)
  const [fillingFromUrlIndex, setFillingFromUrlIndex] = useState<number | null>(
    null,
  )
  const [summarizingNotes, setSummarizingNotes] = useState(false)
  const [summarizeJob] = useSummarizeJobMutation()
  const [draftImpression] = useDraftImpressionMutation()
  const [summarizeNotes] = useSummarizeNotesMutation()
  const [fillFromUrl] = useFillFromUrlMutation()

  const watchedApps = useWatch({ control, name: 'applications' })

  const handleSummarize = async (index: number) => {
    const description = getValues(`applications.${index}.roleDescription`)
    if (!description?.trim()) return
    setSummarizingIndex(index)
    try {
      const result = await summarizeJob({ description })
      if (!('error' in result) && result.data) {
        setValue(`applications.${index}.roleDescription`, result.data.summary)
      }
    } finally {
      setSummarizingIndex(null)
    }
  }

  const handleDraftImpression = async (index: number) => {
    const app = getValues(`applications.${index}`)
    setImpressionIndex(index)
    try {
      const result = await draftImpression({
        jobTitle: app.jobTitle,
        company: app.company,
        priority: app.priority,
        roleDescription: app.roleDescription,
      })
      if (!('error' in result) && result.data) {
        setValue(`applications.${index}.impression`, result.data.impression)
      }
    } finally {
      setImpressionIndex(null)
    }
  }

  const handleFillFromUrl = async (index: number) => {
    const url = getValues(`applications.${index}.applicationUrl`)
    if (!url?.trim()) return
    setFillingFromUrlIndex(index)
    try {
      const result = await fillFromUrl({ url })
      if (!('error' in result) && result.data) {
        const {
          jobTitle,
          company,
          roleDescription,
          workArrangement,
          compensation,
        } = result.data
        if (jobTitle) setValue(`applications.${index}.jobTitle`, jobTitle)
        if (company) setValue(`applications.${index}.company`, company)
        if (roleDescription)
          setValue(`applications.${index}.roleDescription`, roleDescription)
        if (workArrangement)
          setValue(`applications.${index}.workArrangement`, workArrangement)
        if (compensation)
          setValue(`applications.${index}.compensation`, compensation)
      }
    } finally {
      setFillingFromUrlIndex(null)
    }
  }

  const handleSummarizeNotes = async () => {
    const notes = getValues('notes')
    if (!notes?.trim()) return
    setSummarizingNotes(true)
    try {
      const result = await summarizeNotes({ notes })
      if (!('error' in result) && result.data) {
        setValue('notes', result.data.summary)
      }
    } finally {
      setSummarizingNotes(false)
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: open triggers reset when dialog reopens
  useEffect(() => {
    if (editing) {
      const { notes, applications } = parseContent(editing.content)
      reset({ date: editing.date, notes, applications })
      setExpandedApps(new Set(applications.map((_, i) => i)))
    } else {
      reset({ date: dayjs().format('YYYY-MM-DD'), notes: '', applications: [] })
      setExpandedApps(new Set())
    }
    setTab(0)
  }, [editing, open, reset])

  const handleFormSubmit = (values: InternalFormValues) => {
    onSubmit({ date: values.date, content: serializeToContent(values) })
  }

  const handleFormError = (formErrors: typeof errors) => {
    const appErrors = formErrors.applications

    if (!appErrors) return
    const firstErrorIndex = (appErrors as Record<number, unknown>[]).findIndex(
      (e) => e,
    )
    if (firstErrorIndex === -1) return

    // Switch to Applications tab and expand the errored card
    setTab(1)
    setExpandedApps((prev) => new Set(prev).add(firstErrorIndex))

    // Focus the first invalid field in that application
    const appFieldErrors = appErrors[firstErrorIndex] as
      | Record<string, unknown>
      | undefined
    const focusableFields = [
      'company',
      'jobTitle',
      'applicationUrl',
      'recruiterLinkedin',
      'recruiterEmail',
    ] as const
    const firstField = focusableFields.find((f) => appFieldErrors?.[f])
    if (firstField) {
      // Delay to let Collapse animation begin before focusing
      setTimeout(
        () => setFocus(`applications.${firstErrorIndex}.${firstField}`),
        150,
      )
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='md'
      PaperProps={{ sx: { minHeight: '80vh' } }}
    >
      <DialogTitle sx={{ pb: 0, pr: 6 }}>
        {editing ? 'Edit Entry' : 'New Entry'}
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab
            label='Notes'
            icon={<EditNoteIcon fontSize='small' />}
            iconPosition='start'
            sx={{ minHeight: 48 }}
          />
          <Tab
            label={
              fields.length > 0
                ? `Applications (${fields.length})`
                : 'Applications'
            }
            icon={<WorkIcon fontSize='small' />}
            iconPosition='start'
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      <form
        onSubmit={handleSubmit(handleFormSubmit, handleFormError)}
        noValidate
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        }}
      >
        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            p: 0,
            overflow: 'hidden',
          }}
        >
          {/* Notes tab */}
          <Box
            sx={{
              display: tab === 0 ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              px: 3,
              pt: 2,
              pb: 2,
              gap: 2,
              overflowY: 'auto',
            }}
          >
            <TextField
              label='Date'
              type='date'
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.date}
              helperText={errors.date?.message}
              {...register('date')}
            />
            <Box>
              <TextField
                label='Notes'
                multiline
                rows={12}
                fullWidth
                placeholder='What did you work on today? Networking, research, interviews…'
                error={!!errors.notes}
                helperText={errors.notes?.message}
                {...register('notes')}
              />
              <Button
                size='small'
                startIcon={<MagicWandIcon size={16} weight='fill' />}
                onClick={handleSummarizeNotes}
                disabled={summarizingNotes}
                sx={{ mt: 0.5 }}
              >
                {summarizingNotes ? 'Summarizing…' : 'Clean up with AI'}
              </Button>
            </Box>
          </Box>

          {/* Applications tab */}
          <Box
            sx={{
              display: tab === 1 ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
              px: 3,
              pt: 2,
              pb: 2,
              gap: 2,
              overflowY: 'auto',
            }}
          >
            {fields.map((field, index) => {
              const isExpanded = expandedApps.has(index)
              const company = field.company
              const jobTitle = field.jobTitle
              const priorityEmoji =
                field.priority === 'hot_lead'
                  ? '🔥'
                  : field.priority === 'strong_interest'
                    ? '⭐'
                    : field.priority === 'standard'
                      ? '📋'
                      : '⚡'
              return (
                <Paper key={field.id} variant='outlined' sx={{ p: 2 }}>
                  {/* biome-ignore lint/a11y/useSemanticElements: contains nested IconButtons */}
                  <Box
                    role='button'
                    tabIndex={0}
                    onClick={() => toggleApp(index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleApp(index)
                    }}
                    display='flex'
                    alignItems='center'
                    gap={1}
                    sx={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      mb: isExpanded ? 2 : 0,
                    }}
                  >
                    <ExpandMoreIcon
                      sx={{
                        fontSize: 18,
                        color: 'text.secondary',
                        flexShrink: 0,
                        transform: isExpanded
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                      }}
                    />
                    {company || jobTitle ? (
                      <>
                        <Typography variant='subtitle2' sx={{ flex: 1 }} noWrap>
                          {priorityEmoji} {jobTitle || 'Untitled'}
                          {company ? ` at ${company}` : ''}
                        </Typography>
                        {!isExpanded && (
                          <Chip
                            label={
                              STATUS_LABELS[
                                field.status as keyof typeof STATUS_LABELS
                              ] ?? field.status
                            }
                            size='small'
                            variant='outlined'
                            sx={{ flexShrink: 0 }}
                          />
                        )}
                      </>
                    ) : (
                      <Typography
                        variant='subtitle2'
                        color='text.secondary'
                        sx={{ flex: 1 }}
                      >
                        Application #{index + 1}
                      </Typography>
                    )}
                    <Tooltip title='Remove application'>
                      <IconButton
                        size='small'
                        onClick={(e) => {
                          e.stopPropagation()
                          removeApp(index)
                        }}
                        color='error'
                      >
                        <DeleteIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Collapse in={isExpanded}>
                    <Stack spacing={2}>
                      {/* Application URL */}
                      <Box>
                        <TextField
                          label='Application URL'
                          fullWidth
                          placeholder='https://company.com/jobs/…'
                          type='url'
                          error={!!errors.applications?.[index]?.applicationUrl}
                          helperText={
                            errors.applications?.[index]?.applicationUrl
                              ?.message
                          }
                          {...register(`applications.${index}.applicationUrl`)}
                        />
                        <Button
                          size='small'
                          startIcon={<MagicWandIcon size={16} weight='fill' />}
                          onClick={() => handleFillFromUrl(index)}
                          disabled={
                            fillingFromUrlIndex === index ||
                            !watchedApps?.[index]?.applicationUrl?.trim()
                          }
                          sx={{ mt: 0.5 }}
                        >
                          {fillingFromUrlIndex === index
                            ? 'Filling…'
                            : 'Fill from URL'}
                        </Button>
                      </Box>

                      {/* Company + job title */}
                      <Stack direction='row' spacing={2}>
                        <TextField
                          label='Company'
                          fullWidth
                          required
                          error={!!errors.applications?.[index]?.company}
                          helperText={
                            errors.applications?.[index]?.company?.message
                          }
                          {...register(`applications.${index}.company`)}
                        />
                        <TextField
                          label='Job Title'
                          fullWidth
                          required
                          error={!!errors.applications?.[index]?.jobTitle}
                          helperText={
                            errors.applications?.[index]?.jobTitle?.message
                          }
                          {...register(`applications.${index}.jobTitle`)}
                        />
                      </Stack>

                      {/* Priority toggle */}
                      <Controller
                        name={`applications.${index}.priority`}
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
                            <ToggleButton value='standard'>
                              📋 Standard
                            </ToggleButton>
                            <ToggleButton value='strong_interest'>
                              ⭐ Strong Interest
                            </ToggleButton>
                            <ToggleButton value='hot_lead'>
                              🔥 Hot Lead
                            </ToggleButton>
                          </ToggleButtonGroup>
                        )}
                      />

                      {/* Status */}
                      <FormControl fullWidth>
                        <InputLabel>Status</InputLabel>
                        <Controller
                          name={`applications.${index}.status`}
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
                        {...register(`applications.${index}.source`)}
                      />

                      {/* Recruiter */}
                      <Stack direction='row' spacing={2}>
                        <TextField
                          label='Recruiter Name'
                          fullWidth
                          placeholder='Jane Smith'
                          {...register(`applications.${index}.recruiter`)}
                        />
                        <TextField
                          label='Recruiter LinkedIn'
                          fullWidth
                          type='url'
                          placeholder='https://linkedin.com/in/…'
                          error={
                            !!errors.applications?.[index]?.recruiterLinkedin
                          }
                          helperText={
                            errors.applications?.[index]?.recruiterLinkedin
                              ?.message
                          }
                          {...register(
                            `applications.${index}.recruiterLinkedin`,
                          )}
                        />
                      </Stack>
                      <Stack direction='row' spacing={2}>
                        <TextField
                          label='Recruiter Phone'
                          fullWidth
                          type='tel'
                          placeholder='+1 (555) 000-0000'
                          {...register(`applications.${index}.recruiterPhone`)}
                        />
                        <TextField
                          label='Recruiter Email'
                          fullWidth
                          type='email'
                          placeholder='recruiter@company.com'
                          error={!!errors.applications?.[index]?.recruiterEmail}
                          helperText={
                            errors.applications?.[index]?.recruiterEmail
                              ?.message
                          }
                          {...register(`applications.${index}.recruiterEmail`)}
                        />
                      </Stack>
                      <Stack direction='row' spacing={2}>
                        <FormControl fullWidth>
                          <InputLabel>Work Arrangement</InputLabel>
                          <Controller
                            name={`applications.${index}.workArrangement`}
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
                          {errors.applications?.[index]?.workArrangement && (
                            <FormHelperText error>
                              {
                                errors.applications[index].workArrangement
                                  ?.message
                              }
                            </FormHelperText>
                          )}
                        </FormControl>
                        <TextField
                          label='Compensation'
                          fullWidth
                          placeholder='$120,000 - $150,000/yr'
                          {...register(`applications.${index}.compensation`)}
                        />
                      </Stack>

                      {/* Role description */}
                      <Box>
                        <TextField
                          label='About the Role'
                          multiline
                          rows={6}
                          fullWidth
                          placeholder='Paste the full job description or write a brief summary…'
                          {...register(`applications.${index}.roleDescription`)}
                        />
                        <Button
                          size='small'
                          startIcon={<MagicWandIcon size={16} weight='fill' />}
                          onClick={() => handleSummarize(index)}
                          disabled={summarizingIndex === index}
                          sx={{ mt: 0.5 }}
                        >
                          {summarizingIndex === index
                            ? 'Summarizing…'
                            : 'Summarize with AI'}
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
                          {...register(`applications.${index}.impression`)}
                        />
                        <Button
                          size='small'
                          startIcon={<MagicWandIcon size={16} weight='fill' />}
                          onClick={() => handleDraftImpression(index)}
                          disabled={impressionIndex === index}
                          sx={{ mt: 0.5 }}
                        >
                          {impressionIndex === index
                            ? 'Drafting…'
                            : 'Draft with AI'}
                        </Button>
                      </Box>
                    </Stack>
                  </Collapse>
                </Paper>
              )
            })}

            <Button
              variant='outlined'
              startIcon={<WorkIcon />}
              onClick={appendApp}
              sx={{ alignSelf: 'flex-start' }}
            >
              {fields.length === 0
                ? 'Log a Job Application'
                : 'Add Another Application'}
            </Button>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant='outlined' color='inherit'>
            Cancel
          </Button>
          <Button type='submit' variant='contained' disableElevation>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
