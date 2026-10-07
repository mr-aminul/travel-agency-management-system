import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.resolve(__dirname, '../../db/migrations')

async function main() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`[migrate] applying ${file}`)
    await pool.query(sql)
  }

  console.log('[migrate] done')
  await pool.end()
}

main().catch(async (error) => {
  console.error('[migrate] failed', error)
  await pool.end().catch(() => {})
  process.exit(1)
})
