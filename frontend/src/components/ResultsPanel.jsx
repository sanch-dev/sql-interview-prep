function escapeHtml(text) {
  return String(text ?? 'NULL')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function ResultsPanel({ result, isRunning }) {
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

  return (
    <div className="results-panel">
      {isSubmit && (
        <div className={`results-banner ${correct ? 'results-correct' : 'results-wrong'}`}>
          {correct ? (
            <><span className="banner-icon">✓</span> Correct! Great work.</>
          ) : (
            <><span className="banner-icon">✕</span> Not quite right — check your output below.</>
          )}
        </div>
      )}

      {result.rows.length === 0 ? (
        <div className="results-empty">Query returned 0 rows.</div>
      ) : (
        <div className="results-scroll">
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
        </div>
      )}
    </div>
  )
}
