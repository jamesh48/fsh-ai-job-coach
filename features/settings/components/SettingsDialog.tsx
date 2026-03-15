'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import CloseIcon from '@mui/icons-material/Close'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import EditIcon from '@mui/icons-material/Edit'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import LightModeIcon from '@mui/icons-material/LightMode'
import PrintIcon from '@mui/icons-material/Print'
import SecurityIcon from '@mui/icons-material/Security'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import TuneIcon from '@mui/icons-material/Tune'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Autocomplete,
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
  List,
  ListItem,
  ListItemText,
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
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import ReactMarkdown from 'react-markdown'
import * as yup from 'yup'
import {
  useGeneratePlanMutation,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from '@/lib/api'
import {
  getDeviceId,
  getDeviceLabel,
  loadSavedPrinterId,
  savePrinterId,
} from '@/lib/printerPreference'
import { type ThemeModePreference, useThemeMode } from '@/lib/themeModeContext'
import { useAutoPrint } from '@/lib/useAutoPrint'
import type { PasswordFormValues, SettingsFormValues } from '../types'

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
  jobSearchPlan: yup.string().default(''),
})

const PRIORITY_OPTIONS = [
  'Build application pipeline',
  'Networking & outreach',
  'Interview preparation',
  'DSA / technical practice',
  'Resume & portfolio polish',
  'Recruiter outreach',
  'LinkedIn optimization',
  'Referral sourcing',
  'Company research',
  'Salary & offer research',
  'Follow-up cadence',
  'Offer negotiation',
]

const DURATION_OPTIONS = [
  { value: '4', label: '4 weeks' },
  { value: '6', label: '6 weeks' },
  { value: '8', label: '8 weeks' },
  { value: '10', label: '10 weeks' },
  { value: '12', label: '12 weeks' },
]

const passwordSchema = yup.object({
  currentPassword: yup.string().default(''),
  newPassword: yup.string().min(8, 'Minimum 8 characters').required('Required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
    .required('Required'),
})

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

  const { register, handleSubmit, reset, setValue, control } =
    useForm<SettingsFormValues>({
      resolver: yupResolver(schema),
      defaultValues: {
        anthropicApiKey: '',
        careerProfile: '',
        jobSearchPlan: '',
      },
    })

  const jobSearchPlan = useWatch({ control, name: 'jobSearchPlan' })

  // Plan builder local state (not persisted — just used to generate the plan)
  const [planStartDate, setPlanStartDate] = useState('')
  const [planDuration, setPlanDuration] = useState('6')
  const [planPriorities, setPlanPriorities] = useState<string[]>([])
  const [editingPlan, setEditingPlan] = useState(false)
  const [generatePlan, { isLoading: generatingPlan }] =
    useGeneratePlanMutation()

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
      reset({
        anthropicApiKey: settings.anthropicApiKey ?? '',
        careerProfile: settings.careerProfile ?? '',
        jobSearchPlan: settings.jobSearchPlan ?? '',
      })
    }
  }, [settings, reset])

  useEffect(() => {
    if (!open) {
      setTab(0)
      setEditingPlan(false)
    }
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

  async function handleGeneratePlan() {
    const result = await generatePlan({
      startDate: planStartDate || undefined,
      durationWeeks: planDuration ? Number(planDuration) : undefined,
      priorities:
        planPriorities.length > 0
          ? planPriorities.map((p, i) => `${i + 1}. ${p}`).join('\n')
          : undefined,
    })
    if (!('error' in result) && result.data) {
      setValue('jobSearchPlan', result.data.plan)
      setEditingPlan(false)
    } else {
      enqueueSnackbar(
        'error' in result
          ? String(
              (result.error as { data?: { error?: string } }).data?.error ??
                'Failed to generate plan.',
            )
          : 'Failed to generate plan.',
        { variant: 'error' },
      )
    }
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='xl'>
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

      <DialogContent sx={{ pt: 3, height: 1000, overflowY: 'auto' }}>
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
                rows={16}
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
                Build a structured plan and Claude will align daily coaching
                advice with your current phase. Fill in the fields below to
                generate one, or write your own directly in the text area.
              </Typography>
              <Stack spacing={2}>
                {/* Plan builder inputs */}
                <Stack direction='row' spacing={2}>
                  <TextField
                    label='Start Date'
                    type='date'
                    size='small'
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={planStartDate}
                    onChange={(e) => setPlanStartDate(e.target.value)}
                  />
                  <FormControl size='small' sx={{ minWidth: 130 }}>
                    <InputLabel>Duration</InputLabel>
                    <Select
                      label='Duration'
                      value={planDuration}
                      onChange={(e) => setPlanDuration(e.target.value)}
                    >
                      {DURATION_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
                <Box>
                  <Autocomplete
                    multiple
                    freeSolo
                    size='small'
                    options={PRIORITY_OPTIONS}
                    value={planPriorities}
                    onChange={(_, value) => setPlanPriorities(value)}
                    slotProps={{ chip: { sx: { display: 'none' } } }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label='Top priorities / focus areas'
                        placeholder={
                          planPriorities.length === 0
                            ? 'Search or type a custom goal, press Enter to add'
                            : 'Add another…'
                        }
                      />
                    )}
                  />
                  {planPriorities.length > 0 && (
                    <List dense disablePadding sx={{ mt: 1 }}>
                      {planPriorities.map((p, i) => (
                        <ListItem
                          key={p}
                          disableGutters
                          secondaryAction={
                            <Stack direction='row' spacing={0}>
                              <IconButton
                                size='small'
                                disabled={i === 0}
                                onClick={() => {
                                  const next = [...planPriorities]
                                  ;[next[i - 1], next[i]] = [
                                    next[i],
                                    next[i - 1],
                                  ]
                                  setPlanPriorities(next)
                                }}
                              >
                                <KeyboardArrowUpIcon fontSize='small' />
                              </IconButton>
                              <IconButton
                                size='small'
                                disabled={i === planPriorities.length - 1}
                                onClick={() => {
                                  const next = [...planPriorities]
                                  ;[next[i + 1], next[i]] = [
                                    next[i],
                                    next[i + 1],
                                  ]
                                  setPlanPriorities(next)
                                }}
                              >
                                <KeyboardArrowDownIcon fontSize='small' />
                              </IconButton>
                              <IconButton
                                size='small'
                                onClick={() =>
                                  setPlanPriorities(
                                    planPriorities.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                <CloseIcon fontSize='small' />
                              </IconButton>
                            </Stack>
                          }
                          sx={{
                            pr: 14,
                            borderRadius: 1,
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ minWidth: 20, mr: 1 }}
                          >
                            {i + 1}.
                          </Typography>
                          <ListItemText
                            primary={p}
                            slotProps={{ primary: { variant: 'body2' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
                <Box>
                  <Button
                    size='small'
                    startIcon={<AutoFixHighIcon fontSize='small' />}
                    onClick={handleGeneratePlan}
                    disabled={generatingPlan}
                  >
                    {generatingPlan ? 'Generating…' : 'Generate Plan with AI'}
                  </Button>
                </Box>

                {/* Plan display / edit */}
                {generatingPlan ? (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 2,
                      pt: 1,
                      pb: 2,
                    }}
                  >
                    <Skeleton width='40%' height={20} sx={{ mb: 1 }} />
                    <Skeleton height={16} />
                    <Skeleton height={16} />
                    <Skeleton width='85%' height={16} sx={{ mb: 1.5 }} />
                    <Skeleton width='30%' height={20} sx={{ mb: 1 }} />
                    <Skeleton height={16} />
                    <Skeleton width='90%' height={16} />
                    <Skeleton width='75%' height={16} sx={{ mb: 1.5 }} />
                    <Skeleton width='35%' height={20} sx={{ mb: 1 }} />
                    <Skeleton height={16} />
                    <Skeleton width='80%' height={16} />
                  </Box>
                ) : jobSearchPlan && !editingPlan ? (
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 2,
                      pt: 1,
                      pb: 2,
                      position: 'relative',
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
                        Your Plan
                      </Typography>
                      <IconButton
                        size='small'
                        onClick={() => setEditingPlan(true)}
                      >
                        <EditIcon fontSize='small' />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        '& p': { margin: 0, mb: 1 },
                        '& h1, & h2, & h3': { mt: 1.5, mb: 0.5 },
                        '& ul, & ol': { pl: 2.5, mb: 1 },
                        '& li': { mb: 0.25 },
                        typography: 'body2',
                      }}
                    >
                      <ReactMarkdown>{jobSearchPlan}</ReactMarkdown>
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <TextField
                      label='Your Plan'
                      multiline
                      rows={10}
                      fullWidth
                      placeholder='Your generated plan will appear here — or write your own. Claude reads this on every coaching request.'
                      slotProps={{ inputLabel: { shrink: true } }}
                      onFocus={() => setEditingPlan(true)}
                      {...register('jobSearchPlan')}
                    />
                    {jobSearchPlan && (
                      <Box
                        sx={{
                          mt: 0.5,
                          display: 'flex',
                          justifyContent: 'flex-end',
                        }}
                      >
                        <Button
                          size='small'
                          color='inherit'
                          onClick={() => setEditingPlan(false)}
                        >
                          Done editing
                        </Button>
                      </Box>
                    )}
                  </Box>
                )}
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
        <Button
          onClick={onClose}
          color='inherit'
          variant='outlined'
          disabled={generatingPlan}
        >
          {tab === 1 ? 'Cancel' : 'Close'}
        </Button>
        {tab === 1 && (
          <Button
            variant='contained'
            disabled={saving || generatingPlan}
            onClick={handleSubmit(onSubmit)}
          >
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
