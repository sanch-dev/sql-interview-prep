const { getPool } = require('../../_db')
const questions = require('../../questions.json')

const questionMap = Object.fromEntries(questions.map(q => [q.id, q]))

function schemaName(id) {
  return 'q_' + id.replace(/-/g, '_')
}

module.exports = async function handler(req, res) {
  const { id } = req.query
  if (!questionMap[id]) return res.status(404).json({ error: `Unknown question: ${id}` })

  const schema = schemaName(id)
  const client = await getPool().connect()
  try {
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
}
