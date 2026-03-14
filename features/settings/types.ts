export type JobSearchPhase = {
  label: string
  focus: string
}

export type JobSearchPlan = {
  startDate: string
  endDate: string
  phases: JobSearchPhase[]
  notes: string
}

export type AppSettings = {
  id: string
  anthropicApiKey: string | null
  careerProfile: string | null
  jobSearchPlan: string | null
  updatedAt: string
}

export type SettingsFormValues = {
  anthropicApiKey: string
  careerProfile: string
  planStartDate: string
  planEndDate: string
  planPhases: JobSearchPhase[]
  planNotes: string
}

export type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
