import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror, { useCodeMirror } from '@uiw/react-codemirror'
import { sql, MSSQL } from '@codemirror/lang-sql'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { autocompletion } from '@codemirror/autocomplete'
import { toggleLineComment } from '@codemirror/commands'
import ResultsPanel from './ResultsPanel'
import PatternDebrief from './PatternDebrief'

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

// ── Quick inline analyzer ────────────────────────────────────────────────────
function quickAnalyze(raw) {
  if (!raw.trim()) return null
  const u = raw.toUpperCase()
  const findings = []

  const joins      = (u.match(/\bJOIN\b/g)    || []).length
  const selects    = (u.match(/\bSELECT\b/g)  || []).length
  const subqueries = Math.max(0, selects - 1)
  const windows    = (u.match(/\bOVER\s*\(/g) || []).length
  const ctes       = (u.match(/\bWITH\b/g)    || []).length

  let score = joins * 10 + subqueries * 15 + windows * 8 + ctes * 5
  let complexity = score === 0 ? 'Trivial' : score < 15 ? 'Low' : score < 35 ? 'Medium' : 'High'
  let complexityColor = score === 0 ? 'gray' : score < 15 ? 'green' : score < 35 ? 'orange' : 'red'

  if (/SELECT\s+\*/i.test(raw))
    findings.push({ icon: '⚠', text: 'Avoid SELECT * — list only needed columns.' })
  if (/\bNOT\s+IN\b/i.test(raw))
    findings.push({ icon: '⚠', text: 'NOT IN returns 0 rows if subquery has NULLs — prefer NOT EXISTS.' })
  if (subqueries > 0 && ctes === 0)
    findings.push({ icon: '💡', text: 'Subquery detected — consider a CTE (WITH) for readability.' })
  if (/WHERE\s+\w+\s*\(/i.test(raw))
    findings.push({ icon: '⚠', text: 'Function on WHERE column can prevent index usage.' })
  if (joins >= 3)
    findings.push({ icon: '💡', text: `${joins} JOINs — ensure each join key is indexed.` })
  if (windows > 0 && subqueries > 1)
    findings.push({ icon: '💡', text: 'Multiple subqueries could be replaced by window functions for better performance.' })

  return { complexity, complexityColor, findings }
}

function MiniAnalysis({ sql: sqlText }) {
  const [open, setOpen] = useState(false)
  const result = useMemo(() => quickAnalyze(sqlText), [sqlText])
  if (!result) return null

  return (
    <div className="mini-analysis">
      <button className="mini-analysis-toggle" onClick={() => setOpen(o => !o)}>
        <span className={`mini-complexity mini-complexity-${result.complexityColor}`}>
          ⚡ {result.complexity} complexity
        </span>
        {result.findings.length > 0 && (
          <span className="mini-findings-count">
            {result.findings.length} insight{result.findings.length !== 1 ? 's' : ''}
          </span>
        )}
        {result.findings.length === 0 && <span className="mini-clean">✓ Clean</span>}
        <span className="mini-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && result.findings.length > 0 && (
        <div className="mini-findings">
          {result.findings.map((f, i) => (
            <div key={i} className="mini-finding">
              <span>{f.icon}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TIMER_LIMITS = { Easy: 10 * 60, Medium: 15 * 60, Hard: 20 * 60 }
const MIN_RESULTS_H = 140
const MAX_RESULTS_H = 560
const DEFAULT_RESULTS_H = 220

// Only T-SQL mode — SQLite tab removed
const DIALECT_KEY = 'mssql'

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}


export default function EditorPane({ question, initialValue, results, refResult, isRunning, sampleTables = {}, onRun, onSubmit, onSave, onDialectChange, showDebrief, justMastered, onDismissDebrief, theme }) {
  const [code, setCode]             = useState(initialValue || '')
  const [resultsHeight, setResultsHeight] = useState(DEFAULT_RESULTS_H)
  const [lastRunCode, setLastRunCode] = useState(null)
  const isDark = theme === 'dark'
  const editorViewRef = useRef(null)

  const tableNames = useMemo(() => Object.keys(sampleTables), [sampleTables])

  const cmSchema = useMemo(() => {
    const schema = {}
    Object.entries(sampleTables).forEach(([name, { columns }]) => { schema[name] = columns })
    return schema
  }, [sampleTables])

  // Refs so the stable completion extension always reads current values
  const schemaRef  = useRef({})
  const dialectRef = useRef(DIALECT_KEY)
  useEffect(() => { schemaRef.current = cmSchema }, [cmSchema])

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

  const handleRun    = useCallback(() => { setLastRunCode(code); onRun(code, DIALECT_KEY) },    [code, onRun])
  const handleSubmit = useCallback(() => { setLastRunCode(code); onSubmit(code, DIALECT_KEY) }, [code, onSubmit])

  function handleCommentLine() {
    if (editorViewRef.current) {
      toggleLineComment(editorViewRef.current)
      editorViewRef.current.focus()
    }
  }

  const runKeymap = Prec.highest(keymap.of([
    { key: 'Ctrl-Enter', run: () => { handleRun(); return true } },
    { key: 'Mod-Enter',  run: () => { handleRun(); return true } },
    { key: 'Ctrl-/',     run: (view) => { toggleLineComment(view); return true } },
    { key: 'Mod-/',      run: (view) => { toggleLineComment(view); return true } },
  ]))

  useEffect(() => {
    const t = setTimeout(() => onSave(code), 1500)
    return () => clearTimeout(t)
  }, [code, onSave])

  const sqlLang = useMemo(() => sql({ dialect: MSSQL }), [])

  return (
    <div className="editor-pane">
      <div className="editor-header">
        <div className="editor-header-left">
          <span className="editor-label">SQL Editor</span>
          <span className="dialect-badge">T-SQL</span>
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
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleCommentLine}
            title="Toggle comment on current line (Ctrl+/)"
          >
            -- Comment
          </button>
          <kbd className="shortcut-hint">Ctrl+Enter to run</kbd>
          <button className="btn btn-outline btn-sm" onClick={handleRun} disabled={isRunning}>▶ Run</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isRunning}>✓ Submit</button>
        </div>
      </div>

      <div className="tsql-notice">
        T-SQL mode — <code>TOP N</code>, <code>ISNULL</code>, <code>LEN</code>, <code>GETDATE</code>, <code>CHARINDEX</code>, <code>DATEADD</code>, <code>DATEDIFF</code> run natively on Azure SQL.
      </div>

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
            autocompletion: false,
          }}
          className="sql-editor"
          onCreateEditor={(view) => { editorViewRef.current = view }}
        />
      </div>

      <div className="resize-handle" onMouseDown={startResize} title="Drag to resize" />

      <ResultsPanel
        result={results}
        refResult={refResult}
        isRunning={isRunning}
        tableNames={tableNames}
        dialectKey={DIALECT_KEY}
        height={resultsHeight}
      />

      {showDebrief && (
        <PatternDebrief
          questionId={question.id}
          mastered={justMastered}
          onDismiss={onDismissDebrief}
        />
      )}

      {lastRunCode && <MiniAnalysis sql={lastRunCode} />}
    </div>
  )
}
