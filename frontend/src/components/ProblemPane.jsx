import { useEffect, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

const NOTES_KEY = 'sqlforge_notes'

// Maps question categories to one key concept each
const CATEGORY_CONCEPTS = {
  'Filtering': {
    title: 'WHERE Clause Fundamentals',
    body: `WHERE filters rows before any GROUP BY. Key rules:
• AND, OR, NOT — AND has higher precedence than OR; use parentheses when mixing.
• NULL comparisons must use IS NULL / IS NOT NULL (never = NULL).
• IN (list) is shorthand for multiple OR conditions.
• LIKE '%pattern%' for substring match; ILIKE for case-insensitive (PostgreSQL).
• BETWEEN a AND b is inclusive on both ends.`,
  },
  'Aggregation': {
    title: 'GROUP BY & Aggregates',
    body: `Aggregate functions (COUNT, SUM, AVG, MAX, MIN) collapse a group of rows into one value.
• Every non-aggregate column in SELECT must appear in GROUP BY.
• WHERE filters rows before grouping; HAVING filters groups after grouping.
• COUNT(*) counts all rows; COUNT(col) ignores NULLs.
• In interviews: clarify whether NULLs should count and whether DISTINCT is needed.`,
  },
  'Window Functions': {
    title: 'Window Functions (OVER)',
    body: `Window functions compute a value across a "window" of rows without collapsing them.
• RANK() — gaps after ties (1,1,3); DENSE_RANK() — no gaps (1,1,2); ROW_NUMBER() — always unique.
• LAG(col, n) — value from n rows back; LEAD(col, n) — value from n rows ahead.
• PARTITION BY resets the window per group (like GROUP BY without collapsing).
• ORDER BY inside OVER controls which rows are "before" the current row.
• Classic interview question: "Top N per group" → RANK + PARTITION BY + WHERE rank ≤ N in a CTE.`,
  },
  'Joins': {
    title: 'JOIN Types',
    body: `JOIN combines rows from two tables based on a condition.
• INNER JOIN — only matching rows from both tables.
• LEFT JOIN — all rows from left table, NULLs for unmatched right rows.
• Self JOIN — join a table to itself (use aliases: e1, e2).
• Watch for fan-out: joining through a many-to-many table multiplies rows.
• LEFT JOIN + WHERE right.col IS NULL = rows in left with no match in right.`,
  },
  'CTEs': {
    title: 'Common Table Expressions (WITH)',
    body: `A CTE is a named, temporary result set scoped to one query.
• Syntax: WITH cte_name AS (SELECT ...) SELECT ... FROM cte_name
• Chain multiple CTEs with commas in one WITH block.
• Use CTEs instead of nested subqueries for readability.
• Recursive CTEs (WITH RECURSIVE) traverse hierarchies (org charts, graphs).`,
  },
  'Subqueries': {
    title: 'Subqueries',
    body: `A subquery is a SELECT nested inside another query.
• Correlated subquery — references outer query columns; runs once per outer row.
• Scalar subquery — returns exactly one value; usable anywhere an expression is expected.
• EXISTS — returns true as soon as one row is found (short-circuits).
• NOT IN vs NOT EXISTS: prefer NOT EXISTS when the subquery might return NULLs.
• Performance: correlated subqueries on large tables can be slow; consider JOIN + CTE.`,
  },
  'Ranking': {
    title: 'Ranking with Window Functions',
    body: `Three ranking functions, each handles ties differently:
• ROW_NUMBER() — 1,2,3,4 (no ties; arbitrary tiebreak)
• RANK()        — 1,1,3,4 (ties get same rank; next rank skips)
• DENSE_RANK()  — 1,1,2,3 (ties get same rank; no skipping)

Pattern for "Top N per group":
  WITH ranked AS (
    SELECT *, RANK() OVER (PARTITION BY dept ORDER BY salary DESC) rk
    FROM employees
  )
  SELECT * FROM ranked WHERE rk <= 3;`,
  },
  'NULL Handling': {
    title: 'Handling NULLs',
    body: `NULL means "unknown" — not zero, not empty string.
• x = NULL is always NULL (not true). Use IS NULL / IS NOT NULL.
• NULL propagates: 5 + NULL = NULL, 'hi' || NULL = NULL.
• COALESCE(a, b, c) — returns first non-NULL argument.
• NULLIF(a, b) — returns NULL if a = b (useful to avoid division by zero).
• Aggregates ignore NULLs; COUNT(*) counts all rows, COUNT(col) skips NULLs.
• NOT IN with NULLs in the subquery always returns 0 rows (classic trap).`,
  },
  'Date Functions': {
    title: 'Date & Time Functions (SQLite)',
    body: `SQLite stores dates as TEXT in ISO format (YYYY-MM-DD).
• DATE('now') — today's date; DATE('now', '-7 days') — 7 days ago.
• STRFTIME('%Y-%m', order_date) — extract year-month for grouping.
• JULIANDAY(end) - JULIANDAY(start) — days between two dates (returns a real number).
• BETWEEN '2024-01-01' AND '2024-01-31' — inclusive on both ends.
• For half-open ranges: date >= '2024-01-01' AND date < '2024-02-01' (safer, works for any month).`,
  },
  'String Functions': {
    title: 'String Functions (SQLite)',
    body: `• LENGTH(str) — character count.
• UPPER(str) / LOWER(str) — case conversion.
• SUBSTR(str, start, len) — substring (1-indexed).
• INSTR(str, substr) — position of substr (0 if not found).
• REPLACE(str, old, new) — replace all occurrences.
• TRIM(str) / LTRIM / RTRIM — strip whitespace.
• LIKE 'A%' — starts with A; '%ion' — ends with ion; '%is%' — contains is.
• || — string concatenation operator in SQLite.`,
  },
  'Set Operations': {
    title: 'Set Operations',
    body: `Combine result sets from two SELECT statements (columns must match):
• UNION — merges and removes duplicates (slow due to dedup).
• UNION ALL — merges keeping all duplicates (faster, use when safe).
• INTERSECT — rows that appear in both result sets.
• EXCEPT — rows in the first set but not the second.

Interview tip: UNION ALL is almost always preferred over UNION for performance.
Use UNION only when duplicate elimination is actually required.`,
  },
  'Data Analysis': {
    title: 'Analytical Query Patterns',
    body: `Common patterns in analytics/data engineering interviews:
• Running total: SUM(col) OVER (ORDER BY date)
• Month-over-month change: current - LAG(current, 1) OVER (ORDER BY month)
• Retention cohorts: self-join or window function on first_seen date
• Top N per group: RANK() OVER (PARTITION BY group ORDER BY metric DESC) ≤ N
• Percentile buckets: NTILE(4) OVER (ORDER BY value) for quartiles
• Moving average: AVG(col) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)`,
  },
  'Performance': {
    title: 'Query Performance',
    body: `Key principles for write-efficient, index-friendly queries:
• Apply filters on bare columns (not wrapped in functions) to use indexes.
• Composite indexes follow column order: equality filters first, range filters last.
• Use LIMIT when you don't need all rows — sorting 1M rows to get 10 is wasteful.
• Avoid SELECT * — list only needed columns.
• EXPLAIN QUERY PLAN (SQLite) / EXPLAIN (PostgreSQL) shows the execution plan.
• Correlated subqueries re-run for every outer row — often replaceable by a JOIN.`,
  },
}

function ConceptPanel({ category }) {
  const [open, setOpen] = useState(false)
  const concept = CATEGORY_CONCEPTS[category]
  if (!concept) return null
  return (
    <div className="concept-panel">
      <button className="concept-panel-toggle" onClick={() => setOpen(o => !o)}>
        <span>💡 Key Concept: {concept.title}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <pre className="concept-panel-body">{concept.body}</pre>}
    </div>
  )
}

function readNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') } catch { return {} }
}

function ddlOnly(schema) {
  return schema
    .replace(/INSERT\s+INTO[\s\S]*?;/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ProblemPane({ question, theme, sampleTables = {} }) {
  const { progress } = useProgress()
  const status = progress[question.id]?.status || 'todo'
  const [hintsShown, setHintsShown]     = useState(0)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [notes, setNotes]               = useState('')

  const isDark = theme === 'dark'

  useEffect(() => {
    setHintsShown(0)
    setSolutionOpen(false)
    setNotes(readNotes()[question.id] || '')
  }, [question.id])

  useEffect(() => {
    const t = setTimeout(() => {
      const all = readNotes()
      if (notes.trim()) {
        all[question.id] = notes
      } else {
        delete all[question.id]
      }
      localStorage.setItem(NOTES_KEY, JSON.stringify(all))
    }, 1500)
    return () => clearTimeout(t)
  }, [notes, question.id])

  return (
    <div className="problem-pane">
      <div className="problem-header">
        <div className="problem-meta">
          <span className={`badge badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
          <span className="badge badge-category">{question.category}</span>
          {status === 'solved' && <span className="badge badge-solved">✓ Solved</span>}
        </div>
        <h1 className="problem-title">{question.title}</h1>
        {question.companies?.length > 0 && (
          <div className="companies">
            {question.companies.map((c) => (
              <span key={c} className="company-tag">{c}</span>
            ))}
          </div>
        )}
      </div>

      <div
        className="problem-description"
        dangerouslySetInnerHTML={{ __html: question.description }}
      />

      <ConceptPanel category={question.category} />

      {Object.keys(sampleTables).length > 0 && (
        <details className="schema-details" open>
          <summary className="details-summary">Sample Data</summary>
          <div className="sample-data">
            {Object.entries(sampleTables).map(([name, { columns, rows }]) => (
              <div key={name} className="sample-table-wrap">
                <div className="sample-table-name">{name}</div>
                <div className="sample-table-scroll">
                  <table className="sample-table">
                    <thead>
                      <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i}>
                          {columns.map((c) => (
                            <td key={c} className={row[c] === null ? 'cell-null' : ''}>
                              {row[c] === null ? 'NULL' : String(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="schema-details">
        <summary className="details-summary">Database Schema</summary>
        <pre className="schema-code">{ddlOnly(question.schema)}</pre>
      </details>

      <div className="hints-section">
        <h3 className="section-heading">Hints</h3>
        {hintsShown === 0 && (
          <p className="hints-note">Try to solve it first, then reveal hints one by one.</p>
        )}
        {question.hints.slice(0, hintsShown).map((h, i) => (
          <div key={i} className="hint-item">
            <span className="hint-num">{i + 1}</span>
            <span>{h}</span>
          </div>
        ))}
        {hintsShown < question.hints.length && (
          <button className="btn btn-ghost btn-sm" onClick={() => setHintsShown((n) => n + 1)}>
            Show hint {hintsShown + 1}
          </button>
        )}
      </div>

      <div className="solution-section">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSolutionOpen((o) => !o)}
        >
          {solutionOpen ? 'Hide solution ↑' : 'Show solution ↓'}
        </button>

        {solutionOpen && (
          <div className="solution-body">
            <CodeMirror
              value={question.solution.trim()}
              extensions={[sql()]}
              theme={isDark ? oneDark : 'light'}
              editable={false}
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
              className="solution-editor"
            />
            <div
              className="solution-explanation"
              dangerouslySetInnerHTML={{ __html: question.explanation }}
            />
          </div>
        )}
      </div>

      <div className="notes-section">
        <h3 className="section-heading">My Notes</h3>
        <textarea
          className="notes-textarea"
          placeholder="Write your own explanation, key insights, or things to remember…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
        {notes.trim() && <p className="notes-saved">Auto-saved locally</p>}
      </div>

      {question.source_url && (
        <div className="attribution">
          Source:{' '}
          <a href={question.source_url} target="_blank" rel="noopener noreferrer">
            {question.source_url}
          </a>
        </div>
      )}
    </div>
  )
}
