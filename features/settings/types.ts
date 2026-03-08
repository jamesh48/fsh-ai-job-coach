export type AppSettings = {
  id: string
  anthropicApiKey: string | null
  defaultPrinter: string | null
  printerType: 'text' | 'escpos' | null
  updatedAt: string
}

export type SettingsFormValues = {
  anthropicApiKey: string
  defaultPrinter: string
  printerType: 'text' | 'escpos'
}

export type PasswordFormValues = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type Printer = {
  name: string
  displayName: string
  description: string
  status: number
  isDefault: boolean
  options?: Record<string, string>
}
