import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { parse } from 'node:url'
import next from 'next'
import { type RawData, type WebSocket, WebSocketServer } from 'ws'

// In-process secret for server.js → Next.js API route authentication.
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
const clients = new Set<WebSocket>()

function broadcast(data: string | RawData): void {
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(data)
    }
  }
}

function broadcastJSON(msg: Record<string, unknown>): void {
  broadcast(JSON.stringify(msg))
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

    broadcastJSON({
      type: 'agent_connected',
      timestamp: new Date().toISOString(),
    })
    setupKeepalive(ws)

    ws.on('message', async (data: RawData) => {
      let parsed: AgentMessage
      try {
        parsed = JSON.parse(data.toString()) as AgentMessage
      } catch {
        console.log('[ws] agent message unparseable — forwarding as-is')
        broadcast(data)
        return
      }

      if (parsed.type === 'email_detected') {
        const result = agentUserId
          ? await classifyAndStoreEmail(parsed.payload, agentUserId)
          : null
        if (result === null) {
          broadcast(data)
        } else if (result.relevant) {
          parsed.payload = {
            ...parsed.payload,
            classification: result.classification,
          }
          broadcast(JSON.stringify(parsed))
        }
        return
      }

      if (parsed.type === 'calendar_event') {
        const result = agentUserId
          ? await classifyCalendarEvent(parsed.payload, agentUserId)
          : null
        if (result === null) {
          broadcast(data)
        } else if (result.relevant) {
          parsed.payload = {
            ...parsed.payload,
            classification: result.classification,
          }
          broadcast(JSON.stringify(parsed))
        }
        return
      }

      broadcast(data)
    })

    ws.on('close', () => {
      console.log('[ws] agent disconnected')
      if (agentSocket === ws) {
        agentSocket = null
        agentUserId = null
      }
      broadcastJSON({
        type: 'agent_disconnected',
        timestamp: new Date().toISOString(),
      })
    })

    ws.on('error', (err: Error) => {
      console.log(`[ws] agent socket error: ${err}`)
    })
  })

  // --- Webapp client connections (/ws/client) ---
  clientWss.on('connection', (ws: WebSocket) => {
    clients.add(ws)
    console.log(`[ws] browser client connected (total: ${clients.size})`)
    setupKeepalive(ws)

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[ws] browser client disconnected (total: ${clients.size})`)
    })
    ws.on('error', (err: Error) => {
      console.log(`[ws] client socket error: ${err}`)
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
      socket.destroy()
    }
  })

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})
