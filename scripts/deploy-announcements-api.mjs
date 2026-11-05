/**
 * Hot-patch announcement API files onto the VPS and rebuild the API container.
 * Usage: node scripts/deploy-announcements-api.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'ssh2'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function readEnv(filePath) {
  const out = {}
  if (!fs.existsSync(filePath)) return out
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    out[trimmed.slice(0, eq)] = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv(path.join(ROOT, '.env')), ...process.env }
const host = env.VPS_HOST
const username = env.VPS_USER || 'root'
const password = env.VPS_PASSWORD
const remoteRoot = env.PLATFORM_REMOTE_ROOT || '/opt/onetrack-platform'

if (!host || !password) {
  console.error('VPS_HOST / VPS_PASSWORD missing')
  process.exit(1)
}

const files = [
  'server/src/announcements.js',
  'server/src/index.js',
  'server/src/files.js',
  'server/src/kvAccess.js',
]

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err)
      let stdout = ''
      let stderr = ''
      stream.on('data', (d) => {
        stdout += d.toString()
        process.stdout.write(d)
      })
      stream.stderr.on('data', (d) => {
        stderr += d.toString()
        process.stderr.write(d)
      })
      stream.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed (${code}): ${command}\n${stderr}`))
          return
        }
        resolve(stdout)
      })
    })
  })
}

function upload(conn, localRel, remoteAbs) {
  const localAbs = path.join(ROOT, localRel)
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      sftp.fastPut(localAbs, remoteAbs, (putErr) => {
        sftp.end()
        if (putErr) reject(putErr)
        else resolve()
      })
    })
  })
}

const conn = new Client()
conn
  .on('ready', async () => {
    try {
      console.log(`[announce-api] connected ${username}@${host}`)
      for (const rel of files) {
        const remote = `${remoteRoot}/${rel.replace(/\\/g, '/')}`
        console.log(`[announce-api] upload ${rel}`)
        await upload(conn, rel, remote)
      }
      console.log('[announce-api] rebuild API container…')
      await exec(
        conn,
        `cd ${remoteRoot}/deploy && docker compose --env-file ${remoteRoot}/.env -f docker-compose.yml up -d --build api`,
      )
      console.log('[announce-api] health check…')
      await exec(conn, 'curl -fsS http://127.0.0.1:4010/api/platform/health && echo')
      await exec(
        conn,
        'curl -fsS http://127.0.0.1:4010/api/platform/announcements/public && echo',
      )
      console.log('[announce-api] done')
      conn.end()
    } catch (error) {
      console.error(error)
      conn.end()
      process.exit(1)
    }
  })
  .on('error', (error) => {
    console.error(error)
    process.exit(1)
  })
  .connect({
    host,
    port: 22,
    username,
    password,
    readyTimeout: 30_000,
  })
