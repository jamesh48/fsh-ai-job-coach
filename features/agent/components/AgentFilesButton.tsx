'use client'

import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadingIcon from '@mui/icons-material/Downloading'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import {
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
  Popover,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import { useEffect, useRef, useState } from 'react'
import type { AgentFile } from '@/features/ai/types'
import { useAgentSocket } from '@/lib/agentSocketContext'
import { useDeleteAgentFileMutation, useGetAgentFilesQuery } from '@/lib/api'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function mimeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'DOCX',
    'text/plain': 'TXT',
    'text/markdown': 'MD',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'application/json': 'JSON',
    'text/csv': 'CSV',
  }
  return map[mimeType] ?? mimeType.split('/')[1]?.toUpperCase() ?? 'FILE'
}

function FileItem({ file }: { file: AgentFile }) {
  const [downloading, setDownloading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteFile, { isLoading: deleting }] = useDeleteAgentFileMutation()
  const { enqueueSnackbar } = useSnackbar()

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/agent/files/${file.id}`)
      const data = (await res.json()) as {
        base64: string
        mimeType: string
        filename: string
      }
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: data.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  async function handleDelete() {
    try {
      await deleteFile(file.id).unwrap()
      setConfirmOpen(false)
    } catch {
      enqueueSnackbar('Failed to delete file', { variant: 'error' })
    }
  }

  return (
    <>
      <Box display='flex' alignItems='center' gap={1.5} sx={{ py: 0.75 }}>
        <InsertDriveFileOutlinedIcon
          fontSize='small'
          sx={{ color: 'text.secondary', flexShrink: 0 }}
        />
        <Box minWidth={0} flex={1}>
          <Typography variant='body2' fontWeight={500} noWrap>
            {file.filename}
          </Typography>
          <Box display='flex' alignItems='center' gap={0.75} mt={0.25}>
            <Chip
              label={mimeLabel(file.mimeType)}
              size='small'
              sx={{ height: 16, fontSize: '0.65rem' }}
            />
            <Typography variant='caption' color='text.secondary'>
              {formatBytes(file.size)}
            </Typography>
          </Box>
        </Box>
        <Tooltip title='Download'>
          <span>
            <IconButton
              size='small'
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? (
                <CircularProgress size={14} />
              ) : (
                <DownloadingIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title='Delete'>
          <span>
            <IconButton
              size='small'
              onClick={() => setConfirmOpen(true)}
              disabled={deleting}
            >
              {deleting ? (
                <CircularProgress size={14} />
              ) : (
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle sx={{ pr: 6 }}>
          Delete file?
          <IconButton
            size='small'
            onClick={() => setConfirmOpen(false)}
            sx={{ position: 'absolute', top: 12, right: 12 }}
          >
            <CloseIcon fontSize='small' />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant='body2'>
            &ldquo;{file.filename}&rdquo; will be removed from the file list.
            The file on disk is not affected.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color='error' onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export function AgentFilesButton() {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingFilename, setPendingFilename] = useState<string | null>(null)
  const { data: files = [], refetch } = useGetAgentFilesQuery()
  const { lastEvent, status } = useAgentSocket()
  const { enqueueSnackbar } = useSnackbar()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    setPendingFilename(file.name)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/agent/files/upload', {
        method: 'POST',
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Upload failed')
      }
      enqueueSnackbar(`Uploaded ${file.name}`, { variant: 'success' })
    } catch (err) {
      setPendingFilename(null)
      enqueueSnackbar(err instanceof Error ? err.message : 'Upload failed', {
        variant: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  useEffect(() => {
    if (lastEvent?.type === 'file_updated') {
      setPendingFilename(null)
      refetch()
    }
    if (lastEvent?.type === 'file_removed') {
      refetch()
    }
  }, [lastEvent, refetch])

  useEffect(() => {
    if (status === 'connected') refetch()
  }, [status, refetch])

  return (
    <>
      <input
        ref={uploadRef}
        type='file'
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      <Tooltip title='Agent files'>
        <IconButton
          size='small'
          ref={anchorRef}
          onClick={() => setOpen(true)}
          sx={{ '&:hover': { color: 'primary.main' } }}
        >
          <FolderOpenIcon fontSize='small' />
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
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
          pb={1}
          flexShrink={0}
          display='flex'
          alignItems='center'
          justifyContent='space-between'
        >
          <Typography variant='subtitle1' fontWeight={700}>
            Agent Files
          </Typography>
          <Box display='flex' alignItems='center'>
            <Tooltip title='Upload file to agent'>
              <span>
                <IconButton
                  size='small'
                  onClick={() => uploadRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <CircularProgress size={14} />
                  ) : (
                    <UploadFileIcon fontSize='small' />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton
              size='small'
              onClick={() => setOpen(false)}
              sx={{ mr: -0.5 }}
            >
              <CloseIcon fontSize='small' />
            </IconButton>
          </Box>
        </Box>

        <Divider />

        <Box sx={{ overflowY: 'auto', flex: 1 }}>
          {files.length === 0 && !pendingFilename ? (
            <Box py={5} textAlign='center' px={2}>
              <Typography variant='body2' color='text.secondary'>
                No files yet.
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                Files placed in the agent's watch folder will appear here.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />} sx={{ px: 1.5, py: 1 }}>
              {files.map((file) => (
                <FileItem key={file.id} file={file} />
              ))}
              {pendingFilename && (
                <Box
                  display='flex'
                  alignItems='center'
                  gap={1.5}
                  sx={{ py: 0.75 }}
                >
                  <InsertDriveFileOutlinedIcon
                    fontSize='small'
                    sx={{ color: 'text.disabled', flexShrink: 0 }}
                  />
                  <Box minWidth={0} flex={1}>
                    <Typography
                      variant='body2'
                      fontWeight={500}
                      noWrap
                      color='text.secondary'
                    >
                      {pendingFilename}
                    </Typography>
                    <Skeleton
                      variant='text'
                      width={80}
                      height={16}
                      sx={{ mt: 0.25 }}
                    />
                  </Box>
                  <CircularProgress size={14} sx={{ flexShrink: 0, mr: 0.5 }} />
                </Box>
              )}
            </Stack>
          )}
        </Box>
      </Popover>
    </>
  )
}
