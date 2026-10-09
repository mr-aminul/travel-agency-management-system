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
  startViewAs,
  stopViewAs,
} from './auth.js'
import { appendAudit, listAudit } from './audit.js'
import {
  ensureUploadRoot,
  getFileRecord,
  readFileBuffer,
  saveUploadedFile,
} from './files.js'
import {
  createInvoiceShare,
  getInvoiceByToken,
  revokeInvoiceShare,
} from './invoices.js'
import {
  canWriteKvKey,
  filterEntriesForAuth,
  filterValueForTenant,
  isPlatformAdmin,
  mergeForWrite,
} from './kvAccess.js'
import {
  DOMAIN_KV_KEYS,
  domainEntriesForAuth,
  migrateDomainFromKv,
  trackByPassport,
  writeDomainKey,
} from './domain.js'
import { ensureLaunchAgencies } from './launchAgencies.js'
import {
  assertCanManageUsers,
  assertCanWriteKvKey,
  setUserMemberRole,
} from './rbac.js'
import {
  acceptInvite,
  createInvite,
  listInvitesForTenant,
  publicInviteView,
} from './invites.js'
import {
  confirmPasswordReset,
  publicResetView,
  requestPasswordReset,
} from './passwordReset.js'
import {
  handleSmsqWebhook,
  listInboundSms,
  mapInboundRow,
} from './smsqWebhook.js'

const app = express()
app.set('trust proxy', 1)
const port = Number(process.env.PORT || 4010)
const bindHost = process.env.BIND_HOST || '127.0.0.1'

app.disable('x-powered-by')
app.use(express.json({ limit: '16mb' }))
app.use(express.urlencoded({ extended: true }))
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
      viewingAs: session.viewingAs === true,
      ...(session.actor ? { actor: session.actor } : {}),
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'session failed',
    })
  }
})

app.post('/api/platform/auth/view-as', requireAuth, async (req, res) => {
  try {
    const result = await startViewAs(req.accessToken, {
      userId: req.body?.userId,
      email: req.body?.email,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    const actor = result.body.actor
    if (actor) {
      await appendAudit({
        tenantId: result.body.tenantId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        action: 'auth.view_as_started',
        entityType: 'user',
        entityId: result.body.user.id,
        summary: `Started viewing as ${result.body.user.name}`,
        meta: { targetEmail: result.body.user.email },
      }).catch(() => {})
    }
    res.status(200).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'view as failed',
    })
  }
})

app.post('/api/platform/auth/view-as/stop', requireAuth, async (req, res) => {
  try {
    const prior = req.auth
    const result = await stopViewAs(req.accessToken)
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    if (prior?.viewingAs && prior.actor) {
      await appendAudit({
        tenantId: prior.tenantId,
        actorUserId: prior.actor.id,
        actorEmail: prior.actor.email,
        action: 'auth.view_as_stopped',
        entityType: 'user',
        entityId: prior.user.id,
        summary: `Stopped viewing as ${prior.user.name}`,
        meta: { targetEmail: prior.user.email },
      }).catch(() => {})
    }
    res.status(200).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'stop view as failed',
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

app.post('/api/platform/auth/users', requireAuth, async (req, res) => {
  try {
    const tenantId = String(req.body?.tenantId ?? '').trim()
    const isAdmin = req.auth?.user?.role === 'platform_admin'
    if (!isAdmin && tenantId !== req.auth?.tenantId) {
      res.status(403).json({ error: 'You can only create users for your agency.' })
      return
    }
    const gate = await assertCanManageUsers(req.auth, tenantId)
    if (!gate.ok) {
      res.status(gate.status).json({ error: gate.error })
      return
    }
    const requestedRole =
      req.body?.role === 'sub_agent' ? 'sub_agent' : 'agency_user'
    const result = await createAgencyUser({
      email: req.body?.email,
      name: req.body?.name,
      password: req.body?.password,
      tenantId,
      id: req.body?.id,
      memberRole:
        requestedRole === 'sub_agent'
          ? undefined
          : req.body?.memberRole ||
            (req.body?.role !== 'sub_agent' ? req.body?.role : undefined),
      role: requestedRole,
      subAgentId: req.body?.subAgentId,
      linkOnly: req.body?.linkOnly === true,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    await appendAudit({
      tenantId,
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: result.body.linked ? 'user.link' : 'user.create',
      entityType: 'user',
      entityId: result.body.user.id,
      summary: result.body.linked
        ? `Linked sub-agent access for ${result.body.user.email}`
        : `Created user ${result.body.user.email}`,
    })
    res.status(result.status === 200 ? 200 : 201).json(result.body)
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
     where role in ('agency_user', 'sub_agent')
       and (id = $1 or ($2 <> '' and lower(email) = $2))
     limit 1`,
    [userId, email],
  )
  if (!existing.rows[0] || existing.rows[0].tenant_id !== req.auth.tenantId) {
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
      await appendAudit({
        tenantId: result.body.tenantId || req.auth.tenantId,
        actorUserId: req.auth.user.id,
        actorEmail: req.auth.user.email,
        action: 'user.status',
        entityType: 'user',
        entityId: result.body.user.id,
        summary: `Set status to ${result.body.status}`,
      })
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
      await appendAudit({
        tenantId: result.body.tenantId || req.auth.tenantId,
        actorUserId: req.auth.user.id,
        actorEmail: req.auth.user.email,
        action: 'user.password',
        entityType: 'user',
        entityId: result.body.user.id,
        summary: 'Password updated',
      })
      res.status(200).json(result.body)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'update password failed',
      })
    }
  },
)

/** Authenticated KV list — tenant-filtered; domain keys served from tables. */
app.get('/api/platform/kv', requireAuth, async (req, res) => {
  try {
    const result = await query(
      'select key, value from platform.kv_store order by key asc',
    )
    const entries = {}
    for (const row of result.rows) {
      if (DOMAIN_KV_KEYS.has(row.key)) continue
      entries[row.key] = row.value
    }
    const filtered = filterEntriesForAuth(entries, req.auth)
    const domain = await domainEntriesForAuth(req.auth)
    res.json({ entries: { ...filtered, ...domain } })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

app.get('/api/platform/kv/:key', requireAuth, async (req, res) => {
  try {
    const key = req.params.key
    if (DOMAIN_KV_KEYS.has(key)) {
      const domain = await domainEntriesForAuth(req.auth)
      if (!(key in domain)) {
        res.status(404).json({ error: 'not found' })
        return
      }
      res.json({ key, value: domain[key] })
      return
    }
    const result = await query(
      'select value from platform.kv_store where key = $1',
      [key],
    )
    if (!result.rowCount) {
      res.status(404).json({ error: 'not found' })
      return
    }
    const value = isPlatformAdmin(req.auth)
      ? result.rows[0].value
      : filterValueForTenant(key, result.rows[0].value, req.auth.tenantId)
    if (value === undefined) {
      res.status(403).json({ error: 'Not allowed to read this key.' })
      return
    }
    res.json({ key, value })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

app.put('/api/platform/kv/:key', requireAuth, async (req, res) => {
  try {
    const key = req.params.key
    if (!canWriteKvKey(req.auth, key)) {
      res.status(403).json({ error: 'Not allowed to write this key.' })
      return
    }
    const rbac = await assertCanWriteKvKey(req.auth, key)
    if (!rbac.ok) {
      res.status(rbac.status).json({ error: rbac.error })
      return
    }
    const value = req.body?.value
    if (value === undefined) {
      res.status(400).json({ error: 'body.value is required' })
      return
    }
    if (DOMAIN_KV_KEYS.has(key)) {
      await writeDomainKey(key, value, req.auth)
      res.json({ ok: true, key, domain: true })
      return
    }
    const existing = await query(
      'select value from platform.kv_store where key = $1',
      [key],
    )
    const prior = existing.rows[0]?.value
    const merged = mergeForWrite(key, prior, value, req.auth)
    await query(
      `insert into platform.kv_store (key, value, updated_at)
       values ($1, $2::jsonb, now())
       on conflict (key) do update
         set value = excluded.value,
             updated_at = now()`,
      [key, JSON.stringify(merged)],
    )
    // Keep users.member_role in sync when the members roster is saved.
    if (key === 'pd-tenant-members-created' && Array.isArray(merged)) {
      for (const member of merged) {
        if (!member || typeof member !== 'object') continue
        const id = typeof member.id === 'string' ? member.id.trim() : ''
        const role = member.role
        if (
          !id ||
          (role !== 'owner' && role !== 'manager' && role !== 'staff')
        ) {
          continue
        }
        await setUserMemberRole(id, role).catch(() => {})
      }
    }
    res.json({ ok: true, key })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'write failed',
    })
  }
})

app.delete('/api/platform/kv/:key', requireAuth, async (req, res) => {
  try {
    const key = req.params.key
    if (!canWriteKvKey(req.auth, key)) {
      res.status(403).json({ error: 'Not allowed to delete this key.' })
      return
    }
    if (DOMAIN_KV_KEYS.has(key)) {
      await writeDomainKey(key, [], req.auth)
      res.json({ ok: true, key, domain: true, cleared: true })
      return
    }
    // Agency users clear only their slice for array/map keys
    if (!isPlatformAdmin(req.auth)) {
      const existing = await query(
        'select value from platform.kv_store where key = $1',
        [key],
      )
      if (existing.rowCount) {
        const cleared = mergeForWrite(key, existing.rows[0].value, [], req.auth)
        const asMapClear = mergeForWrite(key, existing.rows[0].value, {}, req.auth)
        const next =
          Array.isArray(existing.rows[0].value) || Array.isArray(cleared)
            ? cleared
            : asMapClear
        await query(
          `update platform.kv_store set value = $2::jsonb, updated_at = now() where key = $1`,
          [key, JSON.stringify(next)],
        )
        res.json({ ok: true, key, cleared: true })
        return
      }
    }
    await query('delete from platform.kv_store where key = $1', [key])
    res.json({ ok: true, key })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'write failed',
    })
  }
})

/** Durable file upload (base64 JSON — no shared MinIO). */
app.post('/api/platform/files', requireAuth, async (req, res) => {
  try {
    const tenantId =
      req.auth.user.role === 'platform_admin' && req.body?.tenantId
        ? String(req.body.tenantId).trim()
        : req.auth.tenantId
    const result = await saveUploadedFile({
      tenantId,
      userId: req.auth.user.id,
      fileName: req.body?.fileName,
      mimeType: req.body?.mimeType,
      base64Data: req.body?.data,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    await appendAudit({
      tenantId,
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: 'file.upload',
      entityType: 'file',
      entityId: result.body.id,
      summary: `Uploaded ${result.body.fileName}`,
    })
    res.status(201).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'upload failed',
    })
  }
})

app.get('/api/platform/files/:fileId', requireAuth, async (req, res) => {
  try {
    const row = await getFileRecord(req.params.fileId, req.auth)
    if (!row) {
      res.status(404).json({ error: 'File not found.' })
      return
    }
    const buffer = await readFileBuffer(row)
    res.setHeader('Content-Type', row.mime_type)
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(row.file_name)}"`,
    )
    res.setHeader('Content-Length', String(row.size_bytes))
    res.send(buffer)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

app.get('/api/platform/files/:fileId/meta', requireAuth, async (req, res) => {
  try {
    const row = await getFileRecord(req.params.fileId, req.auth)
    if (!row) {
      res.status(404).json({ error: 'File not found.' })
      return
    }
    res.json({
      id: row.id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      size: row.size_bytes,
      url: `/api/platform/files/${row.id}`,
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

app.post('/api/platform/invoices/share', requireAuth, async (req, res) => {
  try {
    const invoice = req.body?.invoice
    if (!invoice || typeof invoice !== 'object') {
      res.status(400).json({ error: 'invoice is required' })
      return
    }
    const tenantId = req.auth.tenantId
    const created = await createInvoiceShare({
      tenantId,
      caseId: req.body?.caseId,
      invoice,
      createdBy: req.auth.user.id,
    })
    await appendAudit({
      tenantId,
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: 'invoice.share',
      entityType: 'invoice',
      entityId: created.id,
      summary: 'Created public invoice share',
      meta: { caseId: req.body?.caseId },
    })
    res.status(201).json(created)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'share failed',
    })
  }
})

app.post(
  '/api/platform/invoices/share/:token/revoke',
  requireAuth,
  async (req, res) => {
    try {
      const result = await revokeInvoiceShare({
        token: req.params.token,
        tenantId: req.auth.tenantId,
        isAdmin: isPlatformAdmin(req.auth),
      })
      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }
      res.json(result.body)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'revoke failed',
      })
    }
  },
)

/** —— Invites —— */
app.post('/api/platform/invites', requireAuth, async (req, res) => {
  try {
    const tenantId =
      req.auth.user.role === 'platform_admin' && req.body?.tenantId
        ? String(req.body.tenantId).trim()
        : req.auth.tenantId
    const gate = await assertCanManageUsers(req.auth, tenantId)
    if (!gate.ok) {
      res.status(gate.status).json({ error: gate.error })
      return
    }
    const result = await createInvite({
      tenantId,
      email: req.body?.email,
      name: req.body?.name,
      memberRole: req.body?.memberRole,
      invitedBy: req.auth.user.id,
      subAgentId: req.body?.subAgentId,
      role: req.body?.role === 'sub_agent' ? 'sub_agent' : undefined,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    await appendAudit({
      tenantId,
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: 'invite.create',
      entityType: 'invite',
      entityId: result.body.id,
      summary: `Invited ${result.body.email}`,
    })
    res.status(201).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'invite failed',
    })
  }
})

app.get('/api/platform/invites', requireAuth, async (req, res) => {
  try {
    const tenantId =
      req.auth.user.role === 'platform_admin' && req.query.tenantId
        ? String(req.query.tenantId).trim()
        : req.auth.tenantId
    const gate = await assertCanManageUsers(req.auth, tenantId)
    if (!gate.ok) {
      res.status(gate.status).json({ error: gate.error })
      return
    }
    const invites = await listInvitesForTenant(tenantId)
    res.json({ invites })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'list invites failed',
    })
  }
})

app.get('/api/platform/public/invites/:token', async (req, res) => {
  try {
    const result = await publicInviteView(req.params.token)
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'invite failed',
    })
  }
})

app.post('/api/platform/public/invites/:token/accept', async (req, res) => {
  try {
    const result = await acceptInvite({
      token: req.params.token,
      password: req.body?.password,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    // Ensure member role column is set (acceptInvite already writes it)
    if (result.body.userId && result.body.memberRole) {
      await setUserMemberRole(result.body.userId, result.body.memberRole)
    }
    res.json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'accept failed',
    })
  }
})

/** —— Password reset —— */
app.post('/api/platform/auth/password-reset/request', async (req, res) => {
  try {
    const result = await requestPasswordReset(req.body?.email, {
      ip: req.ip,
    })
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.status(result.status).json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'reset failed',
    })
  }
})

app.get('/api/platform/public/password-reset/:token', async (req, res) => {
  try {
    const result = await publicResetView(req.params.token)
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'reset failed',
    })
  }
})

app.post(
  '/api/platform/public/password-reset/:token/confirm',
  async (req, res) => {
    try {
      const result = await confirmPasswordReset({
        token: req.params.token,
        password: req.body?.password,
      })
      if (!result.ok) {
        res.status(result.status).json({ error: result.error })
        return
      }
      res.json(result.body)
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'reset failed',
      })
    }
  },
)

/** Public invoice — token lookup only, no auth. */
app.get('/api/platform/public/invoices/:token', async (req, res) => {
  try {
    const row = await getInvoiceByToken(req.params.token)
    if (!row) {
      res.status(404).json({ error: 'Invoice not found or revoked.' })
      return
    }
    res.json({ invoice: row.invoice, caseId: row.case_id })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'read failed',
    })
  }
})

/** Public passport track — domain tables first, KV fallback. */
app.get('/api/platform/public/track', async (req, res) => {
  try {
    const result = await trackByPassport(
      req.query.passport,
      req.query.tenant,
    )
    if (!result.ok) {
      res.status(result.status).json({ error: result.error })
      return
    }
    res.json(result.body)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'track failed',
    })
  }
})

/**
 * SMSQ MO webhook (inbound only — no SendSMS API required).
 * Configure Endpoint Base URI as:
 *   https://api.onetrack.inventivelab.bd/api/platform/webhooks/smsq?token=<SMSQ_WEBHOOK_SECRET>
 * Method GET (or POST). Params: What, Who, Sender, Circle, Operator.
 */
async function smsqWebhookHandler(req, res) {
  try {
    const result = await handleSmsqWebhook(req)
    if (!result.ok) {
      res.status(result.status).type('text').send(result.error || 'error')
      return
    }
    // SMSQ expects a fast success response; plain OK is safest for GET callbacks.
    res.status(200).type('text').send('OK')
  } catch (error) {
    console.error(
      '[smsq-webhook]',
      error instanceof Error ? error.message : error,
    )
    res.status(500).type('text').send('error')
  }
}

app.get('/api/platform/webhooks/smsq', smsqWebhookHandler)
app.post('/api/platform/webhooks/smsq', smsqWebhookHandler)

app.get('/api/platform/sms/inbound', requireAuth, async (req, res) => {
  try {
    const tenantId = isPlatformAdmin(req.auth)
      ? String(req.query.tenantId ?? '').trim() || req.auth.tenantId
      : req.auth.tenantId
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId required.' })
      return
    }
    const clientId = String(req.query.clientId ?? '').trim() || undefined
    const rows = await listInboundSms({
      tenantId,
      clientId,
      limit: req.query.limit,
    })
    res.json({ messages: rows.map(mapInboundRow) })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'list inbound sms failed',
    })
  }
})

app.get('/api/platform/audit', requireAuth, async (req, res) => {
  try {
    const tenantId = isPlatformAdmin(req.auth)
      ? String(req.query.tenantId ?? '').trim() || null
      : req.auth.tenantId
    const rows = await listAudit({
      tenantId,
      isAdmin: isPlatformAdmin(req.auth),
      limit: req.query.limit,
    })
    res.json({
      entries: rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        actorUserId: row.actor_user_id,
        actorEmail: row.actor_email,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        summary: row.summary,
        meta: row.meta,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'audit failed',
    })
  }
})

app.post('/api/platform/audit', requireAuth, async (req, res) => {
  try {
    const id = await appendAudit({
      tenantId: req.auth.tenantId,
      actorUserId: req.auth.user.id,
      actorEmail: req.auth.user.email,
      action: req.body?.action,
      entityType: req.body?.entityType,
      entityId: req.body?.entityId,
      summary: req.body?.summary,
      meta: req.body?.meta,
    })
    res.status(201).json({ id })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'audit failed',
    })
  }
})

/** Admin-only full dump (ops / support). */
app.get(
  '/api/platform/admin/kv-dump',
  requirePlatformAdmin,
  async (_req, res) => {
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
  },
)

app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path })
})

async function start() {
  try {
    await ensureUploadRoot()
  } catch (error) {
    console.error(
      '[platform-api] upload dir failed:',
      error instanceof Error ? error.message : error,
    )
  }

  try {
    await seedAuthUsers()
    console.log('[platform-api] seeded auth users (insert-if-missing)')
  } catch (error) {
    console.error(
      '[platform-api] auth seed failed — run migrations first:',
      error instanceof Error ? error.message : error,
    )
  }

  try {
    await migrateDomainFromKv()
    console.log('[platform-api] domain tables synced from KV (idempotent)')
  } catch (error) {
    console.error(
      '[platform-api] domain migrate skipped:',
      error instanceof Error ? error.message : error,
    )
  }

  try {
    const summary = await ensureLaunchAgencies()
    console.log(
      `[platform-api] launch agencies ready: ${summary.tenants} tenants, ${summary.clients} clients, ${summary.cases} cases, ${summary.payments} payments`,
    )
  } catch (error) {
    console.error(
      '[platform-api] launch agencies bootstrap failed:',
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
