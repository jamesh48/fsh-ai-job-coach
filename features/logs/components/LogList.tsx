'use client'

import AddIcon from '@mui/icons-material/Add'
import ClearIcon from '@mui/icons-material/Clear'
import LogoutIcon from '@mui/icons-material/Logout'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SearchIcon from '@mui/icons-material/Search'
import SettingsIcon from '@mui/icons-material/Settings'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import Grow from '@mui/material/Grow'
import { MagicWandIcon } from '@phosphor-icons/react'
import { useRouter } from 'next/navigation'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { AgentFilesButton } from '@/features/agent/components/AgentFilesButton'
import { NotificationBell } from '@/features/agent/components/NotificationBell'
import { AgentDialog } from '@/features/ai/components/AgentDialog'
import { AiAssistDialog } from '@/features/ai/components/AiAssistDialog'
import { SettingsDialog } from '@/features/settings'
import { useAppDispatch } from '@/hooks/redux'
import { useAgentSocket } from '@/lib/agentSocketContext'
import { api } from '@/lib/api'
import { useLogs } from '../hooks/useLogs'
import type { DailyLog, LogFormValues } from '../types'
import { LogCard } from './LogCard'
import { LogForm } from './LogForm'

export function LogList({ onSearch }: { onSearch?: () => void }) {
  const { logs, isLoading, error, add, update, remove } = useLogs()
  const { agentConnected, reset: resetSocket } = useAgentSocket()
  const { enqueueSnackbar } = useSnackbar()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DailyLog | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [assistOpen, setAssistOpen] = useState(false)
  const [agentOpen, setAgentOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null)

  function handleSearch(value: string) {
    setSearch(value)
    if (value) onSearch?.()
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    dispatch(api.util.resetApiState())
    resetSocket()
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
    try {
      await (editing ? update({ ...editing, ...values }) : add(values)).unwrap()
      enqueueSnackbar(editing ? 'Entry updated.' : 'Entry saved.', {
        variant: 'success',
      })
      setOpen(false)
    } catch {
      enqueueSnackbar(
        editing ? 'Failed to update entry.' : 'Failed to save entry.',
        { variant: 'error' },
      )
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove(id).unwrap()
      enqueueSnackbar('Entry deleted.', { variant: 'success' })
    } catch {
      enqueueSnackbar('Failed to delete entry.', { variant: 'error' })
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
        <Box display='flex' alignItems='center' gap={0.5}>
          {/* Always visible */}
          <Tooltip
            title={
              agentConnected
                ? 'Desktop agent connected'
                : 'Desktop agent not running'
            }
          >
            <IconButton size='small' onClick={() => setAgentOpen(true)}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: agentConnected ? 'success.main' : 'text.disabled',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.5, transform: 'scale(0.85)' },
                  },
                  animation: agentConnected
                    ? 'pulse 2s ease-in-out infinite'
                    : 'none',
                }}
              />
            </IconButton>
          </Tooltip>
          <NotificationBell />
          <AgentFilesButton />

          {/* Desktop: inline icons */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            <Tooltip title='AI Writing Assistant'>
              <IconButton
                size='small'
                onClick={() => setAssistOpen(true)}
                sx={{ '&:hover': { color: 'secondary.main' } }}
              >
                <MagicWandIcon size={16} weight='fill' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Settings'>
              <IconButton
                size='small'
                onClick={() => setSettingsOpen(true)}
                sx={{ '&:hover': { color: 'primary.main' } }}
              >
                <SettingsIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Sign out'>
              <IconButton
                size='small'
                onClick={handleLogout}
                sx={{ '&:hover': { color: 'error.main' } }}
              >
                <LogoutIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Mobile: overflow menu */}
          <Box sx={{ display: { xs: 'flex', sm: 'none' } }}>
            <IconButton
              size='small'
              onClick={(e) => setMoreAnchor(e.currentTarget)}
              sx={{ '&:hover': { color: 'primary.main' } }}
            >
              <MoreVertIcon fontSize='small' />
            </IconButton>
            <Menu
              anchorEl={moreAnchor}
              open={Boolean(moreAnchor)}
              onClose={() => setMoreAnchor(null)}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              slots={{ transition: Grow }}
              slotProps={{
                transition: { timeout: { enter: 200, exit: 120 } },
                paper: {
                  sx: {
                    minWidth: 210,
                    mt: 0.75,
                    borderRadius: '12px',
                    backdropFilter: 'blur(12px)',
                    boxShadow:
                      '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
                    transformOrigin: 'top right !important',
                    overflow: 'hidden',
                  },
                },
              }}
            >
              <MenuItem
                onClick={() => {
                  setAssistOpen(true)
                  setMoreAnchor(null)
                }}
              >
                <ListItemIcon sx={{ color: 'secondary.main' }}>
                  <MagicWandIcon size={18} weight='fill' />
                </ListItemIcon>
                <ListItemText>AI Writing Assistant</ListItemText>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSettingsOpen(true)
                  setMoreAnchor(null)
                }}
              >
                <ListItemIcon>
                  <SettingsIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setMoreAnchor(null)
                  handleLogout()
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon sx={{ color: 'error.main' }}>
                  <LogoutIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText>Sign out</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      <TextField
        fullWidth
        size='small'
        placeholder='Search entries…'
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{
          mb: 2,
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

      <Box display='flex' justifyContent='flex-end' mb={3}>
        <Button
          variant='contained'
          disableElevation
          startIcon={<AddIcon />}
          onClick={openAdd}
          size='small'
        >
          Add Entry
        </Button>
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

      <AgentDialog open={agentOpen} onClose={() => setAgentOpen(false)} />
      <AiAssistDialog open={assistOpen} onClose={() => setAssistOpen(false)} />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </Box>
  )
}
