import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'ssh2'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const i = trimmed.indexOf('=')
  if (i > 0) {
    env[trimmed.slice(0, i)] = trimmed.slice(i + 1).replace(/^["']|["']$/g, '')
  }
}

const conn = new Client()
conn
  .on('ready', () => {
    conn.exec(
      'sleep 4; curl -fsS http://127.0.0.1:4010/api/platform/health; echo; curl -fsS http://127.0.0.1:4010/api/platform/announcements/public; echo',
      (err, stream) => {
        if (err) {
          console.error(err)
          process.exit(1)
        }
        stream.pipe(process.stdout)
        stream.stderr.pipe(process.stderr)
        stream.on('close', (code) => {
          conn.end()
          process.exit(code || 0)
        })
      },
    )
  })
  .on('error', (error) => {
    console.error(error)
    process.exit(1)
  })
  .connect({
    host: env.VPS_HOST,
    username: env.VPS_USER || 'root',
    password: env.VPS_PASSWORD,
  })
