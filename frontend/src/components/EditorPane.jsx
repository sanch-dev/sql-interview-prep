import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql, MSSQL, SQLite } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { autocompletion } from '@codemirror/autocomplete'
import ResultsPanel from './ResultsPanel'

const SQL_KEYWORDS = [
  'SELECT','DISTINCT','FROM','WHERE','GROUP BY','HAVING','ORDER BY','LIMIT','OFFSET',
  'JOIN','INNER JOIN','LEFT JOIN','LEFT OUTER JOIN','RIGHT JOIN','FULL OUTER JOIN','CROSS JOIN','ON','USING',
  'AND','OR','NOT','IN','NOT IN','EXISTS','NOT EXISTS','BETWEEN','LIKE','IS','IS NOT','IS NULL','IS NOT NULL',
  'UNION','UNION ALL','INTERSECT','EXCEPT','WITH','RECURSIVE',
  'COUNT','SUM','AVG','MAX','MIN','GROUP_CONCAT',
  'OVER','PARTITION BY','ROWS BETWEEN','RANGE BETWEEN','UNBOUNDED PRECEDING','CURRENT ROW','UNBOUNDED FOLLOWING',
  'RANK','DENSE_RANK','ROW_NUMBER','NTILE','PERCENT_RANK','CUME_DIST',
  'LAG','LEAD','FIRST_VALUE','LAST_VALUE','NTH_VALUE',
  'ABS','ROUND','CEIL','FLOOR','MOD',
  'LENGTH','UPPER','LOWER','TRIM','LTRIM','RTRIM','SUBSTR','REPLACE','INSTR','PRINTF','COALESCE','NULLIF','IFNULL','IIF',
  'DATE','TIME','DATETIME','JULIANDAY','STRFTIME','UNIXEPOCH',
  'CAST','TYPEOF','NULL',
  'CASE','WHEN','THEN','ELSE','END','AS','ALL','ANY',
  'INTEGER','INT','REAL','FLOAT','TEXT','VARCHAR','BLOB','NUMERIC','BOOLEAN',
  'INSERT','INTO','UPDATE','SET','DELETE',
  'CREATE','TABLE','INDEX','DROP','ALTER','ADD','COLUMN',
  'PRIMARY KEY','FOREIGN KEY','REFERENCES','UNIQUE','NOT NULL','DEFAULT','CHECK',
]

const TSQL_EXTRA = [
  'TOP','ISNULL','LEN','GETDATE','GETUTCDATE','CHARINDEX','PATINDEX','STUFF',
  'DATEADD','DATEDIFF','DATEPART','DATENAME','CONVERT','TRY_CAST','TRY_CONVERT',
  'FORMAT','IIF','CHOOSE','EOMONTH','ISDATE','ISNUMERIC',
  'CROSS APPLY','OUTER APPLY',
  'NVARCHAR','BIGINT','SMALLINT','TINYINT','BIT','MONEY','DATETIME2','UNIQUEIDENTIFIER',
]

function buildSchemaCompletion(schemaRef, dialectRef) {
  return autocompletion({
    activateOnTyping: true,
    override: [(ctx) => {
      const word = ctx.matchBefore(/\w+/)
      if (!word || (word.from === word.to && !ctx.explicit)) return null

      const schema = schemaRef.current
      const opts = []

      Object.entries(schema).forEach(([tbl, cols]) => {
        opts.push({ label: tbl, type: 'class', detail: 'table', boost: 10 })
        cols.forEach(col => opts.push({ label: col, type: 'property', detail: tbl, boost: 8 }))
      })

      const kws = dialectRef.current === 'mssql'
        ? [...SQL_KEYWORDS, ...TSQL_EXTRA]
        : SQL_KEYWORDS
      kws.forEach(kw => opts.push({ label: kw, type: 'keyword', boost: 1 }))

      return { from: word.from, options: opts, validFor: /^\w*$/ }
    }]
  })
}

const TIMER_LIMITS = { Easy: 10 * 60, Medium: 15 * 60, Hard: 20 * 60 }
const MIN_RESULTS_H = 140
const MAX_RESULTS_H = 560
const DEFAULT_RESULTS_H = 220

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
  out = out.replace(/\bWITH\s*\(\s*(?:NO(?:LOCK|EXPAND)|READ(?:UNCOMMITTED|COMMITTED|PAST)|UPDLOCK|ROWLOCK|TABLOCK|TABLOCKX|HOLDLOCK|XLOCK|PAGLOCK|NOWAIT)\s*\)/gi, '')
  let topN = null
  out = out.replace(/\bSELECT\s+TOP\s+\(?\s*(\d+)\s*\)?\s+/gi, (_, n) => { topN = n; return 'SELECT ' })
  if (topN !== null) out = out.replace(/\bLIMIT\s+\d+\s*$/i, '').trimEnd() + ` LIMIT ${topN}`
  out = out.replace(/\bISNULL\s*\(/gi, 'COALESCE(')
  out = out.replace(/\bLEN\s*\(/gi, 'LENGTH(')
  out = out.replace(/\bGET(?:UTC)?DATE\s*\(\s*\)/gi, "DATE('now')")
  out = out.replace(/\bCHARINDEX\s*\(\s*([^,]+),\s*([^)]+)\)/gi, (_, needle, haystack) => `INSTR(${haystack.trim()}, ${needle.trim()})`)
  return out
}

export default function EditorPane({ question, initialValue, results, refResult, isRunning, sampleTables = {}, onRun, onSubmit, onSave, theme }) {
  const [code, setCode]             = useState(initialValue || '')
  const [dialectKey, setDialectKey] = useState('sqlite')
  const [resultsHeight, setResultsHeight] = useState(DEFAULT_RESULTS_H)
  const isDark = theme === 'dark'

  const currentDialect = DIALECTS.find((d) => d.value === dialectKey) || DIALECTS[0]
  const tableNames = useMemo(() => Object.keys(sampleTables), [sampleTables])

  const cmSchema = useMemo(() => {
    const schema = {}
    Object.entries(sampleTables).forEach(([name, { columns }]) => { schema[name] = columns })
    return schema
  }, [sampleTables])

  // Refs so the stable completion extension always reads current values
  const schemaRef  = useRef({})
  const dialectRef = useRef('sqlite')
  useEffect(() => { schemaRef.current  = cmSchema    }, [cmSchema])
  useEffect(() => { dialectRef.current = dialectKey  }, [dialectKey])

  // Stable custom completion — built once, reads from refs (no remount needed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const customCompletion = useMemo(() => buildSchemaCompletion(schemaRef, dialectRef), [])

  // Timer
  const [secondsLeft, setSecondsLeft]   = useState(null)
  const [timerActive, setTimerActive]   = useState(false)
  const [timerExpired, setTimerExpired] = useState(false)

  useEffect(() => { setCode(initialValue || '') }, [question.id, initialValue])
  useEffect(() => { setSecondsLeft(null); setTimerActive(false); setTimerExpired(false) }, [question.id])

  useEffect(() => {
    if (!timerActive || secondsLeft === null) return
    if (secondsLeft === 0) { setTimerActive(false); setTimerExpired(true); return }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timerActive, secondsLeft])

  function startTimer() { setSecondsLeft(TIMER_LIMITS[question.difficulty] || 15 * 60); setTimerActive(true); setTimerExpired(false) }
  function resetTimer() { setSecondsLeft(null); setTimerActive(false); setTimerExpired(false) }

  const timerClass = secondsLeft !== null
    ? secondsLeft <= 30  ? 'timer timer-red'
    : secondsLeft <= 120 ? 'timer timer-orange'
    : 'timer' : ''

  // Drag-to-resize results panel
  function startResize(e) {
    e.preventDefault()
    const startY = e.clientY
    const startH = resultsHeight
    function onMove(e) {
      const delta = startY - e.clientY
      setResultsHeight(Math.max(MIN_RESULTS_H, Math.min(MAX_RESULTS_H, startH + delta)))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  function prepare(raw) { return dialectKey === 'mssql' ? adaptTSQLToSQLite(raw) : raw }

  const handleRun    = useCallback(() => { onRun(prepare(code)) },    [code, onRun, dialectKey])
  const handleSubmit = useCallback(() => { onSubmit(prepare(code)) }, [code, onSubmit, dialectKey])

  const runKeymap = Prec.highest(keymap.of([
    { key: 'Ctrl-Enter', run: () => { handleRun(); return true } },
    { key: 'Mod-Enter',  run: () => { handleRun(); return true } },
  ]))

  useEffect(() => {
    const t = setTimeout(() => onSave(code), 1500)
    return () => clearTimeout(t)
  }, [code, onSave])

  // sql() for syntax highlighting only — no schema (avoids cache-at-mount timing bug)
  const sqlLang = useMemo(
    () => sql({ dialect: currentDialect.dialect }),
    [currentDialect.dialect]
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
                title={d.value === 'mssql' ? 'T-SQL mode — common syntax auto-adapted for SQLite execution' : 'Standard SQLite mode'}
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
          T-SQL mode — <code>WITH(NOLOCK)</code>, <code>TOP N</code>, <code>ISNULL</code>, <code>LEN</code>, <code>GETDATE</code>, <code>CHARINDEX</code> auto-adapted for SQLite.
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
          extensions={[sqlLang, customCompletion, runKeymap, EditorView.lineWrapping]}
          theme={isDark ? oneDark : 'light'}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            foldGutter: false,
            autocompletion: false, // customCompletion extension handles this
          }}
          className="sql-editor"
        />
      </div>

      <div className="resize-handle" onMouseDown={startResize} title="Drag to resize" />

      <ResultsPanel
        result={results}
        refResult={refResult}
        isRunning={isRunning}
        tableNames={tableNames}
        dialectKey={dialectKey}
        height={resultsHeight}
      />
    </div>
  )
}
