'use client'

import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import BookmarkAddIcon from '@mui/icons-material/BookmarkAdd'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { MagicWandIcon } from '@phosphor-icons/react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { AppDocument } from '@/features/logs/applicationFormUtils'
import { DOCUMENT_LABEL_OPTIONS } from '@/features/logs/applicationFormUtils'
import { useAiAssistMutation } from '@/lib/api'

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'ordered'; text: string; n: number }
  | { type: 'paragraph'; text: string }
  | { type: 'blank' }

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = []
  let paraLines: string[] = []

  function flushPara() {
    const text = paraLines.join(' ').trim()
    if (text) blocks.push({ type: 'paragraph', text })
    paraLines = []
  }

  for (const line of markdown.split('\n')) {
    if (line.startsWith('# ')) {
      flushPara()
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
    } else if (line.startsWith('## ')) {
      flushPara()
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
    } else if (line.startsWith('### ')) {
      flushPara()
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
    } else if (/^[-*] /.test(line)) {
      flushPara()
      blocks.push({ type: 'bullet', text: line.slice(2).trim() })
    } else if (/^\d+\. /.test(line)) {
      flushPara()
      const m = line.match(/^(\d+)\. (.+)/)
      if (m)
        blocks.push({ type: 'ordered', n: Number(m[1]), text: m[2].trim() })
    } else if (line.trim() === '') {
      flushPara()
      blocks.push({ type: 'blank' })
    } else {
      paraLines.push(line)
    }
  }
  flushPara()
  return blocks
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
}

async function downloadAsPdf(markdown: string, filename: string) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const marginX = 22
  const marginY = 22
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const contentW = pageW - marginX * 2
  let y = marginY

  function need(mm: number) {
    if (y + mm > pageH - marginY) {
      doc.addPage()
      y = marginY
    }
  }

  function renderText(
    text: string,
    fontSize: number,
    fontStyle: 'normal' | 'bold',
    indent = 0,
    afterMm = 2,
  ) {
    doc.setFontSize(fontSize)
    doc.setFont('times', fontStyle)
    const lines = doc.splitTextToSize(stripInline(text), contentW - indent)
    const lineH = fontSize * 0.3528 * 1.4
    need(lines.length * lineH + afterMm)
    doc.text(lines, marginX + indent, y)
    y += lines.length * lineH + afterMm
  }

  for (const block of parseBlocks(markdown)) {
    switch (block.type) {
      case 'h1':
        renderText(block.text, 18, 'bold', 0, 4)
        break
      case 'h2':
        renderText(block.text, 14, 'bold', 0, 3)
        break
      case 'h3':
        renderText(block.text, 12, 'bold', 0, 2)
        break
      case 'bullet':
        renderText(`\u2022  ${block.text}`, 11, 'normal', 4, 1.5)
        break
      case 'ordered':
        renderText(`${block.n}.  ${block.text}`, 11, 'normal', 4, 1.5)
        break
      case 'paragraph':
        renderText(block.text, 11, 'normal', 0, 1.5)
        break
      case 'blank':
        y += 1.5
        break
    }
  }

  doc.save(`${filename}.pdf`)
}

interface JobContext {
  jobTitle?: string
  company?: string
  roleDescription?: string
}

interface Props {
  open: boolean
  onClose: () => void
  jobContext?: JobContext
  documents?: AppDocument[]
  onSaveDocument?: (doc: AppDocument) => Promise<void>
  onUpdateDocument?: (doc: AppDocument) => Promise<void>
  onDeleteDocument?: (docId: string) => Promise<void>
}

export function AiAssistDialog({
  open,
  onClose,
  jobContext,
  documents,
  onSaveDocument,
  onUpdateDocument,
  onDeleteDocument,
}: Props) {
  const { enqueueSnackbar } = useSnackbar()
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [filename, setFilename] = useState('ai-response')
  const [saveLabel, setSaveLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<AppDocument | null>(null)
  const [editContent, setEditContent] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<AppDocument | null>(
    null,
  )
  const [aiAssist, { isLoading }] = useAiAssistMutation()

  useEffect(() => {
    if (!open) {
      setPrompt('')
      setResponse('')
      setFilename('ai-response')
      setSaveLabel('')
      setViewingDoc(null)
      setEditContent(null)
      setConfirmDeleteDoc(null)
    }
  }, [open])

  function closeViewer() {
    setViewingDoc(null)
    setEditContent(null)
  }

  async function handleSaveEdit() {
    if (!onUpdateDocument || !viewingDoc || editContent === null) return
    setSavingEdit(true)
    try {
      const updated = { ...viewingDoc, content: editContent }
      await onUpdateDocument(updated)
      setViewingDoc(updated)
      setEditContent(null)
    } catch {
      enqueueSnackbar('Failed to save document.', { variant: 'error' })
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleConfirmDelete() {
    if (!onDeleteDocument || !confirmDeleteDoc) return
    setDeletingId(confirmDeleteDoc.id)
    setConfirmDeleteDoc(null)
    try {
      await onDeleteDocument(confirmDeleteDoc.id)
    } catch {
      enqueueSnackbar('Failed to delete document.', { variant: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSave() {
    if (!onSaveDocument || !saveLabel.trim()) return
    setSaving(true)
    try {
      await onSaveDocument({
        id: crypto.randomUUID(),
        label: saveLabel.trim(),
        content: response,
        createdAt: new Date().toISOString(),
      })
      enqueueSnackbar('Saved to application.', { variant: 'success' })
      setSaveLabel('')
    } catch {
      enqueueSnackbar('Failed to save document.', { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit() {
    if (!prompt.trim()) return
    try {
      const data = await aiAssist({ prompt, jobContext }).unwrap()
      setResponse(data.response)
      setFilename(data.filename)
    } catch (err) {
      enqueueSnackbar(
        (err as { data?: { error?: string } }).data?.error ??
          'Failed to get a response.',
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
      slotProps={{ paper: { sx: { minHeight: '75vh' } } }}
    >
      <DialogTitle sx={{ pb: hasJobContext ? 1 : undefined, pr: 6 }}>
        AI Writing Assistant
        <IconButton
          size='small'
          onClick={onClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
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
          rows={8}
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

        {isLoading && (
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
            <Skeleton width='35%' height={16} sx={{ mb: 1.5 }} />
            <Skeleton height={14} />
            <Skeleton height={14} />
            <Skeleton width='90%' height={14} sx={{ mb: 1.5 }} />
            <Skeleton height={14} />
            <Skeleton width='80%' height={14} sx={{ mb: 1.5 }} />
            <Skeleton height={14} />
            <Skeleton width='75%' height={14} />
          </Box>
        )}

        {!isLoading && response && (
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
              <Box display='flex' gap={0.5}>
                <Tooltip title={`Download as PDF (${filename}.pdf)`}>
                  <IconButton
                    size='small'
                    onClick={() => downloadAsPdf(response, filename)}
                  >
                    <DownloadIcon fontSize='small' />
                  </IconButton>
                </Tooltip>
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
            </Box>
            <Box
              onCopy={(e) => {
                const selection = window.getSelection()
                if (!selection || selection.isCollapsed) return
                e.preventDefault()
                e.clipboardData.setData('text/plain', selection.toString())
              }}
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                '& p': { mt: 0, mb: 1.5 },
                '& p:last-child': { mb: 0 },
                '& h1': { fontSize: '1.25rem', fontWeight: 700, mt: 2, mb: 1 },
                '& h2': {
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  mt: 2,
                  mb: 0.75,
                },
                '& h3': {
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  mt: 1.5,
                  mb: 0.5,
                },
                '& ul, & ol': { pl: 2.5, mt: 0, mb: 1.5 },
                '& li': { mb: 0.5 },
                '& strong': { fontWeight: 700 },
                '& em': { fontStyle: 'italic' },
                '& code': {
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  bgcolor: 'action.hover',
                  px: 0.5,
                  borderRadius: 0.5,
                },
                '& blockquote': {
                  borderLeft: '3px solid',
                  borderColor: 'divider',
                  pl: 1.5,
                  ml: 0,
                  color: 'text.secondary',
                },
              }}
            >
              <ReactMarkdown>{response}</ReactMarkdown>
            </Box>

            {!!onSaveDocument && (
              <Stack direction='row' spacing={1} alignItems='center' mt={2}>
                <Autocomplete
                  freeSolo
                  size='small'
                  options={DOCUMENT_LABEL_OPTIONS}
                  value={saveLabel}
                  onInputChange={(_, val) => setSaveLabel(val)}
                  sx={{ width: 220 }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label='Save as…'
                      placeholder='Cover Letter'
                    />
                  )}
                />
                <Button
                  size='small'
                  variant='outlined'
                  startIcon={<BookmarkAddIcon fontSize='small' />}
                  disabled={!saveLabel.trim() || saving}
                  onClick={handleSave}
                >
                  {saving ? 'Saving…' : 'Save to Application'}
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {hasJobContext && !!documents?.length && (
          <Box mt={2}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ mb: 1, display: 'block' }}
            >
              Saved Documents
            </Typography>
            <Stack spacing={0.5}>
              {documents.map((doc) => (
                <Box
                  key={doc.id}
                  display='flex'
                  alignItems='center'
                  gap={1}
                  sx={{
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ArticleOutlinedIcon
                    sx={{
                      fontSize: 16,
                      color: 'text.secondary',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    variant='body2'
                    sx={{
                      flex: 1,
                      cursor: 'pointer',
                      '&:hover': { color: 'primary.main' },
                    }}
                    onClick={() => setViewingDoc(doc)}
                  >
                    {doc.label}
                  </Typography>
                  {onDeleteDocument && (
                    <Tooltip title='Delete'>
                      <IconButton
                        size='small'
                        disabled={deletingId === doc.id}
                        onClick={() => setConfirmDeleteDoc(doc)}
                        sx={{ '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutlineIcon fontSize='small' />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>

      <Dialog
        open={!!viewingDoc}
        onClose={closeViewer}
        fullWidth
        maxWidth='md'
        slotProps={{ paper: { sx: { minHeight: '60vh' } } }}
      >
        <DialogTitle sx={{ pr: 6 }}>
          {viewingDoc?.label}
          {editContent === null && (
            <Tooltip title='Edit'>
              <IconButton
                size='small'
                onClick={() => setEditContent(viewingDoc?.content ?? '')}
                sx={{ position: 'absolute', top: 12, right: 44 }}
              >
                <EditOutlinedIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size='small'
            onClick={closeViewer}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editContent !== null ? (
            <TextField
              multiline
              fullWidth
              minRows={12}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              slotProps={{
                input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } },
              }}
            />
          ) : (
            <Box
              onClick={() => setEditContent(viewingDoc?.content ?? '')}
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                cursor: 'text',
                '& p': { mt: 0, mb: 1.5 },
                '& p:last-child': { mb: 0 },
                '& h1': { fontSize: '1.25rem', fontWeight: 700, mt: 2, mb: 1 },
                '& h2': {
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  mt: 2,
                  mb: 0.75,
                },
                '& h3': {
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  mt: 1.5,
                  mb: 0.5,
                },
                '& ul, & ol': { pl: 2.5, mt: 0, mb: 1.5 },
                '& li': { mb: 0.5 },
                '& strong': { fontWeight: 700 },
                '& em': { fontStyle: 'italic' },
              }}
            >
              <ReactMarkdown>{viewingDoc?.content ?? ''}</ReactMarkdown>
            </Box>
          )}
        </DialogContent>
        {editContent !== null && (
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setEditContent(null)}
              color='inherit'
              variant='outlined'
            >
              Cancel
            </Button>
            <Button
              variant='contained'
              disabled={savingEdit}
              onClick={handleSaveEdit}
            >
              {savingEdit ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      <Dialog
        open={!!confirmDeleteDoc}
        onClose={() => setConfirmDeleteDoc(null)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Delete document?</DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            "{confirmDeleteDoc?.label}" will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setConfirmDeleteDoc(null)}
            color='inherit'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
              <MagicWandIcon size={16} weight='fill' />
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
