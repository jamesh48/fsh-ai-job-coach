export type ProfileLink = { label: string; url: string }

export type AppSettings = {
  id: string
  // Sensitive fields are never returned — only status + hint
  hasApiKey: boolean
  apiKeyHint: string | null
  hasAgentSecret: boolean
  careerProfile: string | null
  resume: string | null
  jobSearchPlan: string | null
  profileLinks: ProfileLink[]
  updatedAt: string
}

export type SettingsFormValues = {
  anthropicApiKey: string // empty = keep existing; non-empty = replace
  agentSecret: string // empty = keep existing; non-empty = replace
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
