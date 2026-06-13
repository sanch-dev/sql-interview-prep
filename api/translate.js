/**
 * Translates T-SQL syntax to PostgreSQL-compatible SQL.
 * Covers the most common interview-prep patterns.
 */
function adaptTSQL(sql) {
  let out = sql

  // Remove table hints: WITH (NOLOCK), WITH(UPDLOCK), etc.
  out = out.replace(/\bWITH\s*\(\s*(?:NO(?:LOCK|EXPAND)|READ(?:UNCOMMITTED|COMMITTED|PAST)|UPDLOCK|ROWLOCK|TABLOCK|TABLOCKX|HOLDLOCK|XLOCK|PAGLOCK|NOWAIT)\s*\)/gi, '')

  // SELECT TOP N / SELECT TOP (N)  →  SELECT ... LIMIT N
  let topN = null
  out = out.replace(/\bSELECT\s+TOP\s+\(?\s*(\d+)\s*\)?\s+/gi, (_, n) => {
    topN = n
    return 'SELECT '
  })
  if (topN !== null) {
    out = out.replace(/\bLIMIT\s+\d+\s*$/i, '').trimEnd() + ` LIMIT ${topN}`
  }

  // ISNULL(a, b)  →  COALESCE(a, b)
  out = out.replace(/\bISNULL\s*\(/gi, 'COALESCE(')

  // LEN(x)  →  LENGTH(x)
  out = out.replace(/\bLEN\s*\(/gi, 'LENGTH(')

  // GETDATE() / GETUTCDATE()  →  CURRENT_TIMESTAMP
  out = out.replace(/\bGET(?:UTC)?DATE\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP')

  // CHARINDEX(needle, haystack)  →  STRPOS(haystack, needle)
  out = out.replace(/\bCHARINDEX\s*\(\s*([^,]+),\s*([^)]+)\)/gi, (_, needle, haystack) =>
    `STRPOS(${haystack.trim()}, ${needle.trim()})`
  )

  // DATEADD(part, n, date)  →  (date + INTERVAL 'n part')
  out = out.replace(/\bDATEADD\s*\(\s*(year|month|day|hour|minute|second)\s*,\s*(-?\d+)\s*,\s*([^)]+)\)/gi,
    (_, part, n, date) => `(${date.trim()}::date + INTERVAL '${n} ${part}s')::date::text`
  )

  // DATEDIFF(part, start, end)  →  EXTRACT(...)
  out = out.replace(/\bDATEDIFF\s*\(\s*(year|month|day|hour|minute|second)\s*,\s*([^,]+),\s*([^)]+)\)/gi,
    (_, part, d1, d2) => {
      const s = d1.trim(), e = d2.trim()
      if (part.toLowerCase() === 'day')    return `EXTRACT(day FROM (${e}::timestamp - ${s}::timestamp))::int`
      if (part.toLowerCase() === 'hour')   return `EXTRACT(epoch FROM (${e}::timestamp - ${s}::timestamp))::int / 3600`
      if (part.toLowerCase() === 'minute') return `EXTRACT(epoch FROM (${e}::timestamp - ${s}::timestamp))::int / 60`
      if (part.toLowerCase() === 'second') return `EXTRACT(epoch FROM (${e}::timestamp - ${s}::timestamp))::int`
      if (part.toLowerCase() === 'month')  return `(EXTRACT(year FROM AGE(${e}::date, ${s}::date)) * 12 + EXTRACT(month FROM AGE(${e}::date, ${s}::date)))::int`
      if (part.toLowerCase() === 'year')   return `EXTRACT(year FROM AGE(${e}::date, ${s}::date))::int`
      return `EXTRACT(${part} FROM (${e}::timestamp - ${s}::timestamp))::int`
    }
  )

  // CONVERT(type, expr) / CONVERT(type, expr, style)  →  CAST(expr AS type)
  out = out.replace(/\bCONVERT\s*\(\s*(\w+(?:\s*\(\s*\d+\s*\))?)\s*,\s*([^,)]+)(?:,\s*[^)]+)?\)/gi,
    (_, type, expr) => {
      const pgType = sqlServerTypeToPg(type.trim())
      return `CAST(${expr.trim()} AS ${pgType})`
    }
  )

  // TRY_CAST(expr AS type)  →  CAST(expr AS type)
  out = out.replace(/\bTRY_CAST\s*\(\s*([^A]+)\s+AS\s+(\w+(?:\s*\(\s*\d+\s*\))?)\s*\)/gi,
    (_, expr, type) => `CAST(${expr.trim()} AS ${sqlServerTypeToPg(type.trim())})`
  )

  // TRY_CONVERT(type, expr)  →  CAST(expr AS type)
  out = out.replace(/\bTRY_CONVERT\s*\(\s*(\w+(?:\s*\(\s*\d+\s*\))?)\s*,\s*([^)]+)\)/gi,
    (_, type, expr) => `CAST(${expr.trim()} AS ${sqlServerTypeToPg(type.trim())})`
  )

  // STUFF(str, start, len, replacement)  →  OVERLAY(str PLACING replacement FROM start FOR len)
  out = out.replace(/\bSTUFF\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/gi,
    (_, str, start, len, repl) =>
      `OVERLAY(${str.trim()} PLACING ${repl.trim()} FROM ${start.trim()} FOR ${len.trim()})`
  )

  // STRING_SPLIT(str, delim) — PostgreSQL uses regexp_split_to_table
  out = out.replace(/\bSTRING_SPLIT\s*\(\s*([^,]+),\s*([^)]+)\)/gi,
    (_, str, delim) => `regexp_split_to_table(${str.trim()}, ${delim.trim()})`
  )

  // NVARCHAR / VARCHAR types in DDL contexts (shouldn't appear in SELECT but just in case)
  out = out.replace(/\bNVARCHAR\s*\(/gi, 'VARCHAR(')
  out = out.replace(/\bDATETIME2\b/gi, 'TIMESTAMP')
  out = out.replace(/\bDATETIME\b/gi, 'TIMESTAMP')
  out = out.replace(/\bUNIQUEIDENTIFIER\b/gi, 'UUID')

  return out
}

function sqlServerTypeToPg(t) {
  const map = {
    'INT': 'INTEGER', 'BIGINT': 'BIGINT', 'SMALLINT': 'SMALLINT', 'TINYINT': 'SMALLINT',
    'FLOAT': 'DOUBLE PRECISION', 'REAL': 'REAL', 'MONEY': 'NUMERIC(19,4)',
    'NVARCHAR': 'VARCHAR', 'VARCHAR': 'VARCHAR', 'NCHAR': 'CHAR', 'CHAR': 'CHAR',
    'TEXT': 'TEXT', 'NTEXT': 'TEXT',
    'DATETIME': 'TIMESTAMP', 'DATETIME2': 'TIMESTAMP', 'DATE': 'DATE', 'TIME': 'TIME',
    'BIT': 'BOOLEAN', 'UNIQUEIDENTIFIER': 'UUID',
  }
  const upper = t.toUpperCase().replace(/\s*\(\s*\d+\s*\)/, '')
  return map[upper] || t
}

module.exports = { adaptTSQL }
