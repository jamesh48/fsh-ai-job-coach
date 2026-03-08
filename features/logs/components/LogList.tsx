'use client'

import AddIcon from '@mui/icons-material/Add'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useRouter } from 'next/navigation'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { SettingsDialog } from '@/features/settings'
import { useLogs } from '../hooks/useLogs'
import type { DailyLog, LogFormValues } from '../types'
import { LogCard } from './LogCard'
import { LogForm } from './LogForm'

export function LogList() {
  const { logs, isLoading, error, add, update, remove } = useLogs()
  const { enqueueSnackbar } = useSnackbar()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DailyLog | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function openAdd() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(log: DailyLog) {
    setEditing(log)
    setOpen(true)
  }

  async function handleSubmit(values: LogFormValues) {
    const result = editing
      ? await update({ ...editing, ...values })
      : await add(values)

    if ('error' in result) {
      enqueueSnackbar(
        editing ? 'Failed to update entry.' : 'Failed to save entry.',
        {
          variant: 'error',
        },
      )
    } else {
      enqueueSnackbar(editing ? 'Entry updated.' : 'Entry saved.', {
        variant: 'success',
      })
      setOpen(false)
    }
  }

  async function handleDelete(id: string) {
    const result = await remove(id)
    if ('error' in result) {
      enqueueSnackbar('Failed to delete entry.', { variant: 'error' })
    } else {
      enqueueSnackbar('Entry deleted.', { variant: 'success' })
    }
  }

  return (
    <Box width='100%' maxWidth={640} mx='auto' py={6} px={2}>
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='center'
        mb={4}
      >
        <Box display='flex' alignItems='center' gap={1}>
          <WorkOutlineIcon color='action' />
          <Typography variant='h6' fontWeight={700}>
            Job Search Log
          </Typography>
        </Box>
        <Box display='flex' alignItems='center' gap={1}>
          <Button
            variant='contained'
            disableElevation
            startIcon={<AddIcon />}
            onClick={openAdd}
            size='small'
          >
            Add Entry
          </Button>
          <Tooltip title='Settings'>
            <IconButton size='small' onClick={() => setSettingsOpen(true)}>
              <SettingsIcon fontSize='small' />
            </IconButton>
          </Tooltip>
          <Tooltip title='Sign out'>
            <IconButton size='small' onClick={handleLogout}>
              <LogoutIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isLoading && (
        <Box display='flex' justifyContent='center' py={10}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          Failed to load entries. Make sure your database is connected.
        </Alert>
      )}

      {!isLoading && !error && logs.length === 0 && (
        <Box textAlign='center' py={10}>
          <Typography color='text.secondary'>
            No entries yet. Add your first daily log to get started.
          </Typography>
        </Box>
      )}

      {!isLoading && logs.length > 0 && (
        <Stack spacing={2}>
          {logs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </Stack>
      )}

      <LogForm
        open={open}
        editing={editing}
        existingDates={logs.map((l) => l.date)}
        onSubmit={handleSubmit}
        onClose={() => setOpen(false)}
      />

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  )
}
