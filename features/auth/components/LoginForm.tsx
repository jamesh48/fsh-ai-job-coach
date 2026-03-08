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
  TextField,
  Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/auth/status')
      .then((r) => r.json())
      .then((data) => setHasPassword(data.hasPassword))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
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

  if (hasPassword === null) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh'>
        <CircularProgress />
      </Box>
    )
  }

  const isSetup = !hasPassword

  return (
    <Box display='flex' justifyContent='center' alignItems='center' minHeight='100vh' px={2}>
      <Paper elevation={0} variant='outlined' sx={{ width: '100%', maxWidth: 400, p: 4 }}>
        <Box display='flex' alignItems='center' gap={1} mb={3}>
          <WorkOutlineIcon color='action' />
          <Typography variant='h6' fontWeight={700}>
            Job Search Coach
          </Typography>
        </Box>

        <Typography variant='body2' color='text.secondary' mb={3}>
          {isSetup
            ? 'Create a password to protect your job search data.'
            : 'Enter your password to continue.'}
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            label='Password'
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoFocus
            error={!!error}
            helperText={error || (isSetup ? 'Minimum 8 characters.' : undefined)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton size='small' onClick={() => setShowPassword((s) => !s)}>
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

          <Button
            type='submit'
            variant='contained'
            fullWidth
            disableElevation
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={20} /> : isSetup ? 'Create Password' : 'Sign In'}
          </Button>
        </form>
      </Paper>
    </Box>
  )
}
