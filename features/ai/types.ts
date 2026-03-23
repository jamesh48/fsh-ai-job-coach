export type AgentCalendarClassification = {
  type:
    | 'phone_screen'
    | 'technical_interview'
    | 'onsite'
    | 'recruiter_call'
    | 'hiring_manager_call'
    | 'offer_discussion'
    | 'reference_check'
    | 'other'
  reason: string
}

export type AgentCalendarEvent = {
  id: string
  eventId: string
  summary: string
  description: string | null
  start: string | null
  end: string | null
  organizer: string | null
  classification: AgentCalendarClassification | null
  receivedAt: string
}

export type AgentEmailClassification = {
  type:
    | 'recruiter_intro'
    | 'interview_request'
    | 'interview_confirmation'
    | 'next_steps'
    | 'availability_request'
    | 'offer'
    | 'rejection'
    | 'other'
  reason: string
}

export type AgentEmail = {
  id: string
  emailId: string
  threadId: string
  subject: string
  sender: string
  snippet: string
  date: string
  classification: AgentEmailClassification | null
  receivedAt: string
}

export type AgentFile = {
  id: string
  filename: string
  path: string
  size: number
  mimeType: string
  updatedAt: string
}

export type AgentFileWithContent = AgentFile & {
  base64: string
}

export type AiRecommendationResponse = {
  recommendation: string
}

export type StoredRecommendationResponse = {
  recommendation: string | null
  date: string | null
}
