export type ProfileLink = { label: string; url: string }

export type AppSettings = {
  id: string
  anthropicApiKey: string | null
  careerProfile: string | null
  resume: string | null
  jobSearchPlan: string | null
  profileLinks: ProfileLink[]
  updatedAt: string
}

export type SettingsFormValues = {
  anthropicApiKey: string
  careerProfile: string
  resume: string
  jobSearchPlan: string
  profileLinks: ProfileLink[]
}

export type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
