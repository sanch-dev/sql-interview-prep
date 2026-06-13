const { getPool, sql } = require('./_db')
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
  const { questionId, sqlText } = req.body
  if (!questionId || !sqlText) return res.status(400).json({ error: 'questionId and sqlText required' })
  const q = questionMap[questionId]
  if (!q) return res.status(404).json({ error: `Unknown question: ${questionId}` })

  const schema = schemaName(questionId)
  const tables = tableNames(q.schema)
  const qualifiedSql = qualifyTables(sqlText.trim(), tables, schema)

  // Use a Transaction to pin all three requests to the same physical connection
  const pool = await getPool()
  const tx = new sql.Transaction(pool)
  try {
    await tx.begin()
    await new sql.Request(tx).query('SET SHOWPLAN_TEXT ON')
    const planResult = await new sql.Request(tx).query(qualifiedSql)
    await new sql.Request(tx).query('SET SHOWPLAN_TEXT OFF')
    await tx.rollback()

    // SHOWPLAN_TEXT returns two recordsets: the statement text + the plan tree
    // Each row has a single column with the plan text line
    const allSets = planResult.recordsets || [planResult.recordset || []]
    const lines = allSets.flatMap(rs => rs.map(row => Object.values(row)[0] || ''))

    res.json({ lines })
  } catch (err) {
    try { await tx.rollback() } catch {}
    res.status(500).json({ error: err.message })
  }
}
