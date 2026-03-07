// Interview feature types

export type InterviewSession = {
  id: string
  userId: string
  jobTitle: string
  questions: InterviewQuestion[]
  createdAt: Date
}

export type InterviewQuestion = {
  id: string
  question: string
  answer?: string
  feedback?: string
}
