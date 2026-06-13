export function adaptTSQL(sql) {
  let out = sql
  out = out.replace(/\bWITH\s*\(\s*(?:NO(?:LOCK|EXPAND)|READ(?:UNCOMMITTED|COMMITTED|PAST)|UPDLOCK|ROWLOCK|TABLOCK|TABLOCKX|HOLDLOCK|XLOCK|PAGLOCK|NOWAIT)\s*\)/gi, '')
  let topN = null
  out = out.replace(/\bSELECT\s+TOP\s+\(?\s*(\d+)\s*\)?\s+/gi, (_, n) => { topN = n; return 'SELECT ' })
  if (topN !== null) out = out.replace(/\bLIMIT\s+\d+\s*$/i, '').trimEnd() + ` LIMIT ${topN}`
  out = out.replace(/\bISNULL\s*\(/gi, 'COALESCE(')
  out = out.replace(/\bLEN\s*\(/gi, 'LENGTH(')
  out = out.replace(/\bGET(?:UTC)?DATE\s*\(\s*\)/gi, 'CURRENT_TIMESTAMP')
  out = out.replace(/\bCHARINDEX\s*\(\s*([^,]+),\s*([^)]+)\)/gi, (_, needle, haystack) =>
    `STRPOS(${haystack.trim()}, ${needle.trim()})`
  )
  out = out.replace(/\bDATEADD\s*\(\s*(year|month|day|hour|minute|second)\s*,\s*(-?\d+)\s*,\s*([^)]+)\)/gi,
    (_, part, n, date) => `(${date.trim()} + INTERVAL '${n} ${part}s')`
  )
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
  out = out.replace(/\bCONVERT\s*\(\s*(\w+(?:\s*\(\s*\d+\s*\))?)\s*,\s*([^,)]+)(?:,\s*[^)]+)?\)/gi,
    (_, type, expr) => `CAST(${expr.trim()} AS ${type.trim()})`
  )
  out = out.replace(/\bTRY_CAST\s*\(\s*([^A]+)\s+AS\s+(\w+(?:\s*\(\s*\d+\s*\))?)\s*\)/gi,
    (_, expr, type) => `CAST(${expr.trim()} AS ${type.trim()})`
  )
  out = out.replace(/\bSTUFF\s*\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)/gi,
    (_, str, start, len, repl) => `OVERLAY(${str.trim()} PLACING ${repl.trim()} FROM ${start.trim()} FOR ${len.trim()})`
  )
  out = out.replace(/\bNVARCHAR\s*\(/gi, 'VARCHAR(')
  out = out.replace(/\bDATETIME2\b/gi, 'TIMESTAMP')
  out = out.replace(/\bDATETIME\b/gi, 'TIMESTAMP')
  return out
}
