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
import { useState } from 'react'

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
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
        sx={{ width: '100%', maxWidth: 400, p: 4 }}
      >
        <Box display='flex' alignItems='center' gap={1} mb={3}>
          <WorkOutlineIcon color='action' />
          <Typography variant='h6' fontWeight={700}>
            Job Search Coach
          </Typography>
        </Box>

        <Typography variant='body2' color='text.secondary' mb={3}>
          Sign in to continue. New users are registered automatically.
        </Typography>

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
            autoComplete='current-password'
            error={!!error}
            helperText={error || 'Minimum 8 characters.'}
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

          <Button
            type='submit'
            variant='contained'
            fullWidth
            disableElevation
            disabled={loading}
            sx={{ mt: 2 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Sign In'}
          </Button>
        </form>
      </Paper>
    </Box>
  )
}
