function escapeHtml(text) {
  return String(text ?? 'NULL')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function ResultTable({ columns, rows, label, rowTags }) {
  return (
    <div className="diff-table-wrap">
      {label && <div className="diff-table-label">{label}</div>}
      {rows.length === 0 ? (
        <div className="results-empty">0 rows</div>
      ) : (
        <table className="results-table">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={rowTags?.[i] ? `diff-row-${rowTags[i]}` : ''}>
                {columns.map((c) => (
                  <td
                    key={c}
                    className={row[c] === null ? 'cell-null' : ''}
                    dangerouslySetInnerHTML={{ __html: escapeHtml(row[c]) }}
                  />
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
  const serialize = (row) =>
    columns.map((c) => String(row[c] ?? '__NULL__')).join('\x00')

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

export default function ResultsPanel({ result, refResult, isRunning }) {
  if (isRunning) {
    return (
      <div className="results-panel">
        <div className="results-loading">Running…</div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="results-panel">
        <div className="results-empty">Run a query to see results (<kbd>Ctrl+Enter</kbd>)</div>
      </div>
    )
  }

  if (result.error) {
    return (
      <div className="results-panel">
        <div className="results-banner results-error">
          <span className="banner-icon">✕</span>
          <pre className="error-text">{result.error}</pre>
        </div>
      </div>
    )
  }

  const isSubmit = result.type === 'submit'
  const correct  = result.correct
  const showDiff = isSubmit && !correct && refResult && !refResult.error
  const showExpected = isSubmit && correct && refResult && !refResult.error

  const allColumns = showDiff
    ? [...new Set([...result.columns, ...refResult.columns])]
    : result.columns

  const rowTags = showDiff ? tagRows(result.rows, refResult.rows, allColumns) : null

  return (
    <div className="results-panel">
      {isSubmit && (
        <div className={`results-banner ${correct ? 'results-correct' : 'results-wrong'}`}>
          {correct ? (
            <><span className="banner-icon">✓</span> Correct! Great work.</>
          ) : (
            <><span className="banner-icon">✕</span> Not quite — compare your output to the expected below.</>
          )}
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
                <thead>
                  <tr>{result.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((c) => (
                        <td
                          key={c}
                          className={row[c] === null ? 'cell-null' : ''}
                          dangerouslySetInnerHTML={{ __html: escapeHtml(row[c]) }}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="results-footer">{result.rows.length} row{result.rows.length !== 1 ? 's' : ''}</div>
            </>
          )}

          {showExpected && (
            <details className="expected-details">
              <summary className="expected-summary">Expected output</summary>
              <ResultTable columns={refResult.columns} rows={refResult.rows} />
            </details>
          )}
        </div>
      )}
    </div>
  )
}
