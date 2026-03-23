import { randomUUID } from 'node:crypto'

export interface StoredFile {
  id: string
  filename: string
  path: string
  size: number
  mimeType: string
  updatedAt: string
}

type FileStore = Map<string, Map<string, StoredFile>>
type SendFn = (msg: object) => void
type FileContentResolver = (
  result: { base64: string; mimeType: string } | null,
) => void

// Use globalThis so server.ts and Next.js API routes share the same instance
// across module boundaries (Next.js HMR creates separate module instances in dev)
const g = globalThis as unknown as {
  __agentFiles?: FileStore
  __agentSend?: SendFn
  __agentPendingFiles?: Map<string, FileContentResolver>
}
if (!g.__agentFiles) g.__agentFiles = new Map()
if (!g.__agentPendingFiles) g.__agentPendingFiles = new Map()
const store: FileStore = g.__agentFiles

export function setAgentSend(fn: SendFn | null): void {
  if (fn) g.__agentSend = fn
  else delete g.__agentSend
}

export function sendToAgent(msg: object): boolean {
  if (!g.__agentSend) return false
  g.__agentSend(msg)
  return true
}

export function requestFileContent(
  filePath: string,
  timeoutMs = 15000,
): Promise<{ base64: string; mimeType: string } | null> {
  if (!g.__agentSend) return Promise.resolve(null)

  const requestId = randomUUID()

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      g.__agentPendingFiles?.delete(requestId)
      resolve(null)
    }, timeoutMs)

    g.__agentPendingFiles?.set(requestId, (result) => {
      clearTimeout(timer)
      g.__agentPendingFiles?.delete(requestId)
      resolve(result)
    })

    g.__agentSend?.({
      type: 'get_file',
      payload: { requestId, path: filePath },
    })
  })
}

export function resolveFileContent(
  requestId: string,
  base64: string,
  mimeType: string,
): void {
  g.__agentPendingFiles?.get(requestId)?.({ base64, mimeType })
}

export function upsertFile(
  userId: string,
  file: Omit<StoredFile, 'id' | 'updatedAt'>,
): StoredFile {
  if (!store.has(userId)) store.set(userId, new Map())
  const userFiles = store.get(userId) ?? new Map<string, StoredFile>()
  const existing = userFiles.get(file.path)
  const stored: StoredFile = {
    ...file,
    id: existing?.id ?? randomUUID(),
    updatedAt: new Date().toISOString(),
  }
  userFiles.set(file.path, stored)
  return stored
}

export function getFiles(userId: string): StoredFile[] {
  return Array.from(store.get(userId)?.values() ?? [])
}

export function getFile(userId: string, id: string): StoredFile | null {
  const userFiles = store.get(userId)
  if (!userFiles) return null
  for (const file of userFiles.values()) {
    if (file.id === id) return file
  }
  return null
}

export function clearFiles(userId: string): void {
  store.delete(userId)
}

export function deleteFileByPath(userId: string, filePath: string): void {
  const userFiles = store.get(userId)
  if (!userFiles) return
  userFiles.delete(filePath)
}

export function deleteFile(userId: string, id: string): void {
  const userFiles = store.get(userId)
  if (!userFiles) return
  for (const [path, file] of userFiles.entries()) {
    if (file.id === id) {
      userFiles.delete(path)
      return
    }
  }
}
