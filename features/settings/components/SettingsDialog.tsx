'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import DarkModeIcon from '@mui/icons-material/DarkMode'
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
  FormControlLabel,
  IconButton,
  InputAdornment,
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
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/lib/api'
import { type ThemeModePreference, useThemeMode } from '@/lib/themeModeContext'
import { useAutoPrint } from '@/lib/useAutoPrint'
import type { PasswordFormValues, SettingsFormValues } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const schema = yup.object({
  anthropicApiKey: yup.string().default(''),
  careerProfile: yup.string().default(''),
})

const passwordSchema = yup.object({
  currentPassword: yup.string().default(''),
  newPassword: yup.string().min(8, 'Minimum 8 characters').required('Required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords do not match')
    .required('Required'),
})

const TABS = [
  { label: 'General', icon: <TuneIcon fontSize='small' /> },
  { label: 'AI', icon: <AutoAwesomeIcon fontSize='small' /> },
  { label: 'Security', icon: <SecurityIcon fontSize='small' /> },
]

export function SettingsDialog({ open, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab] = useState(0)
  const [showKey, setShowKey] = useState(false)
  const { preference: themePreference, setPreference: setThemePreference } =
    useThemeMode()
  const [autoPrint, setAutoPrint] = useAutoPrint()

  const { data: settings } = useGetSettingsQuery(undefined, { skip: !open })
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation()

  const { register, handleSubmit, reset } = useForm<SettingsFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { anthropicApiKey: '', careerProfile: '' },
  })

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
      })
    }
  }, [settings, reset])

  // Reset tab when dialog closes
  useEffect(() => {
    if (!open) setTab(0)
  }, [open])

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
                      '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': {
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
        <Button onClick={onClose} color='inherit'>
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
