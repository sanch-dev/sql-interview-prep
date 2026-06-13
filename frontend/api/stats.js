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

function parseLogicalReads(messages) {
  const reads = {}
  for (const msg of messages) {
    // "Table 'q_e02.employees'. Scan count 0, logical reads 2, ..."
    const m = msg.match(/Table '(?:[^'.]+\.)?([^'.]+)'[^,]*,\s*logical reads (\d+)/i)
    if (m) {
      const tbl = m[1].replace(/[[\]]/g, '')
      reads[tbl] = (reads[tbl] || 0) + parseInt(m[2])
    }
  }
  return reads
}

function parseServerTime(messages) {
  for (const msg of messages) {
    const m = msg.match(/elapsed time\s*=\s*(\d+)\s*ms/i)
    if (m && parseInt(m[1]) > 0) return parseInt(m[1])
  }
  // fallback: pick any non-zero elapsed time
  for (const msg of messages) {
    const m = msg.match(/elapsed time\s*=\s*(\d+)\s*ms/i)
    if (m) return parseInt(m[1])
  }
  return null
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
    const request = pool.request()
    const messages = []
    request.on('info', msg => messages.push(msg.message))

    const t0 = Date.now()
    await request.batch(
      `SET STATISTICS TIME ON\nSET STATISTICS IO ON\n${qualifiedSql}\nSET STATISTICS IO OFF\nSET STATISTICS TIME OFF`
    )
    const clientMs = Date.now() - t0

    res.json({
      clientMs,
      serverMs: parseServerTime(messages),
      logicalReads: parseLogicalReads(messages),
      rawMessages: messages,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
