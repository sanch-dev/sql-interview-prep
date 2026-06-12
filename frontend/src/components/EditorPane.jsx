import { useCallback, useEffect, useMemo, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql, MSSQL, SQLite } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import ResultsPanel from './ResultsPanel'

const TIMER_LIMITS = { Easy: 10 * 60, Medium: 15 * 60, Hard: 20 * 60 }

const DIALECTS = [
  { value: 'sqlite', label: 'SQLite', dialect: SQLite },
  { value: 'mssql',  label: 'T-SQL',  dialect: MSSQL  },
]

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function adaptTSQLToSQLite(sqlText) {
  let out = sqlText

  // Strip table hints: WITH (NOLOCK), WITH (READUNCOMMITTED), etc.
  out = out.replace(/\bWITH\s*\(\s*(?:NO(?:LOCK|EXPAND)|READ(?:UNCOMMITTED|COMMITTED|PAST)|UPDLOCK|ROWLOCK|TABLOCK|TABLOCKX|HOLDLOCK|XLOCK|PAGLOCK|NOWAIT)\s*\)/gi, '')

  // SELECT TOP N → SELECT … LIMIT N
  let topN = null
  out = out.replace(/\bSELECT\s+TOP\s+\(?\s*(\d+)\s*\)?\s+/gi, (_, n) => {
    topN = n
    return 'SELECT '
  })
  if (topN !== null) {
    out = out.replace(/\bLIMIT\s+\d+\s*$/i, '').trimEnd() + ` LIMIT ${topN}`
  }

  // ISNULL(a, b) → COALESCE(a, b)
  out = out.replace(/\bISNULL\s*\(/gi, 'COALESCE(')

  // LEN(x) → LENGTH(x)
  out = out.replace(/\bLEN\s*\(/gi, 'LENGTH(')

  // GETDATE() / GETUTCDATE() → DATE('now')
  out = out.replace(/\bGET(?:UTC)?DATE\s*\(\s*\)/gi, "DATE('now')")

  // CHARINDEX(needle, haystack) → INSTR(haystack, needle)  [arg order flipped]
  out = out.replace(/\bCHARINDEX\s*\(\s*([^,]+),\s*([^)]+)\)/gi, (_, needle, haystack) => `INSTR(${haystack.trim()}, ${needle.trim()})`)

  return out
}

export default function EditorPane({ question, initialValue, results, refResult, isRunning, sampleTables = {}, onRun, onSubmit, onSave, theme }) {
  const [code, setCode]             = useState(initialValue || '')
  const [dialectKey, setDialectKey] = useState('sqlite')
  const isDark = theme === 'dark'

  const currentDialect = DIALECTS.find((d) => d.value === dialectKey) || DIALECTS[0]

  // Build schema for CodeMirror autocomplete from actual question tables
  const cmSchema = useMemo(() => {
    const schema = {}
    Object.entries(sampleTables).forEach(([name, { columns }]) => {
      schema[name] = columns
    })
    return schema
  }, [sampleTables])

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [timerActive, setTimerActive] = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)

  useEffect(() => {
    setCode(initialValue || '')
  }, [question.id, initialValue])

  useEffect(() => {
    setSecondsLeft(null)
    setTimerActive(false)
    setTimerExpired(false)
  }, [question.id])

  useEffect(() => {
    if (!timerActive || secondsLeft === null) return
    if (secondsLeft === 0) { setTimerActive(false); setTimerExpired(true); return }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timerActive, secondsLeft])

  function startTimer() {
    setSecondsLeft(TIMER_LIMITS[question.difficulty] || 15 * 60)
    setTimerActive(true)
    setTimerExpired(false)
  }
  function resetTimer() { setSecondsLeft(null); setTimerActive(false); setTimerExpired(false) }

  const timerClass = secondsLeft !== null
    ? secondsLeft <= 30  ? 'timer timer-red'
    : secondsLeft <= 120 ? 'timer timer-orange'
    : 'timer'
    : ''

  function prepare(rawCode) {
    return dialectKey === 'mssql' ? adaptTSQLToSQLite(rawCode) : rawCode
  }

  const handleRun    = useCallback(() => { onRun(prepare(code)) },    [code, onRun, dialectKey])
  const handleSubmit = useCallback(() => { onSubmit(prepare(code)) }, [code, onSubmit, dialectKey])

  const runKeymap = Prec.highest(
    keymap.of([
      { key: 'Ctrl-Enter', run: () => { handleRun(); return true } },
      { key: 'Mod-Enter',  run: () => { handleRun(); return true } },
    ])
  )

  useEffect(() => {
    const t = setTimeout(() => onSave(code), 1500)
    return () => clearTimeout(t)
  }, [code, onSave])

  const sqlExtension = useMemo(
    () => sql({ dialect: currentDialect.dialect, schema: cmSchema }),
    [currentDialect.dialect, cmSchema]
  )

  return (
    <div className="editor-pane">
      <div className="editor-header">
        <div className="editor-header-left">
          <span className="editor-label">SQL Editor</span>
          <div className="dialect-tabs">
            {DIALECTS.map((d) => (
              <button
                key={d.value}
                className={`dialect-tab${dialectKey === d.value ? ' dialect-tab-active' : ''}`}
                onClick={() => setDialectKey(d.value)}
                title={d.value === 'mssql' ? 'T-SQL mode — common T-SQL syntax adapted for SQLite execution' : 'Standard SQLite mode'}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="editor-actions">
          {secondsLeft !== null ? (
            <span className={timerClass}>
              {timerExpired ? '⏰ Time up!' : `⏱ ${formatTime(secondsLeft)}`}
              <button className="timer-reset" onClick={resetTimer} title="Reset timer">✕</button>
            </span>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={startTimer} title={`${TIMER_LIMITS[question.difficulty] / 60} min for ${question.difficulty}`}>
              ⏱ Timer
            </button>
          )}
          <kbd className="shortcut-hint">Ctrl+Enter to run</kbd>
          <button className="btn btn-outline btn-sm" onClick={handleRun} disabled={isRunning}>▶ Run</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isRunning}>✓ Submit</button>
        </div>
      </div>

      {dialectKey === 'mssql' && (
        <div className="tsql-notice">
          T-SQL mode: <code>WITH(NOLOCK)</code>, <code>TOP N</code>, <code>ISNULL</code>, <code>LEN</code>, <code>GETDATE</code>, <code>CHARINDEX</code> are auto-adapted for SQLite execution.
        </div>
      )}

      {timerExpired && (
        <div className="timer-expired-banner">
          ⏰ Time's up! You can still submit — real interviews sometimes go over.
        </div>
      )}

      <div className="cm-wrapper">
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={[sqlExtension, runKeymap]}
          theme={isDark ? oneDark : 'light'}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            foldGutter: false,
            autocompletion: true,
          }}
          className="sql-editor"
        />
      </div>

      <ResultsPanel result={results} refResult={refResult} isRunning={isRunning} />
    </div>
  )
}
