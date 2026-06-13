const { getPool } = require('./_db')
const questions = require('./questions.json')

const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))
const schemaName = id => 'q_' + id.replace(/-/g, '_')

function tableNames(schemaSql) {
  return [...schemaSql.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`\[]?(\w+)["'`\]]?/gi)].map(m => m[1])
}

function qualifyTables(userSql, tables, schema) {
  let out = userSql
  for (const t of tables) {
    out = out.replace(new RegExp('(?<![.\\[])\\b' + t + '\\b', 'gi'), `[${schema}].[${t}]`)
  }
  return out
}

async function execQuery(pool, sql) {
  try {
    const result = await pool.request().query(sql)
    const recordset = result.recordset || []
    const columns = recordset.length > 0 ? Object.keys(recordset[0]) : []
    const rows = recordset.map(r => { const o = {}; columns.forEach(c => { o[c] = r[c] === undefined ? null : r[c] }); return o })
    return { columns, rows, error: null }
  } catch (err) {
    return { columns: [], rows: [], error: err.message }
  }
}

function compare(a, b, orderMatters) {
  if (a.rows.length !== b.rows.length || a.columns.length !== b.columns.length) return false
  const s = rows => rows.map(row => { const n = {}; Object.keys(row).sort().forEach(k => { n[k] = row[k] === null ? '__NULL__' : String(row[k]) }); return JSON.stringify(n) })
  const u = s(a.rows), r = s(b.rows)
  return orderMatters ? u.every((row, i) => row === r[i]) : [...u].sort().join('\n') === [...r].sort().join('\n')
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { questionId, sql } = req.body
  if (!questionId || !sql) return res.status(400).json({ error: 'questionId and sql required' })
  const q = questionMap[questionId]
  if (!q) return res.status(404).json({ error: `Unknown question: ${questionId}` })

  const schema = schemaName(questionId)
  const tables = tableNames(q.schema)
  const qualify = s => qualifyTables(s.trim(), tables, schema)

  const pool = await getPool()
  const [userResult, refResult] = await Promise.all([
    execQuery(pool, qualify(sql)),
    execQuery(pool, qualify(q.solution)),
  ])
  const correct = !userResult.error && !refResult.error && compare(userResult, refResult, q.order_matters)
  res.json({ userResult, refResult, correct })
}
