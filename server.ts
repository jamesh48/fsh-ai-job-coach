import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import { createServer } from 'node:http'
import { parse } from 'node:url'
import { jwtVerify } from 'jose'
import next from 'next'
import { type RawData, type WebSocket, WebSocketServer } from 'ws'
import {
  deleteFileByPath,
  resolveFileContent,
  setAgentSend,
  upsertFile,
} from './lib/agentFiles'

// In-process secret for server.ts → Next.js API route authentication.
// Generated fresh on each startup; both sides share the same process so
// Next.js API routes can read it from process.env.
const INTERNAL_SECRET = randomUUID()
process.env.INTERNAL_SECRET = INTERNAL_SECRET

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT ?? '3000', 10)

interface ClassifyResult {
  relevant: boolean
  classification: Record<string, unknown> | null
}

interface AgentMessage {
  type: string
  payload: Record<string, unknown>
}

/**
 * Validate the agent WebSocket secret against Settings DB.
 * Returns the userId on success, false on failure.
 */
async function validateAgentSecret(
  secret: string | string[] | undefined,
): Promise<string | false> {
  try {
    const res = await fetch(
      `http://localhost:${port}/api/agent/validate-secret`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret }),
      },
    )
    if (!res.ok) return false
    const result = (await res.json()) as {
      authorized: boolean
      userId?: string
    }
    return result.authorized && result.userId ? result.userId : false
  } catch {
    return false
  }
}

/**
 * Extract the userId from the session JWT in the request's Cookie header.
 * Returns null if the cookie is missing or invalid.
 */
async function getClientUserId(req: IncomingMessage): Promise<string | null> {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null

  const cookies = Object.fromEntries(
    cookieHeader.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=')
      return [k.trim(), v.join('=')]
    }),
  )

  const token = cookies.session
  if (!token) return null

  try {
    const sessionSecret = process.env.SESSION_SECRET
    if (!sessionSecret) return null
    const secret = new TextEncoder().encode(sessionSecret)
    const { payload } = await jwtVerify(token, secret)
    if (typeof payload.userId !== 'string') return null
    return payload.userId
  } catch {
    return null
  }
}

async function classifyAndStoreEmail(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ClassifyResult | null> {
  try {
    const res = await fetch(`http://localhost:${port}/api/agent/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ userId, ...payload }),
    })
    if (!res.ok) {
      console.log(`[ws] email classification API error: ${res.status}`)
      return null
    }
    const result = (await res.json()) as ClassifyResult
    const type =
      (result.classification as Record<string, string> | null)?.type ?? 'none'
    console.log(
      `[ws] email classified: relevant=${result.relevant} type=${type}`,
    )
    return result
  } catch (err) {
    console.log(`[ws] email classification fetch failed: ${err}`)
    return null
  }
}

async function classifyCalendarEvent(
  payload: Record<string, unknown>,
  userId: string,
): Promise<ClassifyResult | null> {
  try {
    const res = await fetch(`http://localhost:${port}/api/agent/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': INTERNAL_SECRET,
      },
      body: JSON.stringify({ userId, ...payload }),
    })
    if (!res.ok) {
      console.log(`[ws] calendar classification API error: ${res.status}`)
      return null
    }
    const result = (await res.json()) as ClassifyResult
    const type =
      (result.classification as Record<string, string> | null)?.type ?? 'none'
    console.log(
      `[ws] calendar classified: relevant=${result.relevant} type=${type}`,
    )
    return result
  } catch (err) {
    console.log(`[ws] calendar classification fetch failed: ${err}`)
    return null
  }
}

const PING_INTERVAL_MS = 30_000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

let agentSocket: WebSocket | null = null
let agentUserId: string | null = null

// Maps each browser client WebSocket to the userId of the logged-in user.
const clients = new Map<WebSocket, string>()

function broadcastToUser(userId: string, data: string | RawData): void {
  for (const [client, clientUserId] of clients) {
    if (clientUserId === userId && client.readyState === client.OPEN) {
      client.send(data)
    }
  }
}

function broadcastJSONToUser(
  userId: string,
  msg: Record<string, unknown>,
): void {
  broadcastToUser(userId, JSON.stringify(msg))
}

function setupKeepalive(ws: WebSocket): void {
  let alive = true
  const timer = setInterval(() => {
    if (!alive) {
      ws.terminate()
      return
    }
    alive = false
    ws.ping()
  }, PING_INTERVAL_MS)
  ws.on('pong', () => {
    alive = true
  })
  ws.on('close', () => clearInterval(timer))
}

app.prepare().then(() => {
  const handleUpgrade = app.getUpgradeHandler()

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '/', true)
    handle(req, res, parsedUrl)
  })

  const agentWss = new WebSocketServer({ noServer: true })
  const clientWss = new WebSocketServer({ noServer: true })

  // --- Agent connections (/ws/agent) ---
  agentWss.on('connection', (ws: WebSocket) => {
    console.log('[ws] agent connected')
    if (agentSocket) {
      agentSocket.terminate()
    }
    agentSocket = ws
    setAgentSend((msg) => ws.send(JSON.stringify(msg)))

    // Request files from the agent over the same connection
    ws.send(JSON.stringify({ type: 'list_files' }))

    if (agentUserId) {
      broadcastJSONToUser(agentUserId, {
        type: 'agent_connected',
        timestamp: new Date().toISOString(),
      })
    }
    setupKeepalive(ws)

    ws.on('message', async (data: RawData) => {
      if (!agentUserId) return

      let parsed: AgentMessage
      try {
        parsed = JSON.parse(data.toString()) as AgentMessage
      } catch {
        console.log('[ws] agent message unparseable — forwarding as-is')
        broadcastToUser(agentUserId, data)
        return
      }

      if (parsed.type === 'file_removed') {
        const removedPath = (parsed.payload as { path?: string }).path
        if (removedPath) {
          deleteFileByPath(agentUserId, removedPath)
          broadcastJSONToUser(agentUserId, {
            type: 'file_removed',
            payload: { path: removedPath },
            timestamp: new Date().toISOString(),
          })
          console.log(`[ws] file removed: ${removedPath}`)
        }
        return
      }

      if (parsed.type === 'file_content') {
        const { requestId, base64, mimeType } = parsed.payload as {
          requestId: string
          base64: string
          mimeType: string
        }
        resolveFileContent(requestId, base64, mimeType)
        return
      }

      if (parsed.type === 'file_added') {
        const filePayload = parsed.payload as {
          filename: string
          path: string
          size: number
          mimeType: string
        }
        const meta = upsertFile(agentUserId, filePayload)
        broadcastJSONToUser(agentUserId, {
          type: 'file_updated',
          payload: meta,
          timestamp: new Date().toISOString(),
        })
        console.log(`[ws] file synced: ${filePayload.filename}`)
        return
      }

      if (parsed.type === 'email_detected') {
        const result = await classifyAndStoreEmail(parsed.payload, agentUserId)
        if (result === null) {
          broadcastToUser(agentUserId, data)
        } else if (result.relevant) {
          parsed.payload = {
            ...parsed.payload,
            classification: result.classification,
          }
          broadcastToUser(agentUserId, JSON.stringify(parsed))
        }
        return
      }

      if (parsed.type === 'calendar_event') {
        const result = await classifyCalendarEvent(parsed.payload, agentUserId)
        if (result === null) {
          broadcastToUser(agentUserId, data)
        } else if (result.relevant) {
          parsed.payload = {
            ...parsed.payload,
            classification: result.classification,
          }
          broadcastToUser(agentUserId, JSON.stringify(parsed))
        }
        return
      }

      broadcastToUser(agentUserId, data)
    })

    ws.on('close', () => {
      console.log('[ws] agent disconnected')
      if (agentSocket === ws) {
        if (agentUserId) {
          broadcastJSONToUser(agentUserId, {
            type: 'agent_disconnected',
            timestamp: new Date().toISOString(),
          })
        }
        agentSocket = null
        agentUserId = null
        setAgentSend(null)
      }
    })

    ws.on('error', (err: Error) => {
      console.log(`[ws] agent socket error: ${err}`)
    })
  })

  // --- Webapp client connections (/ws/client) ---
  clientWss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    getClientUserId(req).then((userId) => {
      if (!userId) {
        ws.close(1008, 'Unauthorized')
        return
      }
      clients.set(ws, userId)
      console.log(`[ws] browser client connected (total: ${clients.size})`)

      // Send current agent connection state so the client doesn't have to wait
      // for the next agent_connected/agent_disconnected event.
      if (ws.readyState === ws.OPEN) {
        ws.send(
          JSON.stringify({
            type:
              agentUserId === userId ? 'agent_connected' : 'agent_disconnected',
            timestamp: new Date().toISOString(),
          }),
        )
      }

      setupKeepalive(ws)

      ws.on('close', () => {
        clients.delete(ws)
        console.log(`[ws] browser client disconnected (total: ${clients.size})`)
      })
      ws.on('error', (err: Error) => {
        console.log(`[ws] client socket error: ${err}`)
      })
    })
  })

  // --- Upgrade routing ---
  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? '/', true)

    if (pathname === '/ws/agent') {
      validateAgentSecret(query.secret).then((userId) => {
        if (!userId) {
          console.log('[ws] agent auth failed — rejecting upgrade')
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
          socket.destroy()
          return
        }
        agentUserId = userId
        agentWss.handleUpgrade(req, socket, head, (ws) => {
          agentWss.emit('connection', ws, req)
        })
      })
    } else if (pathname === '/ws/client') {
      clientWss.handleUpgrade(req, socket, head, (ws) => {
        clientWss.emit('connection', ws, req)
      })
    } else {
      handleUpgrade(req, socket, head)
    }
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
