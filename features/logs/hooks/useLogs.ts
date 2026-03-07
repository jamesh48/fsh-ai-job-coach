import {
  useAddLogMutation,
  useDeleteLogMutation,
  useGetLogsQuery,
  useUpdateLogMutation,
} from '@/lib/api'
import type { DailyLog } from '../types'

export function useLogs() {
  const { data: logs = [], isLoading, error } = useGetLogsQuery()
  const [addLog] = useAddLogMutation()
  const [updateLog] = useUpdateLogMutation()
  const [deleteLog] = useDeleteLogMutation()

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  return {
    logs: sorted,
    isLoading,
    error,
    add: (values: Omit<DailyLog, 'id' | 'createdAt' | 'updatedAt'>) =>
      addLog(values),
    update: (log: DailyLog) => updateLog(log),
    remove: (id: string) => deleteLog(id),
  }
}
