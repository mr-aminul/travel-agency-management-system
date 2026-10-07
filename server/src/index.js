import cors from 'cors'
import express from 'express'
import { pool, query } from './db.js'
import {
  createAgencyUser,
  loginWithPassword,
  readBearerToken,
  requireAuth,
  requirePlatformAdmin,
  resolveSession,
  revokeSession,
  seedAuthUsers,
  setAgencyUserPassword,
  setAgencyUserStatus,
} from './auth.js'

/** Keys only platform admins may write (global tenancy / IAM). */
const PLATFORM_ADMIN_KV_KEYS = new Set([
  'pd-tenants-created',
  'pd-tenant-entitlements',
  'pd-tenant-names',
  'pd-tenant-statuses',
  'pd-tenant-members-created',
  'pd-provisioned-logins',
])

function canWriteKvKey(auth, key) {
  if (auth?.user?.role === 'platform_admin') return true
  if (PLATFORM_ADMIN_KV_KEYS.has(key)) return false
  return true
}

const app = express()
const port = Number(process.env.PORT || 4010)
const bindHost = process.env.BIND_HOST || '127.0.0.1'

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((item) => item.trim())
      : true,
    credentials: true,
  }),
)

app.get('/api/platform/health', async (_req, res) => {
  try {
    await query('select 1')
    res.json({
      ok: true,
      service: 'onetrack-platform-api',
      time: new Date().toISOString(),
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      error: error instanceof Error ? error.message : 'db unavailable',
    })
  }
})

app.post('/api/platform/auth/login', async (req, res) => {
  try {
    const result = await loginWithPassword(req.body?.email, req.body?.password)
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.status(200).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'login failed',
    })
  }
})

app.get('/api/platform/auth/me', async (req, res) => {
  try {
    const session = await resolveSession(readBearerToken(req))
    if (!session) {
      res.status(401).json({ error: 'Authentication required.' })
      return
    }
    res.json({
      user: session.user,
      tenantId: session.tenantId,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'session failed',
    })
  }
})

app.post('/api/platform/auth/logout', async (req, res) => {
  try {
    await revokeSession(readBearerToken(req))
    res.json({ ok: true })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'logout failed',
    })
  }
})

/**
 * Create an agency login with an initial password.
 * Platform admin: any tenant. Agency user: own tenant only.
 */
app.post('/api/platform/auth/users', requireAuth, async (req, res) => {
  try {
    const tenantId = String(req.body?.tenantId ?? '').trim()
    const isAdmin = req.auth?.user?.role === 'platform_admin'
    if (!isAdmin && tenantId !== req.auth?.tenantId) {
      res.status(403).json({ error: 'You can only create users for your agency.' })
      return
    }
    const result = await createAgencyUser({
      email: req.body?.email,
      name: req.body?.name,
      password: req.body?.password,
      tenantId,
      id: req.body?.id,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.status(201).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'create user failed',
    })
  }
})

async function assertCanManageAgencyUser(req, res) {
  if (req.auth?.user?.role === 'platform_admin') return true
  const userId = String(req.params.userId ?? '').trim()
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase()
  const existing = await query(
    `select tenant_id from platform.users
     where role = 'agency_user'
       and (id = $1 or ($2 <> '' and lower(email) = $2))
     limit 1`,
    [userId, email],
  )
  if (!existing.rows[0] || existing.rows[0].tenant_id !== req.auth.tenantId) {
    // Allow repair path: no login row yet, but same-tenant create is permitted.
    if (!existing.rows[0] && email) return true
    res.status(403).json({ error: 'You can only manage users in your agency.' })
    return false
  }
  return true
}

app.patch(
  '/api/platform/auth/users/:userId/status',
  requireAuth,
  async (req, res) => {
    try {
      if (!(await assertCanManageAgencyUser(req, res))) return
      const result = await setAgencyUserStatus({
        userId: req.params.userId,
        email: req.body?.email,
        status: req.body?.status,
      })
      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }
      res.status(200).json(result.body)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'update status failed',
      })
    }
  },
)

app.patch(
  '/api/platform/auth/users/:userId/password',
  requireAuth,
  async (req, res) => {
    try {
      if (!(await assertCanManageAgencyUser(req, res))) return
      const result = await setAgencyUserPassword({
        userId: req.params.userId,
        email: req.body?.email,
        password: req.body?.password,
        name: req.body?.name,
        tenantId: req.body?.tenantId ?? req.auth?.tenantId,
      })
      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }
      res.status(200).json(result.body)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'update password failed',
      })
    }
  },
)

/**
 * List persisted KV keys (SPA hydrate).
 * Reads stay open so the app can bootstrap before login; writes require auth.
 */
app.get('/api/platform/kv', async (_req, res) => {
  try {
    const result = await query(
      'select key, value from platform.kv_store order by key asc',
    )
    const entries = {}
    for (const row of result.rows) {
      entries[row.key] = row.value
    }
    res.json({ entries })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

app.get('/api/platform/kv/:key', async (req, res) => {
  try {
    const result = await query(
      'select value from platform.kv_store where key = $1',
      [req.params.key],
    )
    if (!result.rowCount) {
      res.status(404).json({ error: 'not found' })
      return
    }
    res.json({ key: req.params.key, value: result.rows[0].value })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

app.put('/api/platform/kv/:key', requireAuth, async (req, res) => {
  try {
    if (!canWriteKvKey(req.auth, req.params.key)) {
      res.status(403).json({ error: 'Not allowed to write this key.' })
      return
    }
    const value = req.body?.value
    if (value === undefined) {
      res.status(400).json({ error: 'body.value is required' })
      return
    }
    await query(
      `insert into platform.kv_store (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update
         set value = excluded.value,
             updated_at = now()`,
      [req.params.key, JSON.stringify(value)],
    )
    res.json({ ok: true, key: req.params.key })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'write failed',
    })
  }
})

app.delete('/api/platform/kv/:key', requireAuth, async (req, res) => {
  try {
    if (!canWriteKvKey(req.auth, req.params.key)) {
      res.status(403).json({ error: 'Not allowed to delete this key.' })
      return
    }
    await query('delete from platform.kv_store where key = $1', [req.params.key])
    res.json({ ok: true, key: req.params.key })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'write failed',
    })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path })
})

async function start() {
  try {
    await seedAuthUsers()
    console.log('[platform-api] seeded auth users')
  } catch (error) {
    console.error(
      '[platform-api] auth seed failed — run migrations first:',
      error instanceof Error ? error.message : error,
    )
  }

  const server = app.listen(port, bindHost, () => {
    console.log(
      `[platform-api] listening on http://${bindHost}:${port} (isolated)`,
    )
  })

  async function shutdown() {
    server.close()
    await pool.end().catch(() => {})
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()
