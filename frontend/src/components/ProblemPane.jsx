import { useEffect, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import { getTableData } from '../lib/sql'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

const NOTES_KEY = 'sqlforge_notes'

function readNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}') } catch { return {} }
}

function ddlOnly(schema) {
  return schema
    .replace(/INSERT\s+INTO[\s\S]*?;/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function ProblemPane({ question, theme }) {
  const { progress } = useProgress()
  const status = progress[question.id]?.status || 'todo'
  const [hintsShown, setHintsShown]     = useState(0)
  const [solutionOpen, setSolutionOpen] = useState(false)
  const [notes, setNotes]               = useState('')
  const [sampleTables, setSampleTables] = useState({})

  const isDark = theme === 'dark'

  // Reset state + load notes + load sample data when question changes
  useEffect(() => {
    setHintsShown(0)
    setSolutionOpen(false)
    setNotes(readNotes()[question.id] || '')
    setSampleTables({})
    getTableData(question.schema).then(setSampleTables)
  }, [question.id, question.schema])

  // Auto-save notes
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
