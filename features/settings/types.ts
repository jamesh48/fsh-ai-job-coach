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
  jobSearchPlan: string
}

export type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
