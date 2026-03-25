'use client'

import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { AppDocument } from '../applicationFormUtils'

export const markdownContentSx = {
  fontSize: '0.875rem',
  lineHeight: 1.6,
  '& p': { mt: 0, mb: 1.5 },
  '& p:last-child': { mb: 0 },
  '& h1': { fontSize: '1.25rem', fontWeight: 700, mt: 2, mb: 1 },
  '& h2': { fontSize: '1.1rem', fontWeight: 700, mt: 2, mb: 0.75 },
  '& h3': { fontSize: '0.95rem', fontWeight: 700, mt: 1.5, mb: 0.5 },
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
}

interface Props {
  open: boolean
  doc: AppDocument | null
  onClose: () => void
  /** When provided, the dialog shows an Edit button and allows saving changes. */
  onUpdate?: (updated: AppDocument) => void
}

export function DocumentViewerDialog({ open, doc, onClose, onUpdate }: Props) {
  const [editContent, setEditContent] = useState<string | null>(null)

  function handleClose() {
    setEditContent(null)
    onClose()
  }

  function handleSave() {
    if (!doc || editContent === null || !onUpdate) return
    onUpdate({ ...doc, content: editContent })
    setEditContent(null)
  }

  const canEdit = !!onUpdate
  const isEditing = editContent !== null

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth='md'
      slotProps={{ paper: { sx: { minHeight: '60vh' } } }}
    >
      <DialogTitle sx={{ pr: canEdit && !isEditing ? 10 : 6 }}>
        {doc?.label}
        {canEdit && !isEditing && (
          <Tooltip title='Edit'>
            <IconButton
              size='small'
              onClick={() => setEditContent(doc?.content ?? '')}
              sx={{ position: 'absolute', top: 12, right: 44 }}
            >
              <EditOutlinedIcon fontSize='small' />
            </IconButton>
          </Tooltip>
        )}
        <IconButton
          size='small'
          onClick={handleClose}
          sx={{ position: 'absolute', top: 12, right: 12 }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {isEditing ? (
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
            onClick={
              canEdit ? () => setEditContent(doc?.content ?? '') : undefined
            }
            sx={{ ...markdownContentSx, cursor: canEdit ? 'text' : 'default' }}
          >
            <ReactMarkdown>{doc?.content ?? ''}</ReactMarkdown>
          </Box>
        )}
      </DialogContent>

      {isEditing && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setEditContent(null)}
            color='inherit'
            variant='outlined'
          >
            Cancel
          </Button>
          <Button variant='contained' onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
