'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import DeleteIcon from '@mui/icons-material/Delete'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WorkIcon from '@mui/icons-material/Work'
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useDraftImpressionMutation, useSummarizeJobMutation } from '@/lib/api'
import type { JobApplicationEntry } from '../applicationFormUtils'
import {
  EMPTY_APPLICATION,
  parseContent,
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
    formState: { errors },
  } = useForm<InternalFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { date: '', notes: '', applications: [] },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'applications',
  })

  const [appsExpanded, setAppsExpanded] = useState(true)
  const [summarizingIndex, setSummarizingIndex] = useState<number | null>(null)
  const [impressionIndex, setImpressionIndex] = useState<number | null>(null)
  const [summarizeJob] = useSummarizeJobMutation()
  const [draftImpression] = useDraftImpressionMutation()

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: open triggers reset when dialog reopens
  useEffect(() => {
    if (editing) {
      const { notes, applications } = parseContent(editing.content)
      reset({ date: editing.date, notes, applications })
    } else {
      reset({ date: dayjs().format('YYYY-MM-DD'), notes: '', applications: [] })
    }
  }, [editing, open, reset])

  const handleFormSubmit = (values: InternalFormValues) => {
    onSubmit({ date: values.date, content: serializeToContent(values) })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='md'
      PaperProps={{ sx: { minHeight: '80vh' } }}
    >
      <DialogTitle>{editing ? 'Edit Entry' : 'New Entry'}</DialogTitle>
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
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
          <Box sx={{ px: 3, pt: 1, pb: 2, flexShrink: 0 }}>
            <Stack spacing={3}>
              <TextField
                label='Date'
                type='date'
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!errors.date}
                helperText={errors.date?.message}
                {...register('date')}
              />
              <TextField
                label='Notes'
                multiline
                rows={5}
                placeholder='What did you work on today? Networking, research, interviews…'
                error={!!errors.notes}
                helperText={errors.notes?.message}
                {...register('notes')}
              />
            </Stack>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, pb: 2 }}>
            <Stack spacing={2}>
              {fields.length > 0 && (
                <>
                  <Box
                    display='flex'
                    alignItems='center'
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setAppsExpanded((v) => !v)}
                  >
                    <Divider sx={{ flex: 1 }} />
                    <Box display='flex' alignItems='center' gap={0.5} px={1}>
                      <Typography
                        variant='caption'
                        color='text.secondary'
                        fontWeight={600}
                      >
                        JOB APPLICATIONS ({fields.length})
                      </Typography>
                      {appsExpanded ? (
                        <ExpandLessIcon
                          sx={{ fontSize: 16, color: 'text.secondary' }}
                        />
                      ) : (
                        <ExpandMoreIcon
                          sx={{ fontSize: 16, color: 'text.secondary' }}
                        />
                      )}
                    </Box>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                  <Collapse in={appsExpanded}>
                    <Stack spacing={2}>
                      {fields.map((field, index) => (
                        <Paper key={field.id} variant='outlined' sx={{ p: 2 }}>
                          <Box
                            display='flex'
                            justifyContent='space-between'
                            alignItems='center'
                            mb={2}
                          >
                            <Typography
                              variant='subtitle2'
                              color='text.secondary'
                            >
                              Application #{index + 1}
                            </Typography>
                            <Tooltip title='Remove application'>
                              <IconButton
                                size='small'
                                onClick={() => remove(index)}
                                color='error'
                              >
                                <DeleteIcon fontSize='small' />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Stack spacing={2}>
                            {/* Job title + company */}
                            <Stack direction='row' spacing={2}>
                              <TextField
                                label='Job Title'
                                fullWidth
                                required
                                error={!!errors.applications?.[index]?.jobTitle}
                                helperText={
                                  errors.applications?.[index]?.jobTitle
                                    ?.message
                                }
                                {...register(`applications.${index}.jobTitle`)}
                              />
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
                            </Stack>

                            {/* Application URL */}
                            <TextField
                              label='Application URL'
                              fullWidth
                              placeholder='https://company.com/jobs/…'
                              type='url'
                              error={
                                !!errors.applications?.[index]?.applicationUrl
                              }
                              helperText={
                                errors.applications?.[index]?.applicationUrl
                                  ?.message
                              }
                              {...register(
                                `applications.${index}.applicationUrl`,
                              )}
                            />

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
                                  onChange={(_, val) =>
                                    val && field.onChange(val)
                                  }
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
                                  !!errors.applications?.[index]
                                    ?.recruiterLinkedin
                                }
                                helperText={
                                  errors.applications?.[index]
                                    ?.recruiterLinkedin?.message
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
                                {...register(
                                  `applications.${index}.recruiterPhone`,
                                )}
                              />
                              <TextField
                                label='Recruiter Email'
                                fullWidth
                                type='email'
                                placeholder='recruiter@company.com'
                                error={
                                  !!errors.applications?.[index]?.recruiterEmail
                                }
                                helperText={
                                  errors.applications?.[index]?.recruiterEmail
                                    ?.message
                                }
                                {...register(
                                  `applications.${index}.recruiterEmail`,
                                )}
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
                                      <MenuItem value=''>
                                        Not specified
                                      </MenuItem>
                                      {WORK_ARRANGEMENTS.map((w) => (
                                        <MenuItem key={w} value={w}>
                                          {w}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  )}
                                />
                                {errors.applications?.[index]
                                  ?.workArrangement && (
                                  <FormHelperText error>
                                    {
                                      errors.applications[index].workArrangement
                                        ?.message
                                    }
                                  </FormHelperText>
                                )}
                              </FormControl>
                            </Stack>

                            {/* Role description */}
                            <Box>
                              <TextField
                                label='About the Role'
                                multiline
                                rows={6}
                                fullWidth
                                placeholder='Paste the full job description or write a brief summary…'
                                {...register(
                                  `applications.${index}.roleDescription`,
                                )}
                              />
                              <Button
                                size='small'
                                startIcon={<AutoFixHighIcon fontSize='small' />}
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
                                {...register(
                                  `applications.${index}.impression`,
                                )}
                              />
                              <Button
                                size='small'
                                startIcon={<AutoFixHighIcon fontSize='small' />}
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
                        </Paper>
                      ))}
                    </Stack>
                  </Collapse>
                </>
              )}

              <Button
                variant='outlined'
                startIcon={<WorkIcon />}
                onClick={() => append({ ...EMPTY_APPLICATION })}
                sx={{ alignSelf: 'flex-start' }}
              >
                {fields.length === 0
                  ? 'Log a Job Application'
                  : 'Add Another Application'}
              </Button>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color='inherit'>
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
