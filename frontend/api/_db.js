import pg from 'pg'
import { createRequire } from 'module'
const { Pool } = pg

let pool
export function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2 })
  return pool
}
