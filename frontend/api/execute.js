import { createRequire } from 'module'
import pg from 'pg'
import { getPool } from './_db.js'
import { adaptTSQL } from './_translate.js'
const require = createRequire(import.meta.url)
const questions = require('./questions.json')

const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))
const schemaName = id => 'q_' + id.replace(/-/g, '_')

async function execQuery(questionId, sql, dialect) {
  const pgSql = dialect === 'mssql' ? adaptTSQL(sql) : sql
  const schema = schemaName(questionId)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL search_path = ${schema}, public`)
    await client.query(`SET LOCAL statement_timeout = '8000'`)
    const result = await client.query(pgSql)
    await client.query('ROLLBACK')
    const columns = result.fields.map(f => f.name)
    const rows = result.rows.map(row => { const out = {}; columns.forEach(col => { out[col] = row[col] === undefined ? null : row[col] }); return out })
    return { columns, rows, error: null }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { columns: [], rows: [], error: err.message }
  } finally { client.release() }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { questionId, sql, dialect = 'sqlite' } = req.body
  if (!questionId || !sql) return res.status(400).json({ error: 'questionId and sql required' })
  if (!questionMap[questionId]) return res.status(404).json({ error: `Unknown question: ${questionId}` })
  res.json(await execQuery(questionId, sql.trim(), dialect))
}
