module.exports = async function handler(req, res) {
  const checks = { fn: true, env: !!process.env.DATABASE_URL }
  try {
    const { Pool } = require('pg')
    checks.pg = true
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    const client = await pool.connect()
    const r = await client.query('SELECT 1 as ok')
    checks.db = r.rows[0].ok === 1
    client.release()
    await pool.end()
  } catch (err) {
    checks.error = err.message
  }
  res.json(checks)
}
