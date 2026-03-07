'use client'

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import {
  Box,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material'
import type { DailyLog } from '../types'

interface Props {
  log: DailyLog
  onEdit: (log: DailyLog) => void
  onDelete: (id: string) => void
}

function formatDate(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function LogCard({ log, onEdit, onDelete }: Props) {
  return (
    <Card
      variant='outlined'
      sx={{
        borderRadius: 2,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 3 },
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Box
          display='flex'
          justifyContent='space-between'
          alignItems='flex-start'
        >
          <Typography
            variant='overline'
            color='text.secondary'
            fontWeight={600}
            letterSpacing={1}
          >
            {formatDate(log.date)}
          </Typography>
          <Box display='flex' gap={0.5} ml={1} flexShrink={0}>
            <Tooltip title='Edit'>
              <IconButton size='small' onClick={() => onEdit(log)}>
                <EditOutlinedIcon fontSize='small' />
              </IconButton>
            </Tooltip>
            <Tooltip title='Delete'>
              <IconButton
                size='small'
                color='error'
                onClick={() => onDelete(log.id)}
              >
                <DeleteOutlineIcon fontSize='small' />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography
          variant='body2'
          color='text.primary'
          mt={1}
          sx={{ whiteSpace: 'pre-wrap' }}
        >
          {log.content}
        </Typography>
      </CardContent>
    </Card>
  )
}
