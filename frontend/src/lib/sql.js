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

export async function getTableData(questionId) {
  try {
    const res = await fetch(`${API}/api/questions/${questionId}/tables`)
    return await res.json()
  } catch {
    return {}
  }
}

export async function getStats(sql, questionId) {
  try {
    const res = await fetch(`${API}/api/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, questionId }),
    })
    return await res.json()
  } catch (err) {
    return { error: `Network error: ${err.message}` }
  }
}

export async function getPlan(sql, questionId) {
  try {
    const res = await fetch(`${API}/api/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sqlText: sql, questionId }),
    })
    return await res.json()
  } catch (err) {
    return { error: `Network error: ${err.message}` }
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
