export type AppSettings = {
  id: string
  anthropicApiKey: string | null
  updatedAt: string
}

export type SettingsFormValues = {
  anthropicApiKey: string
}

export type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
