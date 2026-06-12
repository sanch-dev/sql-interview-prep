import { useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

export default function ProblemPane({ question, theme }) {
  const { progress } = useProgress()
  const status = progress[question.id]?.status || 'todo'
  const [hintsShown, setHintsShown] = useState(0)
  const [solutionOpen, setSolutionOpen] = useState(false)

  const isDark = theme === 'dark'

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

      <details className="schema-details" open>
        <summary className="details-summary">Database Schema</summary>
        <pre className="schema-code">{question.schema.trim()}</pre>
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
