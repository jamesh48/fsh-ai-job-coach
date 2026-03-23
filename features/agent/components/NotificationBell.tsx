'use client'

import CalendarTodayOutlinedIcon from '@mui/icons-material/CalendarTodayOutlined'
import CloseIcon from '@mui/icons-material/Close'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import {
  Badge,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Popover,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEffect, useRef, useState } from 'react'
import type {
  AgentCalendarClassification,
  AgentCalendarEvent,
  AgentEmail,
  AgentEmailClassification,
} from '@/features/ai/types'
import { useAgentSocket } from '@/lib/agentSocketContext'
import {
  useClearAgentCalendarEventsMutation,
  useClearAgentEmailsMutation,
  useDeleteAgentCalendarEventMutation,
  useDeleteAgentEmailMutation,
  useGetAgentCalendarEventsQuery,
  useGetAgentEmailsQuery,
} from '@/lib/api'

dayjs.extend(relativeTime)

const LS_KEY = 'lastSeenNotificationsAt'

const EMAIL_TYPE_LABEL: Record<AgentEmailClassification['type'], string> = {
  recruiter_intro: 'Recruiter',
  interview_request: 'Interview Request',
  interview_confirmation: 'Interview Confirmed',
  next_steps: 'Next Steps',
  availability_request: 'Availability',
  offer: 'Offer',
  rejection: 'Rejection',
  other: 'Other',
}

const EMAIL_TYPE_COLOR: Record<
  AgentEmailClassification['type'],
  'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'default'
> = {
  recruiter_intro: 'primary',
  interview_request: 'secondary',
  interview_confirmation: 'secondary',
  next_steps: 'primary',
  availability_request: 'primary',
  offer: 'success',
  rejection: 'error',
  other: 'default',
}

const CAL_TYPE_LABEL: Record<AgentCalendarClassification['type'], string> = {
  phone_screen: 'Phone Screen',
  technical_interview: 'Technical Interview',
  onsite: 'Onsite',
  recruiter_call: 'Recruiter Call',
  hiring_manager_call: 'Hiring Manager',
  offer_discussion: 'Offer Discussion',
  reference_check: 'Reference Check',
  other: 'Other',
}

const CAL_TYPE_COLOR: Record<
  AgentCalendarClassification['type'],
  'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'default'
> = {
  phone_screen: 'primary',
  technical_interview: 'secondary',
  onsite: 'secondary',
  recruiter_call: 'primary',
  hiring_manager_call: 'primary',
  offer_discussion: 'success',
  reference_check: 'warning',
  other: 'default',
}

// --- Email detail dialog ---

function EmailDetailDialog({
  email,
  onClose,
}: {
  email: AgentEmail
  onClose: () => void
}) {
  const classification = email.classification as AgentEmailClassification | null
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle sx={{ pr: 6 }}>
        <Box display='flex' alignItems='flex-start' gap={1.5} flexWrap='wrap'>
          <EmailOutlinedIcon
            sx={{ color: 'primary.main', mt: 0.25, flexShrink: 0 }}
          />
          <Box flex={1} minWidth={0}>
            <Typography variant='h6' fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {email.subject}
            </Typography>
            {classification && (
              <Box mt={0.75}>
                <Chip
                  label={
                    EMAIL_TYPE_LABEL[classification.type] ?? classification.type
                  }
                  color={EMAIL_TYPE_COLOR[classification.type] ?? 'default'}
                  size='small'
                />
              </Box>
            )}
          </Box>
        </Box>
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              display='block'
            >
              From
            </Typography>
            <Typography variant='body2'>{email.sender}</Typography>
          </Box>
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              display='block'
            >
              Received
            </Typography>
            <Typography variant='body2'>
              {dayjs(email.receivedAt).format('MMMM D, YYYY [at] h:mm A')}{' '}
              <Typography
                component='span'
                variant='caption'
                color='text.secondary'
              >
                ({dayjs(email.receivedAt).fromNow()})
              </Typography>
            </Typography>
          </Box>
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              display='block'
            >
              Preview
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
            >
              {email.snippet}
            </Typography>
          </Box>
          {classification && (
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                display='block'
              >
                Why this was flagged
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {classification.reason}
              </Typography>
            </Box>
          )}
          <Box>
            <Link
              href={`https://mail.google.com/mail/u/0/#inbox/${email.threadId}`}
              target='_blank'
              rel='noopener noreferrer'
              underline='hover'
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              <OpenInNewIcon sx={{ fontSize: 14 }} />
              Open in Gmail
            </Link>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

// --- Calendar event detail dialog ---

function CalendarDetailDialog({
  event,
  onClose,
}: {
  event: AgentCalendarEvent
  onClose: () => void
}) {
  const classification =
    event.classification as AgentCalendarClassification | null
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle sx={{ pr: 6 }}>
        <Box display='flex' alignItems='flex-start' gap={1.5} flexWrap='wrap'>
          <CalendarTodayOutlinedIcon
            sx={{ color: 'secondary.main', mt: 0.25, flexShrink: 0 }}
          />
          <Box flex={1} minWidth={0}>
            <Typography variant='h6' fontWeight={700} sx={{ lineHeight: 1.3 }}>
              {event.summary}
            </Typography>
            {classification && (
              <Box mt={0.75}>
                <Chip
                  label={
                    CAL_TYPE_LABEL[classification.type] ?? classification.type
                  }
                  color={CAL_TYPE_COLOR[classification.type] ?? 'default'}
                  size='small'
                />
              </Box>
            )}
          </Box>
        </Box>
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>
        <Stack spacing={2.5}>
          {event.start && (
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                display='block'
              >
                When
              </Typography>
              <Typography variant='body2'>
                {dayjs(event.start).format('MMMM D, YYYY [at] h:mm A')}
                {event.end && ` – ${dayjs(event.end).format('h:mm A')}`}
              </Typography>
            </Box>
          )}
          {event.organizer && (
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                display='block'
              >
                Organizer
              </Typography>
              <Typography variant='body2'>{event.organizer}</Typography>
            </Box>
          )}
          {event.description && (
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                display='block'
              >
                Description
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}
              >
                {event.description}
              </Typography>
            </Box>
          )}
          {classification && (
            <Box>
              <Typography
                variant='overline'
                color='text.secondary'
                display='block'
              >
                Why this was flagged
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {classification.reason}
              </Typography>
            </Box>
          )}
          <Box>
            <Typography
              variant='overline'
              color='text.secondary'
              display='block'
            >
              Detected
            </Typography>
            <Typography variant='body2'>
              {dayjs(event.receivedAt).format('MMMM D, YYYY [at] h:mm A')}{' '}
              <Typography
                component='span'
                variant='caption'
                color='text.secondary'
              >
                ({dayjs(event.receivedAt).fromNow()})
              </Typography>
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  )
}

// --- Email list item ---

function EmailItem({
  email,
  isUnread,
  onOpen,
  onDismiss,
}: {
  email: AgentEmail
  isUnread: boolean
  onOpen: () => void
  onDismiss: () => void
}) {
  const classification = email.classification as AgentEmailClassification | null
  return (
    <Box display='flex' gap={1.5} alignItems='flex-start' sx={{ py: 0.75 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: isUnread ? 'primary.main' : 'transparent',
          mt: 0.75,
          flexShrink: 0,
        }}
      />
      <EmailOutlinedIcon
        fontSize='small'
        sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}
      />
      <Box minWidth={0} flex={1}>
        <Box display='flex' alignItems='flex-start' gap={0.5}>
          <Typography
            variant='body2'
            fontWeight={isUnread ? 700 : 500}
            sx={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}
          >
            {email.subject}
          </Typography>
          {classification && (
            <Chip
              label={
                EMAIL_TYPE_LABEL[classification.type] ?? classification.type
              }
              color={EMAIL_TYPE_COLOR[classification.type] ?? 'default'}
              size='small'
              sx={{ height: 18, fontSize: '0.68rem', flexShrink: 0 }}
            />
          )}
          <Tooltip title='Dismiss'>
            <IconButton
              size='small'
              onClick={onDismiss}
              sx={{ flexShrink: 0, mt: -0.25 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Typography
          variant='caption'
          color='text.secondary'
          noWrap
          display='block'
        >
          {email.sender}
        </Typography>
        <Typography
          variant='caption'
          color='text.secondary'
          display='block'
          sx={{
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            mt: 0.25,
            lineHeight: 1.5,
          }}
        >
          {email.snippet}
        </Typography>
        {classification?.reason && (
          <Typography
            variant='caption'
            color='text.secondary'
            display='block'
            sx={{
              mt: 0.25,
              fontStyle: 'italic',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {classification.reason}
          </Typography>
        )}
        <Box
          display='flex'
          alignItems='center'
          justifyContent='space-between'
          mt={0.5}
        >
          <Typography variant='caption' color='text.secondary'>
            {dayjs(email.receivedAt).fromNow()}
          </Typography>
          <Link
            component='button'
            variant='caption'
            onClick={onOpen}
            underline='hover'
            sx={{ color: 'primary.main', cursor: 'pointer', lineHeight: 1 }}
          >
            View details
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

// --- Calendar event list item ---

function CalendarItem({
  event,
  isUnread,
  onOpen,
  onDismiss,
}: {
  event: AgentCalendarEvent
  isUnread: boolean
  onOpen: () => void
  onDismiss: () => void
}) {
  const classification =
    event.classification as AgentCalendarClassification | null
  return (
    <Box display='flex' gap={1.5} alignItems='flex-start' sx={{ py: 0.75 }}>
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: isUnread ? 'secondary.main' : 'transparent',
          mt: 0.75,
          flexShrink: 0,
        }}
      />
      <CalendarTodayOutlinedIcon
        fontSize='small'
        sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}
      />
      <Box minWidth={0} flex={1}>
        <Box display='flex' alignItems='flex-start' gap={0.5}>
          <Typography
            variant='body2'
            fontWeight={isUnread ? 700 : 500}
            sx={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}
          >
            {event.summary}
          </Typography>
          {classification && (
            <Chip
              label={CAL_TYPE_LABEL[classification.type] ?? classification.type}
              color={CAL_TYPE_COLOR[classification.type] ?? 'default'}
              size='small'
              sx={{ height: 18, fontSize: '0.68rem', flexShrink: 0 }}
            />
          )}
          <Tooltip title='Dismiss'>
            <IconButton
              size='small'
              onClick={onDismiss}
              sx={{ flexShrink: 0, mt: -0.25 }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
        {event.start && (
          <Typography variant='caption' color='text.secondary' display='block'>
            {dayjs(event.start).format('MMM D [at] h:mm A')}
            {event.end && ` – ${dayjs(event.end).format('h:mm A')}`}
          </Typography>
        )}
        {event.organizer && (
          <Typography
            variant='caption'
            color='text.secondary'
            noWrap
            display='block'
          >
            {event.organizer}
          </Typography>
        )}
        {classification?.reason && (
          <Typography
            variant='caption'
            color='text.secondary'
            display='block'
            sx={{
              mt: 0.25,
              fontStyle: 'italic',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {classification.reason}
          </Typography>
        )}
        <Box
          display='flex'
          alignItems='center'
          justifyContent='space-between'
          mt={0.5}
        >
          <Typography variant='caption' color='text.secondary'>
            {dayjs(event.receivedAt).fromNow()}
          </Typography>
          <Link
            component='button'
            variant='caption'
            onClick={onOpen}
            underline='hover'
            sx={{ color: 'secondary.main', cursor: 'pointer', lineHeight: 1 }}
          >
            View details
          </Link>
        </Box>
      </Box>
    </Box>
  )
}

// --- Main bell ---

export function NotificationBell() {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(0)
  const [selectedEmail, setSelectedEmail] = useState<AgentEmail | null>(null)
  const [selectedCalEvent, setSelectedCalEvent] =
    useState<AgentCalendarEvent | null>(null)
  const [lastSeen, setLastSeen] = useState<string | null>(null)

  const { data: emails = [], refetch: refetchEmails } = useGetAgentEmailsQuery()
  const { data: calEvents = [], refetch: refetchCalEvents } =
    useGetAgentCalendarEventsQuery()
  const [deleteEmail] = useDeleteAgentEmailMutation()
  const [clearEmails] = useClearAgentEmailsMutation()
  const [deleteCalEvent] = useDeleteAgentCalendarEventMutation()
  const [clearCalEvents] = useClearAgentCalendarEventsMutation()
  const { lastEvent, status } = useAgentSocket()

  useEffect(() => {
    setLastSeen(localStorage.getItem(LS_KEY))
  }, [])

  useEffect(() => {
    if (lastEvent?.type === 'email_detected') refetchEmails()
    if (lastEvent?.type === 'calendar_event') refetchCalEvents()
  }, [lastEvent, refetchEmails, refetchCalEvents])

  // Catch up on any events missed while the WebSocket was disconnected
  useEffect(() => {
    if (status === 'connected') {
      refetchEmails()
      refetchCalEvents()
    }
  }, [status, refetchEmails, refetchCalEvents])

  const unreadEmails = emails.filter(
    (e) => !lastSeen || new Date(e.receivedAt) > new Date(lastSeen),
  ).length
  const unreadCal = calEvents.filter(
    (e) => !lastSeen || new Date(e.receivedAt) > new Date(lastSeen),
  ).length
  const totalUnread = unreadEmails + unreadCal

  function handleOpen() {
    setOpen(true)
    refetchEmails()
    refetchCalEvents()
    const now = new Date().toISOString()
    localStorage.setItem(LS_KEY, now)
    setLastSeen(now)
  }

  const activeList = tab === 0 ? emails : calEvents
  const activeClear = tab === 0 ? clearEmails : clearCalEvents

  return (
    <>
      <Tooltip title='Notifications'>
        <IconButton
          size='small'
          ref={anchorRef}
          onClick={handleOpen}
          sx={{ '&:hover': { color: 'primary.main' } }}
        >
          <Badge badgeContent={totalUnread} color='error' max={99}>
            <NotificationsNoneIcon fontSize='small' />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => {
          setOpen(false)
          setTab(0)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 460,
              maxHeight: 600,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box
          px={2}
          pt={2}
          pb={0}
          flexShrink={0}
          display='flex'
          alignItems='flex-start'
          justifyContent='space-between'
        >
          <Typography variant='subtitle1' fontWeight={700}>
            Notifications
          </Typography>
          {activeList.length > 0 && (
            <Tooltip title='Clear all'>
              <IconButton
                size='small'
                onClick={() => activeClear()}
                sx={{ mt: -0.5 }}
              >
                <DeleteSweepIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, flexShrink: 0 }}
          slotProps={{ indicator: { style: { height: 2 } } }}
        >
          <Tab
            label={
              <Box display='flex' alignItems='center' gap={0.75}>
                <EmailOutlinedIcon sx={{ fontSize: 15 }} />
                Emails
                {unreadEmails > 0 && (
                  <Badge
                    badgeContent={unreadEmails}
                    color='error'
                    max={99}
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            }
            sx={{ fontSize: '0.8rem', minHeight: 40 }}
          />
          <Tab
            label={
              <Box display='flex' alignItems='center' gap={0.75}>
                <CalendarTodayOutlinedIcon sx={{ fontSize: 15 }} />
                Calendar
                {unreadCal > 0 && (
                  <Badge
                    badgeContent={unreadCal}
                    color='error'
                    max={99}
                    sx={{ ml: 0.5 }}
                  />
                )}
              </Box>
            }
            sx={{ fontSize: '0.8rem', minHeight: 40 }}
          />
        </Tabs>

        <Divider />

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {tab === 0 &&
            (emails.length === 0 ? (
              <Box py={5} textAlign='center' px={2}>
                <Typography variant='body2' color='text.secondary'>
                  No email notifications yet.
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Relevant emails detected by the desktop agent will appear
                  here.
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />} sx={{ px: 1.5, py: 1 }}>
                {emails.map((email) => (
                  <EmailItem
                    key={email.id}
                    email={email}
                    isUnread={
                      !lastSeen ||
                      new Date(email.receivedAt) > new Date(lastSeen)
                    }
                    onOpen={() => {
                      setOpen(false)
                      setSelectedEmail(email)
                    }}
                    onDismiss={() => deleteEmail(email.id)}
                  />
                ))}
              </Stack>
            ))}

          {tab === 1 &&
            (calEvents.length === 0 ? (
              <Box py={5} textAlign='center' px={2}>
                <Typography variant='body2' color='text.secondary'>
                  No calendar notifications yet.
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  Job search calendar events detected by the desktop agent will
                  appear here.
                </Typography>
              </Box>
            ) : (
              <Stack divider={<Divider />} sx={{ px: 1.5, py: 1 }}>
                {calEvents.map((evt) => (
                  <CalendarItem
                    key={evt.id}
                    event={evt}
                    isUnread={
                      !lastSeen || new Date(evt.receivedAt) > new Date(lastSeen)
                    }
                    onOpen={() => {
                      setOpen(false)
                      setSelectedCalEvent(evt)
                    }}
                    onDismiss={() => deleteCalEvent(evt.id)}
                  />
                ))}
              </Stack>
            ))}
        </Box>
      </Popover>

      {selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
        />
      )}
      {selectedCalEvent && (
        <CalendarDetailDialog
          event={selectedCalEvent}
          onClose={() => setSelectedCalEvent(null)}
        />
      )}
    </>
  )
}
