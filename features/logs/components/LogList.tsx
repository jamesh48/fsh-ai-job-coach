'use client'

import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import LogoutIcon from '@mui/icons-material/Logout'
import SearchIcon from '@mui/icons-material/Search'
import SettingsIcon from '@mui/icons-material/Settings'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { MagicWandIcon } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { AiAssistDialog } from '@/features/ai/components/AiAssistDialog'
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
  const [assistOpen, setAssistOpen] = useState(false)
  const [search, setSearch] = useState('')

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

  const term = search.trim().toLowerCase()
  const filteredLogs = term
    ? logs.filter(
        (log) =>
          log.date.toLowerCase().includes(term) ||
          log.content.toLowerCase().includes(term),
      )
    : logs

  return (
    <Box width='100%' maxWidth={672} mx='auto' py={6} px={2}>
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
          <Tooltip title='AI Writing Assistant'>
            <IconButton
              size='small'
              onClick={() => setAssistOpen(true)}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'secondary.main' },
              }}
            >
              <MagicWandIcon size={16} weight='fill' />
            </IconButton>
          </Tooltip>
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

      <TextField
        fullWidth
        size='small'
        placeholder='Search entries…'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{
          mb: 3,
          '& .MuiOutlinedInput-root': term
            ? {
                '& fieldset': { borderColor: 'primary.main', borderWidth: 2 },
              }
            : {},
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon
                  fontSize='small'
                  color={term ? 'primary' : 'inherit'}
                />
              </InputAdornment>
            ),
            endAdornment: term ? (
              <InputAdornment position='end'>
                <IconButton
                  size='small'
                  onClick={() => setSearch('')}
                  edge='end'
                >
                  <ClearIcon fontSize='small' />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />

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

      {!isLoading && logs.length > 0 && filteredLogs.length === 0 && (
        <Box textAlign='center' py={10}>
          <Typography color='text.secondary'>
            No entries match your search.
          </Typography>
        </Box>
      )}

      {!isLoading && filteredLogs.length > 0 && (
        <Stack spacing={2}>
          {filteredLogs.map((log) => (
            <LogCard
              key={log.id}
              log={log}
              onEdit={openEdit}
              onDelete={handleDelete}
              searchTerm={term || undefined}
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

      <AiAssistDialog open={assistOpen} onClose={() => setAssistOpen(false)} />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  )
}
