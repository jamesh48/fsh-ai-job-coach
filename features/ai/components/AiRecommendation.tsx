'use client'

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PrintIcon from '@mui/icons-material/Print'
import UsbIcon from '@mui/icons-material/Usb'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import ReactMarkdown from 'react-markdown'
import { useGetAiRecommendationMutation } from '@/lib/api'
import { useWebUsbPrinter } from '../hooks/useWebUsbPrinter'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AiRecommendation({ collapsed, onToggle }: Props) {
  const [getRecommendation, { data, isLoading, error }] =
    useGetAiRecommendationMutation()
  const {
    printer,
    connecting,
    printing,
    error: printerError,
    isSupported,
    connect,
    print,
  } = useWebUsbPrinter()

  const errorMessage = (() => {
    if (!error) return null
    if (
      'data' in error &&
      error.data &&
      typeof error.data === 'object' &&
      'error' in error.data
    )
      return (error.data as { error: string }).error
    if ('error' in error && typeof error.error === 'string') return error.error
    return 'Failed to reach the AI service. Please try again.'
  })()

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        maxWidth: 640,
        height: '100%',
        borderRadius: 0,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(160deg, #1a1130 0%, #0d0d0d 100%)'
            : 'linear-gradient(160deg, #f3eeff 0%, #fafafa 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          borderBottom: collapsed ? 'none' : '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Box
          display='flex'
          alignItems='center'
          justifyContent='space-between'
          px={2}
          py={1.5}
        >
          <Box display='flex' alignItems='center' gap={1}>
            <AutoAwesomeIcon sx={{ fontSize: 16, color: '#9c6fde' }} />
            <Typography
              variant='overline'
              fontWeight={700}
              letterSpacing={1.2}
              sx={{ color: '#9c6fde', lineHeight: 1 }}
            >
              AI Coach
            </Typography>
          </Box>

          <Box display='flex' alignItems='center' gap={1}>
            {!collapsed &&
              isSupported &&
              (printer ? (
                <Tooltip title={printing ? 'Printing…' : 'Print via USB'}>
                  <span>
                    <IconButton
                      size='small'
                      onClick={() => data && print(data.recommendation)}
                      disabled={!data || printing}
                      sx={{ color: '#9c6fde' }}
                    >
                      {printing ? (
                        <CircularProgress size={14} sx={{ color: '#9c6fde' }} />
                      ) : (
                        <PrintIcon fontSize='small' />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              ) : (
                <Tooltip title='Connect USB printer'>
                  <span>
                    <IconButton
                      size='small'
                      onClick={connect}
                      disabled={connecting}
                      sx={{ color: 'text.disabled' }}
                    >
                      {connecting ? (
                        <CircularProgress size={14} />
                      ) : (
                        <UsbIcon fontSize='small' />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              ))}

            {!collapsed && (
              <Button
                size='small'
                variant='outlined'
                startIcon={
                  isLoading ? (
                    <CircularProgress size={12} sx={{ color: '#9c6fde' }} />
                  ) : (
                    <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                  )
                }
                onClick={() =>
                  getRecommendation({ date: dayjs().format('YYYY-MM-DD') })
                }
                disabled={isLoading}
                sx={{
                  borderColor: '#9c6fde',
                  color: '#9c6fde',
                  '&:hover': {
                    borderColor: '#7c4fbf',
                    background: 'rgba(156,111,222,0.06)',
                  },
                }}
              >
                {isLoading
                  ? 'Thinking…'
                  : data
                    ? 'Refresh'
                    : errorMessage
                      ? 'Retry'
                      : 'Get Advice'}
              </Button>
            )}

            <Tooltip title={collapsed ? 'Expand' : 'Collapse'}>
              <IconButton
                size='small'
                onClick={onToggle}
                sx={{ color: '#9c6fde' }}
              >
                {collapsed ? (
                  <ExpandLessIcon fontSize='small' />
                ) : (
                  <ExpandMoreIcon fontSize='small' />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ overflowY: 'auto', flex: 1 }}>
        <Box px={2} py={2}>
          {errorMessage && (
            <Alert severity='error' sx={{ mb: 1.5 }}>
              {errorMessage}
            </Alert>
          )}

          {printerError && (
            <Alert severity='warning' sx={{ mb: 1.5 }}>
              {printerError}
            </Alert>
          )}

          {!data && !isLoading && !errorMessage && (
            <Typography
              variant='body2'
              color='text.secondary'
              fontStyle='italic'
            >
              Click "Get Advice" to receive a personalized next-step
              recommendation based on your job search activity.
            </Typography>
          )}

          {isLoading && (
            <Typography
              variant='body2'
              color='text.secondary'
              fontStyle='italic'
            >
              Analyzing your job search activity…
            </Typography>
          )}

          {data && !isLoading && (
            <Box
              sx={{
                '& p': { m: 0, mb: 1, fontSize: '0.875rem', lineHeight: 1.7 },
                '& p:last-child': { mb: 0 },
                '& ul, & ol': {
                  mt: 0,
                  mb: 1,
                  pl: 2.5,
                  fontSize: '0.875rem',
                  lineHeight: 1.7,
                },
                '& li': { mb: 0.5 },
                '& strong': { fontWeight: 600 },
              }}
            >
              <ReactMarkdown>{data.recommendation}</ReactMarkdown>
            </Box>
          )}
        </Box>
      </Box>

      {/* Pinned footer */}
      <Box sx={{ flexShrink: 0, px: 2 }}>
        <Divider />
        <Typography
          variant='caption'
          color='text.disabled'
          display='block'
          py={1}
        >
          Powered by Claude
        </Typography>
      </Box>
    </Paper>
  )
}
