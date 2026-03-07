// Global shared TypeScript types and interfaces

export type ApiResponse<T> = {
  data: T
  error?: string
}
