/**
 * Converts SQLite reference solutions to T-SQL for execution on Azure SQL.
 * Applied only to reference solutions — user queries run natively as T-SQL.
 */
function sqliteToMSSQL(sql) {
  let out = sql

  // date('now') → CAST(GETDATE() AS DATE)
  out = out.replace(/\bdate\s*\(\s*'now'\s*\)/gi, 'CAST(GETDATE() AS DATE)')

  // date('now', '+/-N part') → DATEADD(...)
  out = out.replace(
    /\bdate\s*\(\s*'now'\s*,\s*'([+-])(\d+)\s+(day|days|month|months|year|years)'\s*\)/gi,
    (_, sign, n, unit) =>
      `DATEADD(${unit.replace(/s$/, '')}, ${sign === '-' ? -n : +n}, CAST(GETDATE() AS DATE))`
  )

  // date(col, 'sign' || expr || ' part') — dynamic modifier (SQLite streak trick)
  // e.g. date(login_date, '-' || ROW_NUMBER() OVER (...) || ' day')
  out = out.replace(
    /\bdate\s*\(\s*([^,)]+)\s*,\s*'(-|\+)'\s*\+\|\+\s*(.+?)\s*\+\|\+\s*'\s*(day|days|month|months|year|years)\s*'\s*\)/gi,
    (_, col, sign, expr, unit) =>
      `DATEADD(${unit.replace(/s$/, '')}, ${sign === '-' ? '-('+expr.trim()+')' : expr.trim()}, TRY_CAST(${col.trim()} AS DATE))`
  )
  // Same pattern but with || before being replaced
  out = out.replace(
    /\bdate\s*\(\s*([^,)]+)\s*,\s*'(-|\+)'\s*\|\|\s*(.+?)\s*\|\|\s*'\s*(day|days|month|months|year|years)\s*'\s*\)/gi,
    (_, col, sign, expr, unit) =>
      `DATEADD(${unit.replace(/s$/, '')}, ${sign === '-' ? '-('+expr.trim()+')' : expr.trim()}, TRY_CAST(${col.trim()} AS DATE))`
  )

  // date(col, '+/-N part') — static modifier
  out = out.replace(
    /\bdate\s*\(\s*([^,)]+)\s*,\s*'([+-])(\d+)\s+(day|days|month|months|year|years)'\s*\)/gi,
    (_, col, sign, n, unit) =>
      `DATEADD(${unit.replace(/s$/, '')}, ${sign === '-' ? -n : +n}, TRY_CAST(${col.trim()} AS DATE))`
  )

  // date(col) — bare date cast
  out = out.replace(/\bdate\s*\(\s*([^)]+)\s*\)/gi, (_, col) => `TRY_CAST(${col.trim()} AS DATE)`)

  // strftime patterns
  out = out.replace(/\bstrftime\s*\(\s*'%Y-%m-%d'\s*,\s*([^)]+)\s*\)/gi,
    (_, col) => `CONVERT(NVARCHAR(10), TRY_CAST(${col.trim()} AS DATE), 120)`)
  out = out.replace(/\bstrftime\s*\(\s*'%Y-%m'\s*,\s*([^)]+)\s*\)/gi,
    (_, col) => `FORMAT(TRY_CAST(${col.trim()} AS DATE), 'yyyy-MM')`)
  out = out.replace(/\bstrftime\s*\(\s*'%Y'\s*,\s*([^)]+)\s*\)/gi,
    (_, col) => `CAST(YEAR(TRY_CAST(${col.trim()} AS DATE)) AS NVARCHAR(4))`)
  out = out.replace(/\bstrftime\s*\(\s*'%m'\s*,\s*([^)]+)\s*\)/gi,
    (_, col) => `RIGHT('0'+CAST(MONTH(TRY_CAST(${col.trim()} AS DATE)) AS NVARCHAR(2)),2)`)
  // %w = day of week 0(Sun)..6(Sat) — SQL Server DATEPART weekday is 1(Sun)..7(Sat)
  out = out.replace(/\bstrftime\s*\(\s*'%w'\s*,\s*([^)]+)\s*\)/gi,
    (_, col) => `CAST(DATEPART(weekday, TRY_CAST(${col.trim()} AS DATE)) - 1 AS NVARCHAR(1))`)

  // JULIANDAY(col) — used for date-diff; relativise to a fixed epoch so subtraction still works.
  // If value is 'YYYY-MM' (len=7), append '-01' to make it a valid date.
  out = out.replace(/\bJULIANDAY\s*\(\s*([^)]+)\s*\)/gi, (_, col) => {
    const c = col.trim()
    return `CAST(DATEDIFF(day,'2000-01-01',TRY_CAST(CASE WHEN LEN(${c})=7 THEN ${c}+'-01' ELSE ${c} END AS DATE)) AS FLOAT)`
  })

  // IFNULL → ISNULL
  out = out.replace(/\bIFNULL\s*\(/gi, 'ISNULL(')

  // group_concat → STRING_AGG
  out = out.replace(/\bgroup_concat\s*\(\s*([^,)]+)\s*,\s*([^)]+)\s*\)/gi,
    (_, col, sep) => `STRING_AGG(${col.trim()}, ${sep.trim()})`)
  out = out.replace(/\bgroup_concat\s*\(\s*([^)]+)\s*\)/gi,
    (_, col) => `STRING_AGG(${col.trim()}, ',')`)

  // substr → SUBSTRING
  out = out.replace(/\bsubstr\s*\(/gi, 'SUBSTRING(')

  // || (string concat) → +
  out = out.replace(/\|\|/g, '+')

  // CAST type names
  out = out.replace(/\bAS\s+TEXT\b/gi, 'AS NVARCHAR(MAX)')
  out = out.replace(/\bAS\s+INTEGER\b/gi, 'AS INT')
  out = out.replace(/\bAS\s+REAL\b/gi, 'AS FLOAT')

  return out
}

module.exports = { sqliteToMSSQL }
