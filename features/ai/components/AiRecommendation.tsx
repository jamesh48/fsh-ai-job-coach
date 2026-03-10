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
import {
  useGetAiRecommendationMutation,
  useGetStoredRecommendationQuery,
} from '@/lib/api'
import { useWebUsbPrinter } from '../hooks/useWebUsbPrinter'

interface Props {
  collapsed: boolean
  onToggle: () => void
}

export function AiRecommendation({ collapsed, onToggle }: Props) {
  const { data: storedData } = useGetStoredRecommendationQuery()
  const [getRecommendation, { data: freshData, isLoading, error }] =
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

  const recommendation =
    freshData?.recommendation ?? storedData?.recommendation ?? null
  const recommendationDate = freshData
    ? dayjs().format('YYYY-MM-DD')
    : (storedData?.date ?? null)

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
        borderRadius: '12px 12px 0 0',
        background: (theme) =>
          `linear-gradient(160deg, ${theme.palette.secondary.light}22 0%, ${theme.palette.background.paper} 100%)`,
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
            <AutoAwesomeIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
            <Typography
              variant='overline'
              fontWeight={700}
              letterSpacing={1.2}
              sx={{ color: 'secondary.main', lineHeight: 1 }}
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
                      onClick={() => recommendation && print(recommendation)}
                      disabled={!recommendation || printing}
                      sx={{ color: 'secondary.main' }}
                    >
                      {printing ? (
                        <CircularProgress
                          size={14}
                          sx={{ color: 'secondary.main' }}
                        />
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
                    <CircularProgress
                      size={12}
                      sx={{ color: 'secondary.main' }}
                    />
                  ) : (
                    <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                  )
                }
                onClick={() =>
                  getRecommendation({ date: dayjs().format('YYYY-MM-DD') })
                }
                disabled={isLoading}
                color='secondary'
              >
                {isLoading
                  ? 'Thinking…'
                  : recommendation
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
                sx={{ color: 'secondary.main' }}
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

          {!recommendation && !isLoading && !errorMessage && (
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

          {recommendation && !isLoading && (
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
              <ReactMarkdown>{recommendation}</ReactMarkdown>
            </Box>
          )}
        </Box>
      </Box>

      {/* Pinned footer */}
      <Box sx={{ flexShrink: 0, px: 2 }}>
        <Divider />
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='center'
          py={1}
        >
          <Typography variant='caption' color='text.disabled'>
            Powered by Claude
          </Typography>
          {recommendationDate && (
            <Typography variant='caption' color='text.disabled'>
              Last updated {recommendationDate}
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  )
}
