'use client'

import { yupResolver } from '@hookform/resolvers/yup'
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
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { useGetSettingsQuery, useUpdateSettingsMutation } from '@/lib/api'
import type { PasswordFormValues, SettingsFormValues } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

const schema = yup.object({
  anthropicApiKey: yup.string().default(''),
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
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation()

  const { register, handleSubmit, reset } = useForm<SettingsFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { anthropicApiKey: '' },
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
      reset({ anthropicApiKey: settings.anthropicApiKey ?? '' })
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
