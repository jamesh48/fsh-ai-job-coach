'use client'

import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { AgentEvent } from '@/lib/agentSocketContext'
import { useAgentSocket } from '@/lib/agentSocketContext'

dayjs.extend(relativeTime)

interface Props {
  open: boolean
  onClose: () => void
}

function EventItem({ event }: { event: AgentEvent }) {
  const time = dayjs(event.timestamp).fromNow()

  if (event.type === 'agent_connected' || event.type === 'agent_disconnected') {
    const connected = event.type === 'agent_connected'
    return (
      <Box display='flex' gap={1.5} alignItems='flex-start'>
        <CheckCircleOutlineIcon
          fontSize='small'
          sx={{
            color: connected ? 'success.main' : 'text.disabled',
            mt: 0.25,
            flexShrink: 0,
          }}
        />
        <Box>
          <Typography variant='body2' fontWeight={600}>
            {connected ? 'Agent connected' : 'Agent disconnected'}
          </Typography>
          <Typography variant='caption' color='text.disabled' display='block'>
            {time}
          </Typography>
        </Box>
      </Box>
    )
  }

  if (event.type === 'agent_status') {
    return (
      <Box display='flex' gap={1.5} alignItems='flex-start'>
        <CheckCircleOutlineIcon
          fontSize='small'
          sx={{ color: 'success.main', mt: 0.25, flexShrink: 0 }}
        />
        <Box>
          <Typography variant='body2' fontWeight={600}>
            Agent Connected
          </Typography>
          {event.payload.version && (
            <Typography variant='caption' color='text.secondary'>
              v{event.payload.version}
            </Typography>
          )}
          <Typography variant='caption' color='text.secondary' display='block'>
            {time}
          </Typography>
        </Box>
      </Box>
    )
  }

  if (event.type === 'email_detected') {
    const p = event.payload
    return (
      <Box display='flex' gap={1.5} alignItems='flex-start'>
        <EmailOutlinedIcon
          fontSize='small'
          sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}
        />
        <Box minWidth={0}>
          <Typography variant='body2' fontWeight={600} noWrap>
            {p.subject}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            noWrap
            display='block'
          >
            {p.from}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            display='block'
            sx={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {p.snippet}
          </Typography>
          <Typography
            variant='caption'
            color='text.disabled'
            display='block'
            mt={0.25}
          >
            {time}
          </Typography>
        </Box>
      </Box>
    )
  }

  if (event.type === 'calendar_event') {
    const p = event.payload
    const start = dayjs(p.start).format('MMM D, h:mm A')
    const end = dayjs(p.end).format('h:mm A')
    return (
      <Box display='flex' gap={1.5} alignItems='flex-start'>
        <CalendarTodayIcon
          fontSize='small'
          sx={{ color: 'secondary.main', mt: 0.25, flexShrink: 0 }}
        />
        <Box minWidth={0}>
          <Box display='flex' alignItems='center' gap={1}>
            <Typography variant='body2' fontWeight={600} noWrap>
              {p.summary}
            </Typography>
            {p.isInterview && (
              <Chip
                label='Interview'
                color='secondary'
                size='small'
                sx={{ height: 18, fontSize: '0.68rem' }}
              />
            )}
          </Box>
          <Typography variant='caption' color='text.secondary' display='block'>
            {start} – {end}
          </Typography>
          <Typography
            variant='caption'
            color='text.disabled'
            display='block'
            mt={0.25}
          >
            {time}
          </Typography>
        </Box>
      </Box>
    )
  }

  if (event.type === 'job_captured') {
    const p = event.payload
    return (
      <Box display='flex' gap={1.5} alignItems='flex-start'>
        <WorkOutlineIcon
          fontSize='small'
          sx={{ color: 'info.main', mt: 0.25, flexShrink: 0 }}
        />
        <Box minWidth={0}>
          <Typography variant='body2' fontWeight={600} noWrap>
            {p.title}
          </Typography>
          <Typography
            variant='caption'
            color='text.secondary'
            noWrap
            display='block'
          >
            <a
              href={p.url}
              target='_blank'
              rel='noopener noreferrer'
              style={{ color: 'inherit' }}
            >
              {p.url}
            </a>
          </Typography>
          <Typography
            variant='caption'
            color='text.disabled'
            display='block'
            mt={0.25}
          >
            {time}
          </Typography>
        </Box>
      </Box>
    )
  }

  if (event.type === 'new_pdf') {
    const p = event.payload
    const kb = Math.round(p.size / 1024)
    return (
      <Box display='flex' gap={1.5} alignItems='flex-start'>
        <PictureAsPdfIcon
          fontSize='small'
          sx={{ color: 'error.main', mt: 0.25, flexShrink: 0 }}
        />
        <Box minWidth={0}>
          <Typography variant='body2' fontWeight={600} noWrap>
            {p.filename}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {kb} KB
          </Typography>
          <Typography
            variant='caption'
            color='text.disabled'
            display='block'
            mt={0.25}
          >
            {time}
          </Typography>
        </Box>
      </Box>
    )
  }

  return null
}

export function AgentDialog({ open, onClose }: Props) {
  const { agentConnected, events } = useAgentSocket()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>
        <Box display='flex' alignItems='center' justifyContent='space-between'>
          Desktop Agent
          <Chip
            label={agentConnected ? 'Connected' : 'Not running'}
            color={agentConnected ? 'success' : 'default'}
            size='small'
            sx={{
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 },
              },
              animation: agentConnected
                ? 'pulse 2s ease-in-out infinite'
                : 'none',
            }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        {!agentConnected && events.length === 0 ? (
          <Box py={4} textAlign='center'>
            <Typography color='text.secondary' variant='body2'>
              Desktop agent is not connected.
            </Typography>
            <Typography color='text.secondary' variant='caption'>
              Start the desktop agent to receive real-time email, calendar, and
              job alerts.
            </Typography>
          </Box>
        ) : events.length === 0 ? (
          <Box py={4} textAlign='center'>
            <Typography color='text.secondary' variant='body2'>
              Connected — waiting for events.
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />} spacing={1.5} sx={{ pt: 0.5 }}>
            {events.map((event, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: events have no stable id
              <EventItem key={i} event={event} />
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  )
}
