const { getPool } = require('../../_db')
const questions = require('../../questions.json')

const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))
const schemaName = id => 'q_' + id.replace(/-/g, '_')

module.exports = async function handler(req, res) {
  const { id } = req.query
  if (!questionMap[id]) return res.status(404).json({ error: `Unknown question: ${id}` })
  const schema = schemaName(id)

  try {
    const pool = await getPool()
    const tablesRes = await pool.request().query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schema}' ORDER BY TABLE_NAME`
    )
    const result = {}
    for (const { TABLE_NAME } of tablesRes.recordset) {
      const data = await pool.request().query(`SELECT TOP 200 * FROM [${schema}].[${TABLE_NAME}]`)
      const recordset = data.recordset || []
      const columns = recordset.length > 0 ? Object.keys(recordset[0]) : []
      const rows = recordset.map(r => { const o = {}; columns.forEach(c => { o[c] = r[c] === undefined ? null : r[c] }); return o })
      result[TABLE_NAME] = { columns, rows }
    }
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
