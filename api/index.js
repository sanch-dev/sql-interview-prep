require('dotenv').config()
const express = require('express')
const cors = require('cors')
const pool = require('./db')
const { adaptTSQL } = require('./translate')
const questions = require('./questions.json')

const app = express()
const PORT = process.env.PORT || 3001

// Index questions by id for O(1) lookup
const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))

function schemaName(id) {
  return 'q_' + id.replace(/-/g, '_')
}

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:4173',
  ].filter(Boolean),
  methods: ['GET', 'POST'],
}))
app.use(express.json())

// ── helpers ──────────────────────────────────────────────────────────────────

function translateIfNeeded(sql, dialect) {
  return dialect === 'mssql' ? adaptTSQL(sql) : sql
}

async function runQuery(client, pgSql) {
  const result = await client.query(pgSql)
  const columns = result.fields.map(f => f.name)
  const rows = result.rows.map(row => {
    const out = {}
    columns.forEach(col => {
      const v = row[col]
      out[col] = v === null || v === undefined ? null : v
    })
    return out
  })
  return { columns, rows, error: null }
}

async function execInTransaction(questionId, sql, dialect) {
  const schema = schemaName(questionId)
  const pgSql = translateIfNeeded(sql, dialect)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`SET LOCAL search_path = ${schema}, public`)
    await client.query(`SET LOCAL statement_timeout = '8000'`)
    const result = await runQuery(client, pgSql)
    await client.query('ROLLBACK') // always rollback — read safety
    return result
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    return { columns: [], rows: [], error: err.message }
  } finally {
    client.release()
  }
}

function compareResults(a, b, orderMatters) {
  if (a.rows.length !== b.rows.length) return false
  if (a.columns.length !== b.columns.length) return false
  const serialize = rows =>
    rows.map(row => {
      const norm = {}
      Object.keys(row).sort().forEach(k => { norm[k] = row[k] === null ? '__NULL__' : String(row[k]) })
      return JSON.stringify(norm)
    })
  const u = serialize(a.rows)
  const r = serialize(b.rows)
  if (orderMatters) return u.every((row, i) => row === r[i])
  return [...u].sort().join('\n') === [...r].sort().join('\n')
}

// ── routes ────────────────────────────────────────────────────────────────────

app.get('/api/health', (_, res) => res.json({ ok: true }))

// Execute a query and return raw results (used by Run button)
app.post('/api/execute', async (req, res) => {
  const { questionId, sql, dialect = 'sqlite' } = req.body
  if (!questionId || !sql) return res.status(400).json({ error: 'questionId and sql are required' })
  if (!questionMap[questionId]) return res.status(404).json({ error: `Unknown question: ${questionId}` })

  const result = await execInTransaction(questionId, sql.trim(), dialect)
  res.json(result)
})

// Submit a query: run user SQL + reference solution, return comparison
app.post('/api/submit', async (req, res) => {
  const { questionId, sql, dialect = 'sqlite' } = req.body
  if (!questionId || !sql) return res.status(400).json({ error: 'questionId and sql are required' })
  const q = questionMap[questionId]
  if (!q) return res.status(404).json({ error: `Unknown question: ${questionId}` })

  const refDialect = q.tsql ? 'mssql' : 'sqlite'
  const [userResult, refResult] = await Promise.all([
    execInTransaction(questionId, sql.trim(), dialect),
    execInTransaction(questionId, q.solution.trim(), refDialect),
  ])

  const correct = !userResult.error && !refResult.error
    ? compareResults(userResult, refResult, q.order_matters)
    : false

  res.json({ userResult, refResult, correct })
})

// Return table data for a question (used for schema display + autocomplete)
app.get('/api/questions/:id/tables', async (req, res) => {
  const { id } = req.params
  if (!questionMap[id]) return res.status(404).json({ error: `Unknown question: ${id}` })

  const schema = schemaName(id)
  const client = await pool.connect()
  try {
    await client.query(`SET search_path = ${schema}, public`)
    const tablesRes = await client.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = $1 ORDER BY tablename`, [schema]
    )
    const tables = {}
    for (const { tablename } of tablesRes.rows) {
      const data = await client.query(`SELECT * FROM ${schema}.${tablename}`)
      tables[tablename] = {
        columns: data.fields.map(f => f.name),
        rows: data.rows,
      }
    }
    res.json(tables)
  } catch (err) {
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

app.listen(PORT, () => console.log(`QueryLab API listening on port ${PORT}`))
