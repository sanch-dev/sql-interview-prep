import { useCallback, useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql, SQLite } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion } from '@codemirror/autocomplete'
import { Prec } from '@codemirror/state'
import { keymap } from '@codemirror/view'
import { executeSQL, submitSQL } from '../lib/sql'

const SQL_EXT = [sql({ dialect: SQLite }), EditorView.lineWrapping,
  autocompletion({ activateOnTyping: false })]

function BugBanner({ text }) {
  return <div className="bug-banner" dangerouslySetInnerHTML={{ __html: text.replace(/🐛[^<]*/,'') }} />
}

function DebugResult({ result, refResult, isCorrect }) {
  if (!result) return null
  if (result.error) {
    return (
      <div className="debug-result debug-result-error">
        <strong>Error:</strong>
        <pre>{result.error.replace(/^SQL Error:\s*/i, '')}</pre>
      </div>
    )
  }
  if (isCorrect === true) {
    return (
      <div className="debug-result debug-result-pass">
        ✓ Correct! Your fix produces the expected output.
      </div>
    )
  }
  if (isCorrect === false) {
    return (
      <div className="debug-result debug-result-fail">
        ✕ Output doesn't match yet. Compare your result with expected below.
        <div className="debug-tables">
          <div className="debug-table-wrap">
            <div className="debug-table-label">Your output ({result.rows.length} rows)</div>
            <DebugTable columns={result.columns} rows={result.rows} />
          </div>
          {refResult && !refResult.error && (
            <div className="debug-table-wrap">
              <div className="debug-table-label">Expected ({refResult.rows.length} rows)</div>
              <DebugTable columns={refResult.columns} rows={refResult.rows} />
            </div>
          )}
        </div>
      </div>
    )
  }
  return (
    <div className="debug-result debug-result-neutral">
      <DebugTable columns={result.columns} rows={result.rows} />
      <div className="debug-table-hint">
        {result.rows.length} row{result.rows.length !== 1 ? 's' : ''} — click Submit to check against expected output.
      </div>
    </div>
  )
}

function DebugTable({ columns, rows }) {
  if (!columns?.length) return null
  return (
    <div className="debug-table-scroll">
      <table className="results-table">
        <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.slice(0, 20).map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c} className={row[c] === null ? 'cell-null' : ''}>
                  {row[c] === null ? 'NULL' : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const FALLBACK = [
  {
    id: 'no-debug',
    title: 'No debug challenges loaded',
    difficulty: 'Easy',
    category: 'Setup',
    description: '<p>Debug challenges could not be loaded. Make sure the build was run after adding q_debug_challenges.py.</p>',
    schema: 'CREATE TABLE test (id INTEGER);',
    broken_sql: 'SELECT * FROM test;',
    solution: 'SELECT * FROM test;',
    hints: [],
    explanation: '',
    order_matters: false,
  },
]

export default function DebugPage({ questions: rawQuestions, theme }) {
  const questions = rawQuestions?.length ? rawQuestions : FALLBACK
  const [selected, setSelected] = useState(questions[0])
  const [code, setCode]         = useState(selected?.broken_sql?.trim() || '')
  const [result, setResult]     = useState(null)
  const [refResult, setRefResult] = useState(null)
  const [isCorrect, setIsCorrect] = useState(null)
  const [isRunning, setIsRunning] = useState(null) // 'run' | 'submit' | null
  const [hintsShown, setHintsShown] = useState(0)
  const [showExplanation, setShowExplanation] = useState(false)
  const [solved, setSolved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('qldb_solved') || '[]')) }
    catch { return new Set() }
  })
  const isDark = theme === 'dark'

  useEffect(() => {
    setCode(selected?.broken_sql?.trim() || '')
    setResult(null)
    setRefResult(null)
    setIsCorrect(null)
    setIsRunning(null)
    setHintsShown(0)
    setShowExplanation(false)
  }, [selected?.id])

  const runKeymap = Prec.highest(keymap.of([
    { key: 'Ctrl-Enter', run: () => { handleRun(); return true } },
    { key: 'Mod-Enter',  run: () => { handleRun(); return true } },
  ]))

  async function handleRun() {
    if (isRunning) return
    setIsRunning('run')
    setIsCorrect(null)
    setRefResult(null)
    const r = await executeSQL(code, selected.id)
    setResult({ ...r, type: 'run' })
    setIsRunning(null)
  }

  async function handleSubmit() {
    if (isRunning) return
    setIsRunning('submit')
    const { userResult: userRes, refResult: ref, correct } = await submitSQL(code, selected.id)
    setRefResult(ref)
    if (userRes.error) {
      setResult({ ...userRes, type: 'submit' })
      setIsCorrect(null)
      setIsRunning(null)
      return
    }
    setResult({ ...userRes, type: 'submit' })
    setIsCorrect(correct)
    if (correct) {
      const next = new Set(solved)
      next.add(selected.id)
      setSolved(next)
      localStorage.setItem('qldb_solved', JSON.stringify([...next]))
    }
    setIsRunning(null)
  }

  function handleReset() {
    setCode(selected?.broken_sql?.trim() || '')
    setResult(null)
    setRefResult(null)
    setIsCorrect(null)
  }

  const DIFF_LABELS = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }

  return (
    <div className="page-full debug-page">
      <div className="debug-layout">
        {/* Left: question list */}
        <aside className="debug-sidebar">
          <div className="debug-sidebar-header">
            <span className="debug-sidebar-title">Debug Challenges</span>
            <span className="debug-sidebar-count">{solved.size}/{questions.length} fixed</span>
          </div>
          <div className="debug-list">
            {questions.map(q => (
              <button
                key={q.id}
                className={`debug-list-item${selected?.id === q.id ? ' debug-list-item-active' : ''}`}
                onClick={() => setSelected(q)}
              >
                <div className="debug-list-item-top">
                  <span className={`badge ${DIFF_LABELS[q.difficulty] || 'badge-easy'}`}>{q.difficulty}</span>
                  {solved.has(q.id) && <span className="debug-solved-check">✓</span>}
                </div>
                <div className="debug-list-item-title">{q.title}</div>
                <div className="debug-list-item-cat">{q.category}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right: workspace */}
        <div className="debug-workspace">
          {/* Problem description */}
          <div className="debug-problem">
            <div className="debug-problem-meta">
              <span className={`badge ${DIFF_LABELS[selected?.difficulty] || 'badge-easy'}`}>{selected?.difficulty}</span>
              <span className="badge badge-category">{selected?.category}</span>
              {isCorrect && <span className="badge badge-solved">✓ Fixed!</span>}
            </div>
            <h2 className="debug-problem-title">{selected?.title}</h2>
            <div
              className="problem-description"
              dangerouslySetInnerHTML={{ __html: selected?.description }}
            />
          </div>

          {/* Editor */}
          <div className="debug-editor-section">
            <div className="debug-editor-header">
              <span className="debug-editor-label">Fix the SQL</span>
              <div className="debug-editor-actions">
                <kbd className="shortcut-hint">Ctrl+Enter to run</kbd>
                <button className="btn btn-ghost btn-sm" onClick={handleReset}>↺ Reset</button>
                <button className="btn btn-outline btn-sm" onClick={handleRun} disabled={!!isRunning}>
                  {isRunning === 'run' ? '…' : '▶ Run'}
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!!isRunning}>
                  {isRunning === 'submit' ? '…' : '✓ Submit'}
                </button>
              </div>
            </div>
            <CodeMirror
              value={code}
              onChange={setCode}
              extensions={[...SQL_EXT, runKeymap]}
              theme={isDark ? oneDark : 'light'}
              basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: false }}
              className="debug-editor"
            />
          </div>

          {/* Results */}
          <DebugResult result={result} refResult={refResult} isCorrect={isCorrect} />

          {/* Hints */}
          {selected?.hints?.length > 0 && (
            <div className="debug-hints">
              <div className="section-heading">Hints</div>
              {selected.hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} className="hint-item">
                  <span className="hint-num">{i + 1}</span>
                  <span>{h}</span>
                </div>
              ))}
              {hintsShown < selected.hints.length && (
                <button className="btn btn-ghost btn-sm" onClick={() => setHintsShown(n => n + 1)}>
                  Show hint {hintsShown + 1}
                </button>
              )}
            </div>
          )}

          {/* Explanation (shown after correct solve or on demand) */}
          {selected?.explanation && (
            <div className="debug-explanation">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowExplanation(o => !o)}
              >
                {showExplanation ? 'Hide explanation ↑' : 'Show explanation ↓'}
              </button>
              {showExplanation && (
                <div
                  className="solution-explanation"
                  dangerouslySetInnerHTML={{ __html: selected.explanation }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
