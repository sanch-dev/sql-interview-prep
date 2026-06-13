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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { questionId, sql } = req.body
  if (!questionId || !sql) return res.status(400).json({ error: 'questionId and sql required' })
  const q = questionMap[questionId]
  if (!q) return res.status(404).json({ error: `Unknown question: ${questionId}` })

  const schema = schemaName(questionId)
  const tables = tableNames(q.schema)
  const qualifiedSql = qualifyTables(sql.trim(), tables, schema)

  try {
    const pool = await getPool()
    const t0 = Date.now()
    const result = await pool.request().query(qualifiedSql)
    const executionTime = Date.now() - t0
    const recordset = result.recordset || []
    const columns = recordset.length > 0 ? Object.keys(recordset[0]) : []
    const rows = recordset.map(r => { const o = {}; columns.forEach(c => { o[c] = r[c] === undefined ? null : r[c] }); return o })
    res.json({ columns, rows, error: null, executionTime })
  } catch (err) {
    res.json({ columns: [], rows: [], error: err.message, executionTime: null })
  }
}
