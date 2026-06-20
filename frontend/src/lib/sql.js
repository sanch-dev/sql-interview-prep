const API = import.meta.env.VITE_API_URL || ''

export async function executeSQL(sql, questionId, dialect = 'sqlite') {
  try {
    const res = await fetch(`${API}/api/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, questionId, dialect }),
    })
    return await res.json()
  } catch (err) {
    return { columns: [], rows: [], error: `Network error: ${err.message}` }
  }
}

export async function submitSQL(sql, questionId, dialect = 'sqlite') {
  try {
    const res = await fetch(`${API}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, questionId, dialect }),
    })
    return await res.json() // { userResult, refResult, correct }
  } catch (err) {
    const errResult = { columns: [], rows: [], error: `Network error: ${err.message}` }
    return { userResult: errResult, refResult: null, correct: false }
  }
}

export function parseSchemaForSampleData(schema) {
  if (!schema) return {}

  const tables = {}

  // Find all CREATE TABLE statements
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`\[]?(\w+)["'`\]]?\s*\(([\s\S]*?)\);/gi
  let tableMatch
  const tableDefinitions = {}

  while ((tableMatch = createTableRegex.exec(schema)) !== null) {
    const tableName = tableMatch[1]
    const columnDefs = tableMatch[2]
    const columns = []

    // Extract column names
    const columnRegex = /(\w+)\s+/g
    let colMatch
    while ((colMatch = columnRegex.exec(columnDefs)) !== null) {
      columns.push(colMatch[1])
    }

    tableDefinitions[tableName] = columns
  }

  // Find all INSERT statements
  const insertRegex = /INSERT\s+INTO\s+["'`\[]?(\w+)["'`\]]?\s+VALUES\s*([\s\S]*?)(?=;|INSERT|$)/gi
  let insertMatch

  while ((insertMatch = insertRegex.exec(schema)) !== null) {
    const tableName = insertMatch[1]
    const valuesStr = insertMatch[2]
    const columns = tableDefinitions[tableName] || []

    if (!tables[tableName]) {
      tables[tableName] = { columns, rows: [] }
    }

    // Parse value tuples: (val1, val2, val3), (val4, val5, val6), ...
    const valueRegex = /\((.*?)\)(?=\s*,|\s*$)/g
    let valueMatch
    while ((valueMatch = valueRegex.exec(valuesStr)) !== null) {
      const values = valueMatch[1]
      const parts = []
      let current = ''
      let inQuote = false
      let quoteChar = null

      for (let i = 0; i < values.length; i++) {
        const char = values[i]
        if ((char === '"' || char === "'" || char === '`') && values[i - 1] !== '\\') {
          if (!inQuote) {
            inQuote = true
            quoteChar = char
          } else if (char === quoteChar) {
            inQuote = false
            quoteChar = null
          } else {
            current += char
          }
        } else if (char === ',' && !inQuote) {
          parts.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      if (current.trim()) parts.push(current.trim())

      // Build row object
      const row = {}
      columns.forEach((col, idx) => {
        let val = parts[idx]?.trim() || null
        // Remove quotes if present
        if (val && ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"')))) {
          val = val.slice(1, -1)
        }
        row[col] = val
      })

      tables[tableName].rows.push(row)
    }
  }

  return tables
}

export async function getTableData(questionId, schema) {
  // Try to parse from schema first
  if (schema) {
    try {
      return parseSchemaForSampleData(schema)
    } catch (err) {
      console.warn('Failed to parse schema:', err)
    }
  }

  // Fallback to API (for backward compatibility)
  try {
    const res = await fetch(`${API}/api/questions/${questionId}/tables`)
    return await res.json()
  } catch {
    return {}
  }
}

export function compareResults(userResult, refResult, orderMatters = false) {
  if (userResult.error || refResult.error) return false
  if (userResult.rows.length !== refResult.rows.length) return false
  if (userResult.columns.length !== refResult.columns.length) return false

  const serialize = (rows) =>
    rows.map((row) => {
      const normalized = {}
      Object.keys(row).sort().forEach((k) => {
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
