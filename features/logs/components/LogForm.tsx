'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import dayjs from 'dayjs'
import type { DailyLog, LogFormValues } from '../types'

interface Props {
  open: boolean
  editing: DailyLog | null
  existingDates: string[]
  onSubmit: (values: LogFormValues) => void
  onClose: () => void
}

export function LogForm({
  open,
  editing,
  existingDates,
  onSubmit,
  onClose,
}: Props) {
  const schema = useMemo(
    () =>
      yup.object({
        date: yup
          .string()
          .required('Date is required')
          .test(
            'unique-date',
            'An entry already exists for this date.',
            (value) => {
              const takenDates = editing
                ? existingDates.filter((d) => d !== editing.date)
                : existingDates
              return !takenDates.includes(value ?? '')
            },
          ),
        content: yup.string().required('Activities are required'),
      }),
    [existingDates, editing],
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LogFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { date: '', content: '' },
  })

  useEffect(() => {
    reset(
      editing
        ? { date: editing.date, content: editing.content }
        : { date: dayjs().format('YYYY-MM-DD'), content: '' },
    )
  }, [editing, open, reset])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>{editing ? 'Edit Entry' : 'New Entry'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3} pt={1}>
            <TextField
              label='Date'
              type='date'
              slotProps={{ inputLabel: { shrink: true } }}
              error={!!errors.date}
              helperText={errors.date?.message}
              {...register('date')}
            />
            <TextField
              label='Activities'
              multiline
              rows={5}
              placeholder='What did you work on today? Applications sent, interviews, networking, research…'
              error={!!errors.content}
              helperText={errors.content?.message}
              {...register('content')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} color='inherit'>
            Cancel
          </Button>
          <Button type='submit' variant='contained' disableElevation>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
