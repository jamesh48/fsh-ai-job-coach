'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  Switch,
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

export function SettingsDialog({ open, onClose }: Props) {
  const { enqueueSnackbar } = useSnackbar()
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
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Appearance */}
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
                  <SettingsBrightnessIcon fontSize='small' sx={{ mr: 0.75 }} />
                  System
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          <Divider />

          {/* Printing */}
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              fontWeight={600}
            >
              Printing
            </Typography>
            <Box mt={1}>
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
                      '& .MuiSwitch-thumb': { borderRadius: 11 },
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
          </Box>

          <Divider />

          {/* AI Integration */}
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

          <Divider />

          {/* Career Profile */}
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
              dealbreakers. Claude reads this on every coaching request to give
              personalized advice.
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

          <Divider />

          {/* Security — separate form so it doesn't nest inside the settings form */}
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              fontWeight={600}
            >
              Security
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
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color='inherit'>
          Cancel
        </Button>
        <Button
          variant='contained'
          disabled={saving}
          onClick={handleSubmit(onSubmit)}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
