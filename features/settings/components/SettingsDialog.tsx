'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useGetPrintersQuery, useGetSettingsQuery, useUpdateSettingsMutation } from '@/lib/api'
import type { PasswordFormValues, SettingsFormValues } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const schema = yup.object({
  anthropicApiKey: yup.string().default(''),
  defaultPrinter: yup.string().default(''),
  printerType: yup.string().oneOf(['text', 'escpos']).default('text'),
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

  const { data: settings } = useGetSettingsQuery(undefined, { skip: !open })
  const {
    data: printers,
    isLoading: printersLoading,
    refetch: refetchPrinters,
    error: printersError,
  } = useGetPrintersQuery(undefined, { skip: !open })
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation()

  const { register, handleSubmit, reset, control } = useForm<SettingsFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { anthropicApiKey: '', defaultPrinter: '', printerType: 'text' },
  })

  const [savingPassword, setSavingPassword] = useState(false)
  const {
    register: registerPw,
    handleSubmit: handleSubmitPw,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm<PasswordFormValues>({
    resolver: yupResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (settings) {
      reset({
        anthropicApiKey: settings.anthropicApiKey ?? '',
        defaultPrinter: settings.defaultPrinter ?? '',
        printerType: settings.printerType ?? 'text',
      })
    }
  }, [settings, reset])

  async function onPasswordSubmit(values: PasswordFormValues) {
    setSavingPassword(true)
    const res = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: values.currentPassword, newPassword: values.newPassword }),
    })
    setSavingPassword(false)
    const data = await res.json()
    if (!res.ok) {
      enqueueSnackbar(data.error ?? 'Failed to update password.', { variant: 'error' })
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Settings</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3}>
            {/* AI Integration */}
            <Box>
              <Typography variant='overline' color='text.secondary' fontWeight={600}>
                AI Integration
              </Typography>
              <Stack spacing={2} mt={1.5}>
                <TextField
                  label='Anthropic API Key'
                  type={showKey ? 'text' : 'password'}
                  placeholder='sk-ant-...'
                  helperText='Required to use AI coaching features.'
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position='end'>
                          <IconButton size='small' onClick={() => setShowKey((s) => !s)}>
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

            {/* Printing */}
            <Box>
              <Box display='flex' alignItems='center' justifyContent='space-between'>
                <Typography variant='overline' color='text.secondary' fontWeight={600}>
                  Printing
                </Typography>
                <IconButton
                  size='small'
                  onClick={() => refetchPrinters()}
                  disabled={printersLoading}
                >
                  <RefreshIcon fontSize='small' />
                </IconButton>
              </Box>
              <Stack spacing={2} mt={1.5}>
                {printersLoading ? (
                  <CircularProgress size={20} />
                ) : printersError ? (
                  <Typography variant='caption' color='error'>
                    Could not load printers. Make sure a print spooler is running.
                  </Typography>
                ) : (
                  <Controller
                    name='defaultPrinter'
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Default Printer</InputLabel>
                        <Select {...field} label='Default Printer'>
                          <MenuItem value=''>None</MenuItem>
                          {(printers ?? []).map((p) => (
                            <MenuItem key={p.name} value={p.name}>
                              {p.displayName || p.name}
                              {p.isDefault ? ' ★' : ''}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                )}
                <Controller
                  name='printerType'
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Printer Type</InputLabel>
                      <Select {...field} label='Printer Type'>
                        <MenuItem value='text'>Plain Text</MenuItem>
                        <MenuItem value='escpos'>ESC/POS (thermal receipt)</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
                <Typography variant='caption' color='text.secondary'>
                  When set, AI recommendations will be automatically sent to this printer.
                </Typography>
              </Stack>
            </Box>
          <Divider />

            {/* Security */}
            <Box>
              <Typography variant='overline' color='text.secondary' fontWeight={600}>
                Security
              </Typography>
              <Stack spacing={2} mt={1.5} component='form' onSubmit={handleSubmitPw(onPasswordSubmit)}>
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
                  <Button type='submit' variant='outlined' size='small' disabled={savingPassword}>
                    Change Password
                  </Button>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color='inherit'>
            Cancel
          </Button>
          <Button type='submit' variant='contained' disabled={saving}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
