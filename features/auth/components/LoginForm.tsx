'use client'

import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleModeChange(
    _: React.SyntheticEvent,
    value: 'login' | 'register',
  ) {
    setMode(value)
    setError('')
    setConfirmPassword('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <Box
      display='flex'
      justifyContent='center'
      alignItems='center'
      minHeight='100vh'
      px={2}
    >
      <Paper
        elevation={0}
        variant='outlined'
        sx={{ width: '100%', maxWidth: 400 }}
      >
        <Box display='flex' alignItems='center' gap={1} px={4} pt={4} mb={2}>
          <WorkOutlineIcon color='action' />
          <Typography variant='h6' fontWeight={700}>
            Job Search Coach
          </Typography>
        </Box>

        <Tabs value={mode} onChange={handleModeChange} variant='fullWidth'>
          <Tab label='Sign In' value='login' />
          <Tab label='Create Account' value='register' />
        </Tabs>

        <Box px={4} pb={4} pt={3}>
          <form onSubmit={handleSubmit} noValidate>
            <TextField
              label='Username'
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              autoFocus
              autoComplete='username'
              sx={{ mb: 2 }}
            />
            <TextField
              label='Password'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              error={!!error && mode === 'login'}
              helperText={
                mode === 'login'
                  ? error || 'Minimum 8 characters.'
                  : 'Minimum 8 characters.'
              }
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton
                        size='small'
                        onClick={() => setShowPassword((s) => !s)}
                      >
                        {showPassword ? (
                          <VisibilityOffIcon fontSize='small' />
                        ) : (
                          <VisibilityIcon fontSize='small' />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {mode === 'register' && (
              <TextField
                label='Confirm Password'
                type='password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                autoComplete='new-password'
                error={!!error}
                helperText={error || ' '}
                sx={{ mb: 2 }}
              />
            )}

            <Button
              type='submit'
              variant='contained'
              fullWidth
              disableElevation
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : mode === 'register' ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </Box>
      </Paper>
    </Box>
  )
}
