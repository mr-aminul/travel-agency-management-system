import cors from 'cors'
import express from 'express'
import { pool, query } from './db.js'

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

/** List all persisted KV keys (for SPA hydrate). */
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

app.put('/api/platform/kv/:key', async (req, res) => {
  try {
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

app.delete('/api/platform/kv/:key', async (req, res) => {
  try {
    await query('delete from platform.kv_store where key = $1', [req.params.key])
    res.json({ ok: true, key: req.params.key })
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'delete failed',
    })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: 'not found', path: req.path })
})

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
