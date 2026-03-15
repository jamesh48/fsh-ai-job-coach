'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import {
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useState } from 'react'
import { useUpdateLogMutation } from '@/lib/api'
import {
  ACTIVITY_LABELS,
  type Activity,
  type ActivityType,
  parseContent,
  serializeToContent,
} from '../applicationFormUtils'
import type { DailyLog } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  log: DailyLog
  appIndex: number
}

const today = new Date().toISOString().slice(0, 10)

const TYPE_COLORS: Record<
  ActivityType,
  'default' | 'primary' | 'secondary' | 'warning' | 'error' | 'success' | 'info'
> = {
  recruiter_outreach: 'primary',
  phone_screen: 'info',
  interview: 'secondary',
  follow_up: 'default',
  offer_call: 'success',
  rejection: 'error',
  note: 'default',
}

export function ApplicationActivitiesDrawer({
  open,
  onClose,
  log,
  appIndex,
}: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [updateLog] = useUpdateLogMutation()

  const [newType, setNewType] = useState<ActivityType>('note')
  const [newDate, setNewDate] = useState(today)
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const { notes, applications } = parseContent(log.content)
  const app = applications[appIndex]

  if (!app) return null

  const activities = [...(app.activities ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  async function saveActivities(updated: Activity[]) {
    setSaving(true)
    const updatedApps = applications.map((a, i) =>
      i === appIndex ? { ...a, activities: updated } : a,
    )
    const result = await updateLog({
      ...log,
      content: serializeToContent({ notes, applications: updatedApps }),
    })
    setSaving(false)
    if ('error' in result) {
      enqueueSnackbar('Failed to save activity.', { variant: 'error' })
    }
  }

  async function handleAdd() {
    if (!newNotes.trim()) return
    const activity: Activity = {
      id: crypto.randomUUID(),
      type: newType,
      date: newDate,
      notes: newNotes.trim(),
    }
    // Preserve original order (not sorted) for serialization
    const updated = [...(app.activities ?? []), activity]
    await saveActivities(updated)
    setNewNotes('')
    setNewType('note')
    setNewDate(today)
  }

  async function handleDelete(id: string) {
    const updated = (app.activities ?? []).filter((a) => a.id !== id)
    await saveActivities(updated)
  }

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 420 }, p: 3 } }}
    >
      <Typography variant='h6' fontWeight={600} mb={0.5}>
        Activities
      </Typography>
      <Typography variant='body2' color='text.secondary' mb={3}>
        {app.jobTitle} at {app.company}
      </Typography>

      {/* Add activity form */}
      <Stack spacing={1.5}>
        <Stack direction='row' spacing={1.5}>
          <FormControl size='small' sx={{ minWidth: 160 }}>
            <InputLabel>Type</InputLabel>
            <Select
              label='Type'
              value={newType}
              onChange={(e) => setNewType(e.target.value as ActivityType)}
            >
              {(
                Object.entries(ACTIVITY_LABELS) as [ActivityType, string][]
              ).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label='Date'
            type='date'
            size='small'
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            sx={{ flex: 1 }}
          />
        </Stack>
        <TextField
          label='Notes'
          size='small'
          multiline
          rows={2}
          fullWidth
          placeholder='What happened? Any key takeaways…'
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
        />
        <Box>
          <Button
            size='small'
            variant='contained'
            startIcon={<AddIcon fontSize='small' />}
            onClick={handleAdd}
            disabled={saving || !newNotes.trim()}
          >
            Add Activity
          </Button>
        </Box>
      </Stack>

      <Divider sx={{ my: 3 }}>
        <Typography variant='overline' color='text.secondary' fontWeight={600}>
          History
        </Typography>
      </Divider>

      {/* Activity timeline */}
      {activities.length === 0 ? (
        <Typography variant='body2' color='text.secondary'>
          No activities yet.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {activities.map((act) => (
            <Box key={act.id}>
              <Box display='flex' alignItems='center' gap={1} mb={0.5}>
                <Chip
                  label={ACTIVITY_LABELS[act.type] ?? act.type}
                  color={TYPE_COLORS[act.type] ?? 'default'}
                  size='small'
                />
                <Typography variant='caption' color='text.secondary'>
                  {act.date.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$2-$3-$1')}
                </Typography>
                <Tooltip title='Delete'>
                  <IconButton
                    size='small'
                    sx={{ ml: 'auto', color: 'text.disabled' }}
                    onClick={() => handleDelete(act.id)}
                    disabled={saving}
                  >
                    <DeleteOutlineIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
              </Box>
              <Typography variant='body2' sx={{ whiteSpace: 'pre-wrap' }}>
                {act.notes}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Drawer>
  )
}
