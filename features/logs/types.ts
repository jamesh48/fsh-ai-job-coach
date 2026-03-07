export type DailyLog = {
  id: string
  date: string // 'YYYY-MM-DD'
  content: string
  createdAt: string
  updatedAt: string
}

export type LogFormValues = {
  date: string
  content: string
}
