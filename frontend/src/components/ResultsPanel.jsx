function escapeHtml(text) {
  return String(text ?? 'NULL')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const TSQL_ALTERNATIVES = {
  ISNULL:    'Use COALESCE(a, b) instead.',
  LEN:       'Use LENGTH() instead.',
  GETDATE:   "Use DATE('now') instead.",
  GETUTCDATE:"Use DATE('now') instead.",
  DATEPART:  "Use strftime() instead, e.g. strftime('%m', col).",
  DATEDIFF:  'Use julianday() arithmetic: julianday(end) - julianday(start).',
  CONVERT:   'Use CAST(value AS type) instead.',
  CHARINDEX: 'Use INSTR(haystack, needle) — note the argument order is reversed.',
  PATINDEX:  'SQLite has no PATINDEX; use INSTR() for simple substring checks.',
  STUFF:     'SQLite has no STUFF; use SUBSTR() and concatenation.',
  DATEADD:   "Use datetime(col, '+N days') or similar strftime modifiers.",
}

function humanizeError(rawError, tableNames = [], dialectKey = 'sqlite') {
  if (!rawError) return rawError
  const err = rawError.replace(/^SQL Error:\s*/i, '').replace(/^Schema error:\s*/i, '')

  const checks = [
    [/near "([^"]+)":\s*syntax error/i, (_, tok) =>
      `Syntax error near \`${tok}\`.\n\nCommon causes:\n• Typo in a keyword or function name\n• Missing comma between columns\n• Unmatched parenthesis\n• Clause in wrong order (e.g. WHERE after GROUP BY)`],

    [/no such table:\s*(\S+)/i, (_, t) => {
      const hint = tableNames.length
        ? `\n\nAvailable tables: ${tableNames.map((n) => `\`${n}\``).join(', ')}`
        : ''
      return `Table \`${t}\` doesn't exist.${hint}`
    }],

    [/no such column:\s*(\S+)/i, (_, c) =>
      `Column \`${c}\` not found.\n\nCheck:\n• Spelling of the column name\n• You're querying the correct table\n• You haven't aliased the column and used the alias in WHERE (use a subquery or CTE instead)`],

    [/ambiguous column name:\s*(\S+)/i, (_, c) =>
      `Column \`${c}\` exists in multiple tables.\n\nFix: qualify it with the table name, e.g. \`tablename.${c}\``],

    [/no such function:\s*(\S+)/i, (_, f) => {
      const alt = TSQL_ALTERNATIVES[f.toUpperCase()]
      const modeHint = dialectKey === 'mssql' ? ' This function was not auto-adapted.' : ''
      return `Function \`${f}()\` is not available in SQLite.${modeHint}${alt ? `\n\n${alt}` : ''}`
    }],

    [/UNIQUE constraint failed:\s*(\S+)/i, (_, col) =>
      `Duplicate value on \`${col}\` — this column requires unique values.`],

    [/NOT NULL constraint failed:\s*(\S+)/i, (_, col) =>
      `\`${col}\` cannot be NULL — a value is required for this column.`],

    [/unrecognized token:\s*"([^"]+)"/i, (_, tok) =>
      `Unrecognized token \`${tok}\`.\n\nCheck for unsupported syntax or special characters.`],

    [/incomplete input/i, () =>
      `Incomplete query — the SQL looks unfinished. Check for unclosed parentheses or a dangling keyword.`],

    [/no tables specified/i, () =>
      `No table specified. Make sure your query includes a FROM clause.`],
  ]

  for (const [pattern, format] of checks) {
    const m = err.match(pattern)
    if (m) return format(...m)
  }
  return err
}

function ResultTable({ columns, rows, label, rowTags }) {
  return (
    <div className="diff-table-wrap">
      {label && <div className="diff-table-label">{label}</div>}
      {rows.length === 0 ? (
        <div className="results-empty">0 rows</div>
      ) : (
        <table className="results-table">
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={rowTags?.[i] ? `diff-row-${rowTags[i]}` : ''}>
                {columns.map((c) => (
                  <td key={c} className={row[c] === null ? 'cell-null' : ''}
                    dangerouslySetInnerHTML={{ __html: escapeHtml(row[c]) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="results-footer">{rows.length} row{rows.length !== 1 ? 's' : ''}</div>
    </div>
  )
}

function tagRows(userRows, refRows, columns) {
  const serialize = (row) => columns.map((c) => String(row[c] ?? '__NULL__')).join('\x00')
  const refCounts = new Map()
  refRows.forEach((row) => {
    const k = serialize(row)
    refCounts.set(k, (refCounts.get(k) || 0) + 1)
  })
  return userRows.map((row) => {
    const k = serialize(row)
    const n = refCounts.get(k) || 0
    if (n > 0) { refCounts.set(k, n - 1); return 'match' }
    return 'extra'
  })
}

export default function ResultsPanel({ result, refResult, isRunning, tableNames = [], dialectKey = 'sqlite', height }) {
  const style = height ? { height, minHeight: height } : {}

  if (isRunning) return (
    <div className="results-panel" style={style}>
      <div className="results-loading">Running…</div>
    </div>
  )

  if (!result) return (
    <div className="results-panel" style={style}>
      <div className="results-empty">Run a query to see results (<kbd>Ctrl+Enter</kbd>)</div>
    </div>
  )

  if (result.error) {
    const friendly = humanizeError(result.error, tableNames, dialectKey)
    return (
      <div className="results-panel" style={style}>
        <div className="results-banner results-error">
          <span className="banner-icon">✕</span>
          <div className="error-body">
            <div className="error-headline">Error</div>
            <pre className="error-text">{friendly}</pre>
            {friendly !== result.error.replace(/^SQL Error:\s*/i, '') && (
              <details className="error-raw">
                <summary>Raw error</summary>
                <pre>{result.error}</pre>
              </details>
            )}
          </div>
        </div>
      </div>
    )
  }

  const isSubmit     = result.type === 'submit'
  const correct      = result.correct
  const showDiff     = isSubmit && !correct && refResult && !refResult.error
  const showExpected = isSubmit && correct && refResult && !refResult.error

  const allColumns = showDiff ? [...new Set([...result.columns, ...refResult.columns])] : result.columns
  const rowTags    = showDiff ? tagRows(result.rows, refResult.rows, allColumns) : null

  return (
    <div className="results-panel" style={style}>
      {isSubmit && (
        <div className={`results-banner ${correct ? 'results-correct' : 'results-wrong'}`}>
          {correct
            ? <><span className="banner-icon">✓</span> Correct! Great work.</>
            : <><span className="banner-icon">✕</span> Not quite — see the diff below.</>}
        </div>
      )}

      {showDiff ? (
        <div className="diff-scroll">
          <div className="diff-legend">
            <span className="diff-legend-item diff-legend-extra">Extra / wrong row</span>
            <span className="diff-legend-item diff-legend-match">Correct row</span>
          </div>
          <div className="diff-tables">
            <ResultTable columns={allColumns} rows={result.rows} label="Your output" rowTags={rowTags} />
            <ResultTable columns={refResult.columns} rows={refResult.rows} label="Expected output" />
          </div>
        </div>
      ) : (
        <div className="results-scroll">
          {result.rows.length === 0 ? (
            <div className="results-empty">Query returned 0 rows.</div>
          ) : (
            <>
              <table className="results-table">
                <thead><tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((c) => (
                        <td key={c} className={row[c] === null ? 'cell-null' : ''}
                          dangerouslySetInnerHTML={{ __html: escapeHtml(row[c]) }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="results-footer">
                {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
                {result.executionTime != null && <span className="footer-time"> · {result.executionTime} ms</span>}
              </div>
            </>
          )}
          {showExpected && (
            <div className="expected-section">
              <div className="expected-label">Expected output</div>
              <ResultTable columns={refResult.columns} rows={refResult.rows} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
