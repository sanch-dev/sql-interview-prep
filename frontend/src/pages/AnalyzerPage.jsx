import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

// ── Analysis engine ───────────────────────────────────────────────────────────

function analyzeSQL(raw) {
  if (!raw.trim()) return null
  const u = raw.toUpperCase()

  const metrics = []
  const warnings = []
  const suggestions = []
  let score = 0

  // --- Metrics ---------------------------------------------------------------
  const selectCount  = (u.match(/\bSELECT\b/g)  || []).length
  const joinCount    = (u.match(/\bJOIN\b/g)     || []).length
  const subqueries   = Math.max(0, selectCount - 1)
  const windowFns    = (u.match(/\bOVER\s*\(/g)  || []).length
  const cteCount     = (u.match(/\bWITH\b/g)     || []).length
  const unionCount   = (u.match(/\bUNION\b/g)    || []).length
  const groupCount   = (u.match(/\bGROUP\s+BY\b/g) || []).length
  const orderCount   = (u.match(/\bORDER\s+BY\b/g) || []).length

  if (joinCount   > 0) metrics.push({ label: 'JOINs',            value: joinCount,  color: 'blue'   })
  if (subqueries  > 0) metrics.push({ label: 'Subqueries',       value: subqueries, color: 'orange' })
  if (windowFns   > 0) metrics.push({ label: 'Window Functions', value: windowFns,  color: 'purple' })
  if (cteCount    > 0) metrics.push({ label: 'CTEs',             value: cteCount,   color: 'green'  })
  if (groupCount  > 0) metrics.push({ label: 'Aggregations',     value: groupCount, color: 'teal'   })
  if (orderCount  > 0) metrics.push({ label: 'Sorts',            value: orderCount, color: 'gray'   })

  // --- Complexity score ------------------------------------------------------
  score += joinCount   * 10
  score += subqueries  * 15
  score += windowFns   * 8
  score += cteCount    * 5
  score += groupCount  * 5
  score += unionCount  * 8

  let complexity, complexityColor
  if      (score === 0)  { complexity = 'Trivial';  complexityColor = 'gray'   }
  else if (score < 15)   { complexity = 'Low';      complexityColor = 'green'  }
  else if (score < 35)   { complexity = 'Medium';   complexityColor = 'orange' }
  else if (score < 60)   { complexity = 'High';     complexityColor = 'red'    }
  else                   { complexity = 'Very High'; complexityColor = 'red'   }

  // --- Warnings & Suggestions ------------------------------------------------

  if (/SELECT\s+\*/i.test(raw)) {
    warnings.push({
      level: 'warning',
      title: 'SELECT *',
      detail: 'Avoid SELECT * — list columns explicitly. It transfers unnecessary data and breaks if the table schema changes.',
    })
  }

  if (subqueries > 0 && cteCount === 0) {
    suggestions.push({
      level: 'tip',
      title: 'Consider CTEs over nested subqueries',
      detail: 'Rewriting nested subqueries as CTEs (WITH clause) makes queries dramatically easier to read and debug. Performance is often equivalent or better.',
      alternative: `WITH subquery_name AS (\n  -- move your subquery here\n)\nSELECT ...\nFROM subquery_name\nJOIN ...`,
    })
  }

  if (/\bNOT\s+IN\b/i.test(raw)) {
    warnings.push({
      level: 'warning',
      title: 'NOT IN with potential NULLs',
      detail: 'NOT IN returns zero rows if the subquery contains even one NULL. Use NOT EXISTS or LEFT JOIN + IS NULL instead.',
      alternative: `-- Safer alternative\nSELECT * FROM a\nWHERE NOT EXISTS (\n  SELECT 1 FROM b WHERE b.id = a.id\n)`,
    })
  }

  if (/\bDISTINCT\b/i.test(raw) && joinCount > 0) {
    suggestions.push({
      level: 'tip',
      title: 'DISTINCT masking a JOIN problem?',
      detail: 'DISTINCT after a JOIN often hides a many-to-many fan-out. Verify your JOIN conditions are correct first — DISTINCT may be treating a symptom rather than the cause.',
    })
  }

  if (/WHERE\s+\w+\s*\(/i.test(raw)) {
    warnings.push({
      level: 'warning',
      title: 'Function applied to column in WHERE',
      detail: 'Wrapping a column in a function (e.g., YEAR(created_at) = 2024) prevents the database from using an index on that column.',
      alternative: `-- Instead of: WHERE YEAR(order_date) = 2024\n-- Use a range:\nWHERE order_date >= '2024-01-01'\n  AND order_date <  '2025-01-01'`,
    })
  }

  if (/\bOR\b/i.test(raw) && /\bWHERE\b/i.test(raw)) {
    suggestions.push({
      level: 'tip',
      title: 'OR in WHERE may prevent index usage',
      detail: 'A WHERE clause with OR can make indexes less effective. Consider UNION ALL of two queries, each using a single index-friendly condition.',
    })
  }

  if (joinCount >= 3 && !/(INDEX|EXPLAIN)/i.test(raw)) {
    suggestions.push({
      level: 'tip',
      title: `${joinCount} JOINs — check indexes on join keys`,
      detail: 'With 3+ JOINs, ensure every ON column has an index. Without them, each JOIN may require a full table scan.',
    })
  }

  if (subqueries >= 2) {
    suggestions.push({
      level: 'tip',
      title: 'Multiple subqueries — consider window functions',
      detail: 'Multiple correlated subqueries computing aggregations (max, avg, rank) are usually replaceable by a single window function pass — orders of magnitude faster.',
    })
  }

  if (!/\bLIMIT\b|\bTOP\b/i.test(raw) && /\bORDER\s+BY\b/i.test(raw) && !windowFns) {
    suggestions.push({
      level: 'info',
      title: 'No LIMIT on ordered query',
      detail: 'If you only need the top N rows, add LIMIT N. Sorting the full result set and discarding most of it is wasteful.',
    })
  }

  const lineCount = raw.trim().split('\n').length
  if (lineCount > 1 && !/^\s*--/m.test(raw) && score > 20) {
    suggestions.push({
      level: 'info',
      title: 'Complex query — add inline comments',
      detail: 'For queries with multiple JOINs or CTEs, add -- comments explaining the intent of each section. Your future self (and interviewers) will thank you.',
    })
  }

  return { complexity, complexityColor, score, metrics, warnings, suggestions }
}

// ── Icon helpers ──────────────────────────────────────────────────────────────

const LEVEL_ICON = { warning: '⚠', tip: '💡', info: 'ℹ' }
const LEVEL_CLASS = { warning: 'analysis-warning', tip: 'analysis-tip', info: 'analysis-info' }

// ── Component ─────────────────────────────────────────────────────────────────

const PLACEHOLDER = `-- Paste any SQL query here and click "Analyze"
SELECT
  c.name,
  COUNT(o.order_id)  AS order_count,
  SUM(o.total)       AS lifetime_value,
  RANK() OVER (ORDER BY SUM(o.total) DESC) AS value_rank
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
HAVING COUNT(o.order_id) > 0
ORDER BY lifetime_value DESC
LIMIT 20;`

export default function AnalyzerPage({ theme }) {
  const [query, setQuery]       = useState(PLACEHOLDER)
  const [result, setResult]     = useState(null)
  const isDark = theme === 'dark'

  function handleAnalyze() {
    setResult(analyzeSQL(query))
  }

  return (
    <div className="page-full analyzer-page">
      <div className="page-header">
        <h1 className="page-title">Query Performance Analyzer</h1>
        <p className="page-subtitle">
          Paste any SQL query to get instant feedback on complexity, anti-patterns, and performance suggestions.
        </p>
      </div>

      <div className="analyzer-layout">
        <div className="analyzer-editor-section">
          <div className="analyzer-editor-header">
            <span className="analyzer-editor-label">SQL Query</span>
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze}>⚡ Analyze</button>
          </div>
          <CodeMirror
            value={query}
            onChange={setQuery}
            extensions={[sql()]}
            theme={isDark ? oneDark : 'light'}
            basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: false }}
            className="analyzer-editor"
          />
        </div>

        <div className="analyzer-results-section">
          {!result && (
            <div className="analyzer-placeholder">
              <div className="analyzer-placeholder-icon">⚡</div>
              <div className="analyzer-placeholder-text">Paste a query and click Analyze</div>
            </div>
          )}

          {result && (
            <div className="analyzer-output">
              <div className="analyzer-complexity-banner">
                <span className={`complexity-badge complexity-${result.complexityColor}`}>
                  {result.complexity}
                </span>
                <span className="complexity-label">complexity</span>
                <span className="complexity-score">score: {result.score}</span>
              </div>

              {result.metrics.length > 0 && (
                <div className="analyzer-metrics">
                  {result.metrics.map(m => (
                    <div key={m.label} className={`metric-chip metric-${m.color}`}>
                      <span className="metric-value">{m.value}</span>
                      <span className="metric-label">{m.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className="analyzer-section">
                  <div className="analyzer-section-title">Warnings</div>
                  {result.warnings.map((w, i) => (
                    <div key={i} className={`analysis-item ${LEVEL_CLASS[w.level]}`}>
                      <div className="analysis-item-header">
                        <span className="analysis-icon">{LEVEL_ICON[w.level]}</span>
                        <strong>{w.title}</strong>
                      </div>
                      <p className="analysis-detail">{w.detail}</p>
                      {w.alternative && (
                        <CodeMirror
                          value={w.alternative}
                          extensions={[sql()]}
                          theme={isDark ? oneDark : 'light'}
                          editable={false}
                          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, autocompletion: false }}
                          className="analysis-code"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.suggestions.length > 0 && (
                <div className="analyzer-section">
                  <div className="analyzer-section-title">Suggestions</div>
                  {result.suggestions.map((s, i) => (
                    <div key={i} className={`analysis-item ${LEVEL_CLASS[s.level]}`}>
                      <div className="analysis-item-header">
                        <span className="analysis-icon">{LEVEL_ICON[s.level]}</span>
                        <strong>{s.title}</strong>
                      </div>
                      <p className="analysis-detail">{s.detail}</p>
                      {s.alternative && (
                        <CodeMirror
                          value={s.alternative}
                          extensions={[sql()]}
                          theme={isDark ? oneDark : 'light'}
                          editable={false}
                          basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, autocompletion: false }}
                          className="analysis-code"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {result.warnings.length === 0 && result.suggestions.length === 0 && (
                <div className="analysis-all-good">
                  ✓ No issues detected — this query looks clean!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
