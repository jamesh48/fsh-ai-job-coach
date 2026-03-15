'use client'

import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useAiAssistMutation } from '@/lib/api'

interface JobContext {
  jobTitle?: string
  company?: string
  roleDescription?: string
}

interface Props {
  open: boolean
  onClose: () => void
  jobContext?: JobContext
}

export function AiAssistDialog({ open, onClose, jobContext }: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [aiAssist, { isLoading }] = useAiAssistMutation()

  useEffect(() => {
    if (!open) {
      setPrompt('')
      setResponse('')
    }
  }, [open])

  async function handleSubmit() {
    if (!prompt.trim()) return
    const result = await aiAssist({ prompt, jobContext })
    if (!('error' in result) && result.data) {
      setResponse(result.data.response)
    } else {
      enqueueSnackbar(
        'error' in result
          ? String(
              (result.error as { data?: { error?: string } }).data?.error ??
                'Failed to get a response.',
            )
          : 'Failed to get a response.',
        { variant: 'error' },
      )
    }
  }

  const hasJobContext = jobContext?.jobTitle && jobContext?.company

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth='md'
      PaperProps={{ sx: { minHeight: '75vh' } }}
    >
      <DialogTitle sx={{ pb: hasJobContext ? 1 : undefined }}>
        AI Writing Assistant
      </DialogTitle>

      <DialogContent sx={{ pt: '1.5rem !important' }}>
        {hasJobContext && (
          <Box sx={{ mb: 2 }}>
            <Chip
              size='small'
              label={`${jobContext.jobTitle} @ ${jobContext.company}`}
              color='secondary'
              variant='outlined'
            />
          </Box>
        )}

        <TextField
          label='What do you need help with?'
          multiline
          rows={24}
          fullWidth
          placeholder={
            hasJobContext
              ? 'e.g. Write a cover letter for this role, give me feedback on my answer to "Tell me about yourself", draft a follow-up email…'
              : 'e.g. Help me write a cover letter for a senior engineer role at Acme, give me feedback on this answer…'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        {response && (
          <Box
            sx={{
              mt: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              px: 2,
              pt: 1,
              pb: 2,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
              }}
            >
              <Typography variant='caption' color='text.secondary'>
                Response
              </Typography>
              <Tooltip title='Copy to clipboard'>
                <IconButton
                  size='small'
                  onClick={() => {
                    navigator.clipboard.writeText(response)
                    enqueueSnackbar('Copied to clipboard.', {
                      variant: 'success',
                    })
                  }}
                >
                  <ContentCopyIcon fontSize='small' />
                </IconButton>
              </Tooltip>
            </Box>
            <Box
              sx={{
                '& p': { margin: 0, mb: 1 },
                '& h1, & h2, & h3': { mt: 1.5, mb: 0.5 },
                '& ul, & ol': { pl: 2.5, mb: 1 },
                '& li': { mb: 0.25 },
                typography: 'body2',
              }}
            >
              <ReactMarkdown>{response}</ReactMarkdown>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color='inherit' variant='outlined'>
          Close
        </Button>
        <Button
          variant='contained'
          startIcon={
            isLoading ? (
              <CircularProgress size={14} color='inherit' />
            ) : (
              <AutoFixHighIcon fontSize='small' />
            )
          }
          onClick={handleSubmit}
          disabled={isLoading || !prompt.trim()}
        >
          {isLoading ? 'Thinking…' : 'Ask Claude'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
