import { useCallback, useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { submitSQL } from '../lib/sql'

const SIM_DURATION = 45 * 60 // seconds

function selectSimQuestions(allQuestions) {
  const byDiff = { Easy: [], Medium: [], Hard: [] }
  allQuestions.forEach(q => {
    if (byDiff[q.difficulty]) byDiff[q.difficulty].push(q)
  })

  const pick = (pool, n) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, n)
  }

  return [
    ...pick(byDiff.Easy,   1),
    ...pick(byDiff.Medium, 2),
    ...pick(byDiff.Hard,   1),
  ].sort(() => Math.random() - 0.5)
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function ReadyScreen({ onStart }) {
  return (
    <div className="sim-page">
      <div className="sim-ready-card">
        <div className="sim-ready-icon">🎯</div>
        <h1 className="sim-ready-title">Interview Simulator</h1>
        <p className="sim-ready-sub">Replicate real interview conditions. No hints, timed, scored.</p>
        <div className="sim-rules">
          <div className="sim-rule">
            <span className="sim-rule-icon">📋</span>
            <span>4 questions — 1 Easy, 2 Medium, 1 Hard</span>
          </div>
          <div className="sim-rule">
            <span className="sim-rule-icon">⏱</span>
            <span>45-minute total timer</span>
          </div>
          <div className="sim-rule">
            <span className="sim-rule-icon">🚫</span>
            <span>No hints available</span>
          </div>
          <div className="sim-rule">
            <span className="sim-rule-icon">⭐</span>
            <span>Score based on correctness, not speed</span>
          </div>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onStart}>
          Start Interview →
        </button>
      </div>
    </div>
  )
}

function DoneScreen({ simQuestions, results, timeUsed, onRetry }) {
  const score = results.filter(r => r.correct).length
  const pct   = Math.round((score / simQuestions.length) * 100)
  const color = pct >= 75 ? '#16a34a' : pct >= 50 ? '#f59e0b' : '#ef4444'

  const feedback =
    pct >= 75 ? '🎉 Strong performance! You are interview-ready.' :
    pct >= 50 ? '📈 Good effort. Review the questions you missed.' :
                '📚 Keep practicing — focus on the patterns that tripped you up.'

  return (
    <div className="sim-page">
      <div className="sim-done-card">
        <div className="sim-done-top">
          <div className="sim-score-circle">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="7" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={color}
                strokeWidth="7"
                strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="sim-score-inner">
              <span className="sim-score-num" style={{ color }}>{pct}%</span>
            </div>
          </div>
          <div className="sim-done-summary">
            <h2 className="sim-done-title">Interview Complete</h2>
            <p className="sim-done-sub">
              {score} of {simQuestions.length} correct · {formatTime(timeUsed)} used
            </p>
          </div>
        </div>

        <div className="sim-result-list">
          {results.map((r, i) => (
            <div key={i} className={`sim-result-item ${r.correct ? 'sim-correct' : r.skipped ? 'sim-skipped' : 'sim-wrong'}`}>
              <span className="sim-result-icon">{r.correct ? '✓' : r.skipped ? '—' : '✗'}</span>
              <span className="sim-result-title">{r.question.title}</span>
              <span className={`badge badge-${r.question.difficulty.toLowerCase()}`}>{r.question.difficulty}</span>
              <span className="sim-result-cat">{r.question.category}</span>
            </div>
          ))}
        </div>

        <div className="sim-feedback">{feedback}</div>

        <button className="btn btn-primary" onClick={onRetry}>Try Again</button>
      </div>
    </div>
  )
}

export default function SimulatorPage({ questions, theme }) {
  const [phase, setPhase]           = useState('ready') // 'ready' | 'running' | 'done'
  const [simQuestions, setSimQ]     = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [code, setCode]             = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults]       = useState([])
  const [timeLeft, setTimeLeft]     = useState(SIM_DURATION)
  const [timeUsed, setTimeUsed]     = useState(0)
  const [submitFeedback, setFeedback] = useState(null) // { correct, msg }

  const isDark = theme === 'dark'

  function startSim() {
    const qs = selectSimQuestions(questions)
    setSimQ(qs)
    setCurrentIdx(0)
    setCode('')
    setResults([])
    setTimeLeft(SIM_DURATION)
    setTimeUsed(0)
    setFeedback(null)
    setPhase('running')
  }

  function endSim(finalResults, usedSecs) {
    setTimeUsed(usedSecs)
    setResults(finalResults)
    setPhase('done')
  }

  useEffect(() => {
    if (phase !== 'running') return
    if (timeLeft <= 0) {
      endSim(results, SIM_DURATION)
      return
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, timeLeft])

  function advance(newResults) {
    if (currentIdx + 1 >= simQuestions.length) {
      endSim(newResults, SIM_DURATION - timeLeft)
    } else {
      setCurrentIdx(i => i + 1)
      setCode('')
      setFeedback(null)
    }
  }

  async function handleSubmit() {
    if (!simQuestions[currentIdx] || submitting) return
    setSubmitting(true)
    const q = simQuestions[currentIdx]
    let correct = false
    try {
      const res = await submitSQL(code, q.id, 'sqlite')
      correct = res.correct
    } catch {}
    const newResult = { question: q, correct, skipped: false }
    const newResults = [...results, newResult]
    setFeedback({ correct, msg: correct ? '✓ Correct!' : '✗ Not quite.' })
    setTimeout(() => {
      setResults(newResults)
      advance(newResults)
      setSubmitting(false)
    }, 1200)
  }

  function handleSkip() {
    const q = simQuestions[currentIdx]
    const newResult = { question: q, correct: false, skipped: true }
    const newResults = [...results, newResult]
    setResults(newResults)
    advance(newResults)
  }

  if (phase === 'ready') return <ReadyScreen onStart={startSim} />
  if (phase === 'done')  return <DoneScreen simQuestions={simQuestions} results={results} timeUsed={timeUsed} onRetry={() => setPhase('ready')} />

  const q = simQuestions[currentIdx]
  const timerClass = timeLeft <= 300
    ? 'sim-timer sim-timer-urgent'
    : timeLeft <= 600
    ? 'sim-timer sim-timer-warn'
    : 'sim-timer'

  return (
    <div className="sim-page sim-running">
      <div className="sim-run-header">
        <div className="sim-run-header-left">
          <span className="sim-q-num">Q{currentIdx + 1} / {simQuestions.length}</span>
          <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
          <span className="sim-q-cat">{q.category}</span>
        </div>
        <span className={timerClass}>{formatTime(timeLeft)}</span>
        <div className="sim-dots">
          {simQuestions.map((_, i) => (
            <span
              key={i}
              className={`sim-dot ${
                i < currentIdx ? 'sim-dot-done' :
                i === currentIdx ? 'sim-dot-current' :
                'sim-dot-pending'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="sim-body">
        <div className="sim-problem-col">
          <h2 className="sim-problem-title">{q.title}</h2>
          <div className="sim-problem-desc" dangerouslySetInnerHTML={{ __html: q.description }} />
        </div>

        <div className="sim-editor-col">
          <CodeMirror
            key={q.id}
            value={code}
            onChange={setCode}
            extensions={[sql()]}
            theme={isDark ? oneDark : 'light'}
            className="sim-editor"
            basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
          />

          {submitFeedback && (
            <div className={`sim-feedback-banner ${submitFeedback.correct ? 'sim-fb-correct' : 'sim-fb-wrong'}`}>
              {submitFeedback.msg}
            </div>
          )}

          <div className="sim-editor-actions">
            <button className="btn btn-ghost btn-sm" onClick={handleSkip} disabled={submitting}>
              Skip →
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !code.trim()}
            >
              {submitting ? 'Checking…' : 'Submit'}
            </button>
          </div>
          <p className="sim-no-hints">No hints in simulator mode.</p>
        </div>
      </div>
    </div>
  )
}
