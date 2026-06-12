let sqlJsInstance = null

async function getSqlJs() {
  if (sqlJsInstance) return sqlJsInstance
  sqlJsInstance = await window.initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
  })
  return sqlJsInstance
}

export async function executeSQL(sql, schema) {
  let db = null
  try {
    const SQL = await getSqlJs()
    db = new SQL.Database()
    db.run(schema)
  } catch (e) {
    db?.close()
    return { error: 'Schema error: ' + e.message, columns: [], rows: [] }
  }

  try {
    const stmt = db.prepare(sql)
    const columns = stmt.getColumnNames()
    const rows = []
    while (stmt.step()) rows.push(stmt.getAsObject())
    stmt.free()
    db.close()
    return { columns, rows, error: null }
  } catch (e) {
    db.close()
    return { error: 'SQL Error: ' + e.message, columns: [], rows: [] }
  }
}

export function compareResults(userResult, refResult, orderMatters = false) {
  if (userResult.error || refResult.error) return false
  if (userResult.rows.length !== refResult.rows.length) return false
  if (userResult.columns.length !== refResult.columns.length) return false

  const serialize = (rows) =>
    rows.map((row) => {
      const normalized = {}
      Object.keys(row)
        .sort()
        .forEach((k) => {
          const v = row[k]
          normalized[k] = v === null ? '__NULL__' : String(v)
        })
      return JSON.stringify(normalized)
    })

  const u = serialize(userResult.rows)
  const r = serialize(refResult.rows)

  if (orderMatters) return u.every((row, i) => row === r[i])
  return [...u].sort().join('\n') === [...r].sort().join('\n')
}
