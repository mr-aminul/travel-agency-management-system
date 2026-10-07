import pg from 'pg'

const { Pool } = pg

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'platform'}:${process.env.PGPASSWORD || 'platform'}@${process.env.PGHOST || '127.0.0.1'}:${process.env.PGPORT || '5433'}/${process.env.PGDATABASE || 'onetrack_platform'}`

export const pool = new Pool({
  connectionString,
  max: 10,
})

export async function query(text, params) {
  return pool.query(text, params)
}
