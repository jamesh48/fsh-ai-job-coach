'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import AddIcon from '@mui/icons-material/Add'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import DeleteIcon from '@mui/icons-material/Delete'
import LightModeIcon from '@mui/icons-material/LightMode'
import PrintIcon from '@mui/icons-material/Print'
import SecurityIcon from '@mui/icons-material/Security'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import TuneIcon from '@mui/icons-material/Tune'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/lib/api'
import {
  getDeviceId,
  getDeviceLabel,
  loadSavedPrinterId,
  savePrinterId,
} from '@/lib/printerPreference'
import { type ThemeModePreference, useThemeMode } from '@/lib/themeModeContext'
import { useAutoPrint } from '@/lib/useAutoPrint'
import type {
  JobSearchPlan,
  PasswordFormValues,
  SettingsFormValues,
} from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const TABS = [
  { label: 'General', icon: <TuneIcon fontSize='small' /> },
  { label: 'AI', icon: <AutoAwesomeIcon fontSize='small' /> },
  { label: 'Security', icon: <SecurityIcon fontSize='small' /> },
]

const schema = yup.object({
  anthropicApiKey: yup.string().default(''),
  careerProfile: yup.string().default(''),
  planStartDate: yup.string().default(''),
  planEndDate: yup.string().default(''),
  planPhases: yup
    .array(
      yup.object({
        label: yup.string().default(''),
        focus: yup.string().default(''),
      }),
    )
    .default([]),
  planNotes: yup.string().default(''),
})

const passwordSchema = yup.object({
  currentPassword: yup.string().default(''),
  newPassword: yup.string().min(8, 'Minimum 8 characters').required('Required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
    .required('Required'),
})

function weeksBetween(start: string, end: string): number | null {
  if (!start || !end) return null
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return null
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000))
}

export function SettingsDialog({ open, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab] = useState(0)
  const [showKey, setShowKey] = useState(false)
  const { preference: themePreference, setPreference: setThemePreference } =
    useThemeMode()
  const [autoPrint, setAutoPrint] = useAutoPrint()
  const [printerDevices, setPrinterDevices] = useState<USBDevice[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState('')
  const usbSupported = typeof navigator !== 'undefined' && 'usb' in navigator

  const { data: settings } = useGetSettingsQuery(undefined, { skip: !open })
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation()

  const { register, handleSubmit, reset, watch, control } =
    useForm<SettingsFormValues>({
      resolver: yupResolver(schema),
      defaultValues: {
        anthropicApiKey: '',
        careerProfile: '',
        planStartDate: '',
        planEndDate: '',
        planPhases: [],
        planNotes: '',
      },
    })

  const {
    fields: phaseFields,
    append: appendPhase,
    remove: removePhase,
  } = useFieldArray({ control, name: 'planPhases' })

  const planStartDate = watch('planStartDate')
  const planEndDate = watch('planEndDate')
  const planWeeks = weeksBetween(planStartDate, planEndDate)

  const [savingPassword, setSavingPassword] = useState(false)
  const {
    register: registerPw,
    handleSubmit: handleSubmitPw,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordFormValues>({
    resolver: yupResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (settings) {
      let plan: JobSearchPlan | null = null
      if (settings.jobSearchPlan) {
        try {
          plan = JSON.parse(settings.jobSearchPlan) as JobSearchPlan
        } catch {
          // malformed JSON — ignore
        }
      }
      reset({
        anthropicApiKey: settings.anthropicApiKey ?? '',
        careerProfile: settings.careerProfile ?? '',
        planStartDate: plan?.startDate ?? '',
        planEndDate: plan?.endDate ?? '',
        planPhases: plan?.phases ?? [],
        planNotes: plan?.notes ?? '',
      })
    }
  }, [settings, reset])

  useEffect(() => {
    if (!open) setTab(0)
  }, [open])

  useEffect(() => {
    if (!open || !usbSupported) return
    navigator.usb.getDevices().then((devices) => {
      setPrinterDevices(devices)
      setSelectedPrinterId(loadSavedPrinterId())
    })
  }, [open, usbSupported])

  async function handleAuthorizePrinter() {
    try {
      await navigator.usb.requestDevice({ filters: [] })
      const devices = await navigator.usb.getDevices()
      setPrinterDevices(devices)
    } catch {
      // User cancelled the picker — no-op
    }
  }

  function handleSelectPrinter(id: string) {
    setSelectedPrinterId(id)
    savePrinterId(id)
  }

  async function onPasswordSubmit(values: PasswordFormValues) {
    setSavingPassword(true)
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    })
    setSavingPassword(false)
    const data = await res.json()
    if (!res.ok) {
      enqueueSnackbar(data.error ?? 'Failed to update password.', {
        variant: 'error',
      })
    } else {
      enqueueSnackbar('Password updated.', { variant: 'success' })
      resetPw()
    }
  }

  async function onSubmit(values: SettingsFormValues) {
    const result = await updateSettings(values)
    if ('error' in result) {
      enqueueSnackbar('Failed to save settings.', { variant: 'error' })
    } else {
      enqueueSnackbar('Settings saved.', { variant: 'success' })
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
      <DialogTitle sx={{ pb: 0 }}>Settings</DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant='scrollable'
          scrollButtons='auto'
        >
          {TABS.map((t) => (
            <Tab
              key={t.label}
              label={t.label}
              icon={t.icon}
              iconPosition='start'
              sx={{ minHeight: 48, gap: 0.75 }}
            />
          ))}
        </Tabs>
      </Box>

      <DialogContent sx={{ pt: 3, height: 500, overflowY: 'auto' }}>
        {/* General */}
        {tab === 0 && (
          <Stack spacing={3}>
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                fontWeight={600}
              >
                Appearance
              </Typography>
              <Box mt={1.5}>
                <ToggleButtonGroup
                  exclusive
                  value={themePreference}
                  onChange={(_, val: ThemeModePreference | null) => {
                    if (val) setThemePreference(val)
                  }}
                  size='small'
                >
                  <ToggleButton value='light'>
                    <LightModeIcon fontSize='small' sx={{ mr: 0.75 }} />
                    Light
                  </ToggleButton>
                  <ToggleButton value='dark'>
                    <DarkModeIcon fontSize='small' sx={{ mr: 0.75 }} />
                    Dark
                  </ToggleButton>
                  <ToggleButton value='system'>
                    <SettingsBrightnessIcon
                      fontSize='small'
                      sx={{ mr: 0.75 }}
                    />
                    System
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
              >
                <PrintIcon fontSize='small' color='action' />
                <Typography
                  variant='overline'
                  color='text.secondary'
                  fontWeight={600}
                >
                  Printing
                </Typography>
              </Box>
              <Stack spacing={2}>
                {usbSupported && (
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                    <FormControl size='small' sx={{ flex: 1 }}>
                      <InputLabel>Printer</InputLabel>
                      <Select
                        label='Printer'
                        value={selectedPrinterId}
                        onChange={(e) => handleSelectPrinter(e.target.value)}
                        displayEmpty
                      >
                        {printerDevices.length === 0 && (
                          <MenuItem value=''>
                            <Typography variant='body2' color='text.secondary'>
                              No authorized printers
                            </Typography>
                          </MenuItem>
                        )}
                        {printerDevices.map((d) => (
                          <MenuItem key={getDeviceId(d)} value={getDeviceId(d)}>
                            {getDeviceLabel(d)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      size='small'
                      variant='outlined'
                      onClick={handleAuthorizePrinter}
                      sx={{ flexShrink: 0, height: 40 }}
                    >
                      Authorize Printer
                    </Button>
                  </Box>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoPrint}
                      onChange={(e) => setAutoPrint(e.target.checked)}
                      color='primary'
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                          { opacity: 1 },
                        '& .MuiSwitch-track': { borderRadius: 11 },
                        '& .MuiSwitch-thumb': { borderRadius: 3 },
                        '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb':
                          {
                            backgroundColor: 'secondary.main',
                            boxShadow: '0 0 0 2px rgba(0,0,0,0.15)',
                          },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant='body2'>
                        Auto-print when advice is generated
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        Prints immediately if a USB printer is connected.
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </Box>
          </Stack>
        )}

        {/* AI */}
        {tab === 1 && (
          <Stack spacing={3}>
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                fontWeight={600}
              >
                AI Integration
              </Typography>
              <Stack spacing={2} mt={1.5}>
                <TextField
                  label='Anthropic API Key'
                  type={showKey ? 'text' : 'password'}
                  placeholder='sk-ant-...'
                  helperText='Required to use AI coaching features.'
                  slotProps={{
                    inputLabel: { shrink: true },
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton
                            size='small'
                            onClick={() => setShowKey((s) => !s)}
                          >
                            {showKey ? (
                              <VisibilityOffIcon fontSize='small' />
                            ) : (
                              <VisibilityIcon fontSize='small' />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  {...register('anthropicApiKey')}
                />
              </Stack>
            </Box>

            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                fontWeight={600}
              >
                Career Profile
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                mt={0.5}
                mb={1.5}
              >
                Describe yourself as a candidate — target roles, years of
                experience, key skills, what you're looking for, and any
                dealbreakers. Claude reads this on every coaching request to
                give personalized advice.
              </Typography>
              <TextField
                label='Your Profile'
                multiline
                rows={8}
                fullWidth
                placeholder={`Example:\nI'm a senior full-stack engineer with 8 years of experience, primarily in React and Node.js. I'm targeting staff-level IC roles at Series B–D startups. I want remote or hybrid in the US, $180–220k base. I'm excited about developer tools, fintech, and climate tech. I'm not interested in defense, crypto, or pure front-end roles. I have a strong background in system design and have led teams of 3–5 engineers.`}
                slotProps={{ inputLabel: { shrink: true } }}
                {...register('careerProfile')}
              />
            </Box>

            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                fontWeight={600}
              >
                Job Search Plan
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                mt={0.5}
                mb={2}
              >
                Define a structured plan for your search. Claude will use this
                to align daily advice with your current phase — e.g. if you're
                in a pipeline-building week, it'll push outreach; if you're in a
                prep week, it'll prioritize interview practice.
              </Typography>
              <Stack spacing={2}>
                {/* Date range */}
                <Stack direction='row' spacing={2} alignItems='center'>
                  <TextField
                    label='Start Date'
                    type='date'
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...register('planStartDate')}
                  />
                  <TextField
                    label='End Date'
                    type='date'
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...register('planEndDate')}
                  />
                  {planWeeks !== null && (
                    <Typography variant='body2' color='text.secondary' noWrap>
                      {planWeeks} week{planWeeks !== 1 ? 's' : ''}
                    </Typography>
                  )}
                </Stack>

                {/* Phases */}
                <Box>
                  <Typography variant='body2' fontWeight={500} mb={1}>
                    Phases
                  </Typography>
                  <Stack spacing={1.5}>
                    {phaseFields.map((field, index) => (
                      <Stack
                        key={field.id}
                        direction='row'
                        spacing={1}
                        alignItems='flex-start'
                      >
                        <TextField
                          label='Label'
                          size='small'
                          placeholder='Week 1–2'
                          sx={{ width: 140, flexShrink: 0 }}
                          {...register(`planPhases.${index}.label`)}
                        />
                        <TextField
                          label='Focus'
                          size='small'
                          fullWidth
                          placeholder='Build pipeline — target 20 outreach messages, identify 10 companies'
                          {...register(`planPhases.${index}.focus`)}
                        />
                        <Tooltip title='Remove phase'>
                          <IconButton
                            size='small'
                            onClick={() => removePhase(index)}
                            color='error'
                            sx={{ mt: 0.5 }}
                          >
                            <DeleteIcon fontSize='small' />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    ))}
                    <Box>
                      <Button
                        size='small'
                        startIcon={<AddIcon />}
                        onClick={() => appendPhase({ label: '', focus: '' })}
                      >
                        Add Phase
                      </Button>
                    </Box>
                  </Stack>
                </Box>

                {/* Free-form plan */}
                <TextField
                  label='Free-form Plan (optional)'
                  multiline
                  rows={5}
                  fullWidth
                  placeholder={`Describe your plan in your own words, or use this alongside phases above.\n\nExample: 6-week search starting March 15. Week 1: DSA practice and resume polish. Weeks 2–3: Build leads — 3 applications/day, 10 networking messages/week. Week 4: First-round prep. Weeks 5–6: Final-round prep and offer evaluation.`}
                  slotProps={{ inputLabel: { shrink: true } }}
                  {...register('planNotes')}
                />
              </Stack>
            </Box>
          </Stack>
        )}

        {/* Security */}
        {tab === 2 && (
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              fontWeight={600}
            >
              Change Password
            </Typography>
            <form onSubmit={handleSubmitPw(onPasswordSubmit)}>
              <Stack spacing={2} mt={1.5}>
                <TextField
                  label='Current Password'
                  type='password'
                  {...registerPw('currentPassword')}
                  error={!!pwErrors.currentPassword}
                  helperText={pwErrors.currentPassword?.message}
                />
                <TextField
                  label='New Password'
                  type='password'
                  {...registerPw('newPassword')}
                  error={!!pwErrors.newPassword}
                  helperText={pwErrors.newPassword?.message}
                />
                <TextField
                  label='Confirm New Password'
                  type='password'
                  {...registerPw('confirmPassword')}
                  error={!!pwErrors.confirmPassword}
                  helperText={pwErrors.confirmPassword?.message}
                />
                <Box>
                  <Button
                    type='submit'
                    variant='contained'
                    size='small'
                    disabled={savingPassword}
                  >
                    Change Password
                  </Button>
                </Box>
              </Stack>
            </form>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color='inherit' variant='outlined'>
          {tab === 1 ? 'Cancel' : 'Close'}
        </Button>
        {tab === 1 && (
          <Button
            variant='contained'
            disabled={saving}
            onClick={handleSubmit(onSubmit)}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
