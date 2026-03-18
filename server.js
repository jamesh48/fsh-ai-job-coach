// @ts-check

const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

const { createServer } = require('node:http')
const { parse } = require('node:url')
const next = require('next')
const { WebSocketServer } = require('ws')

const dev = process.env.NODE_ENV !== 'production'
const hostname = '0.0.0.0'
const port = parseInt(process.env.PORT ?? '3000', 10)

/**
 * Validate the agent WebSocket secret against Settings DB (env var fallback).
 * @param {string | string[] | undefined} secret
 * @returns {Promise<boolean>}
 */
async function validateAgentSecret(secret) {
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
    const result = await res.json()
    return result.authorized === true
  } catch {
    return false
  }
}

/**
 * Classify and conditionally store an email via the internal API route.
 * Returns { relevant, classification } on success, or null on any failure
 * (caller should fail open).
 * @param {object} payload - email_detected payload
 * @returns {Promise<{ relevant: boolean, classification: object | null } | null>}
 */
async function classifyAndStoreEmail(payload) {
  try {
    const res = await fetch(`http://localhost:${port}/api/agent/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': AGENT_SECRET ?? '',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.log(`[ws] email classification API error: ${res.status}`)
      return null
    }
    const result = await res.json()
    console.log(
      `[ws] email classified: relevant=${result.relevant} type=${result.classification?.type ?? 'none'}`,
    )
    return result
  } catch (err) {
    console.log(`[ws] email classification fetch failed: ${err}`)
    return null
  }
}

/**
 * Classify a calendar event via the internal API route.
 * Returns { relevant, classification } on success, or null on any failure
 * (caller should fail open).
 * @param {object} payload - calendar_event payload
 * @returns {Promise<{ relevant: boolean, classification: object | null } | null>}
 */
async function classifyCalendarEvent(payload) {
  try {
    const res = await fetch(`http://localhost:${port}/api/agent/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-secret': AGENT_SECRET ?? '',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      console.log(`[ws] calendar classification API error: ${res.status}`)
      return null
    }
    const result = await res.json()
    console.log(
      `[ws] calendar classified: relevant=${result.relevant} type=${result.classification?.type ?? 'none'}`,
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

/** @type {import('ws').WebSocket | null} */
let agentSocket = null

/** @type {Set<import('ws').WebSocket>} */
const clients = new Set()

/**
 * Forward a raw message buffer to all connected webapp clients.
 * @param {import('ws').RawData} data
 */
function broadcast(data) {
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(data)
    }
  }
}

/**
 * Send a JSON message to all connected webapp clients.
 * @param {object} msg
 */
function broadcastJSON(msg) {
  broadcast(JSON.stringify(msg))
}

/**
 * Set up ping/pong keepalive on a WebSocket. Terminates the socket if a pong
 * is not received within one interval.
 * @param {import('ws').WebSocket} ws
 */
function setupKeepalive(ws) {
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
  agentWss.on('connection', (ws) => {
    console.log('[ws] agent connected')
    // Displace any existing agent connection
    if (agentSocket) {
      agentSocket.terminate()
    }
    agentSocket = ws

    broadcastJSON({
      type: 'agent_connected',
      timestamp: new Date().toISOString(),
    })

    setupKeepalive(ws)

    ws.on('message', async (data) => {
      let parsed
      try {
        parsed = JSON.parse(data.toString())
      } catch {
        console.log('[ws] agent message unparseable — forwarding as-is')
        broadcast(data)
        return
      }

      if (parsed.type === 'email_detected') {
        const result = await classifyAndStoreEmail(parsed.payload)
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
        const result = await classifyCalendarEvent(parsed.payload)
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

      broadcast(data) // all other events relay as-is
    })

    ws.on('close', () => {
      console.log('[ws] agent disconnected')
      if (agentSocket === ws) {
        agentSocket = null
      }
      broadcastJSON({
        type: 'agent_disconnected',
        timestamp: new Date().toISOString(),
      })
    })

    ws.on('error', (err) => {
      console.log(`[ws] agent socket error: ${err}`)
    })
  })

  // --- Webapp client connections (/ws/client) ---
  clientWss.on('connection', (ws) => {
    clients.add(ws)
    console.log(`[ws] browser client connected (total: ${clients.size})`)
    setupKeepalive(ws)

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[ws] browser client disconnected (total: ${clients.size})`)
    })
    ws.on('error', (err) => {
      console.log(`[ws] client socket error: ${err}`)
    })
  })

  // --- Upgrade routing ---
  server.on('upgrade', (req, socket, head) => {
    const { pathname, query } = parse(req.url ?? '/', true)

    if (pathname === '/ws/agent') {
      validateAgentSecret(query.secret).then((authorized) => {
        if (!authorized) {
          console.log('[ws] agent auth failed — rejecting upgrade')
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
          socket.destroy()
          return
        }
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
