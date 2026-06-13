import { useCallback, useEffect, useRef, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import { executeSQL, submitSQL, getTableData } from '../lib/sql'
import EditorPane from './EditorPane'
import ProblemPane from './ProblemPane'

const DRAFTS_KEY = 'sqlforge_drafts'

function readDraft(questionId) {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}')[questionId] || '' } catch { return '' }
}
function writeDraft(questionId, code) {
  try {
    const all = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '{}')
    all[questionId] = code
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(all))
  } catch {}
}

export default function Workspace({ question, allQuestions, onSelect, onBack, theme }) {
  const { progress, updateProgress, reviewMarks, toggleReviewMark } = useProgress()
  const [results, setResults]           = useState(null)
  const [refResult, setRefResult]       = useState(null)
  const [isRunning, setIsRunning]       = useState(false)
  const [sampleTables, setSampleTables] = useState({})
  const [splitPct, setSplitPct]         = useState(42)
  const splitContainerRef               = useRef(null)

  const savedCode = readDraft(question.id) || progress[question.id]?.solution || ''

  const currentIndex = allQuestions.findIndex((q) => q.id === question.id)
  const prevQ = currentIndex > 0 ? allQuestions[currentIndex - 1] : null
  const nextQ = currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1] : null

  useEffect(() => {
    setSampleTables({})
    getTableData(question.id).then(setSampleTables)
  }, [question.id])

  const handleRun = useCallback(async (sql, dialect = 'sqlite') => {
    setIsRunning(true)
    setRefResult(null)
    const result = await executeSQL(sql, question.id, dialect)
    setResults({ ...result, type: 'run' })
    setIsRunning(false)
  }, [question.id])

  const handleSubmit = useCallback(async (sql, dialect = 'sqlite') => {
    setIsRunning(true)
    const { userResult, refResult: ref, correct } = await submitSQL(sql, question.id, dialect)

    if (userResult.error) {
      setResults({ ...userResult, type: 'submit' })
      setRefResult(null)
      setIsRunning(false)
      return
    }

    setResults({ ...userResult, type: 'submit', correct })
    setRefResult(ref)

    const status = correct ? 'solved' : 'attempted'
    updateProgress(question.id, { status, solution: sql })
    setIsRunning(false)
  }, [question.id, updateProgress])

  const handleSave = useCallback((code) => {
    writeDraft(question.id, code)
  }, [question.id])

  function startSplitDrag(e) {
    e.preventDefault()
    function onMove(ev) {
      if (!splitContainerRef.current) return
      const rect = splitContainerRef.current.getBoundingClientRect()
      const pct  = ((ev.clientX - rect.left) / rect.width) * 100
      setSplitPct(Math.max(25, Math.min(72, pct)))
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div className="workspace">
      <div className="workspace-nav">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← All questions</button>
        <span className="workspace-pos">{currentIndex + 1} / {allQuestions.length}</span>
        <div className="workspace-nav-btns">
          <button
            className={`btn btn-sm ${reviewMarks.has(question.id) ? 'btn-review-active' : 'btn-ghost'}`}
            onClick={() => toggleReviewMark(question.id)}
            title={reviewMarks.has(question.id) ? 'Remove from review' : 'Mark for review'}
          >
            {reviewMarks.has(question.id) ? '🔖 Marked' : '🔖 Review'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => prevQ && onSelect(prevQ)} disabled={!prevQ}>← Prev</button>
          <button className="btn btn-ghost btn-sm" onClick={() => nextQ && onSelect(nextQ)} disabled={!nextQ}>Next →</button>
        </div>
      </div>

      <div className="workspace-split" ref={splitContainerRef}>
        <div className="problem-pane-sizer" style={{ width: `${splitPct}%` }}>
          <ProblemPane question={question} theme={theme} sampleTables={sampleTables} />
        </div>
        <div className="split-drag-handle" onMouseDown={startSplitDrag} title="Drag to resize" />
        <EditorPane
          question={question}
          initialValue={savedCode}
          results={results}
          refResult={refResult}
          isRunning={isRunning}
          sampleTables={sampleTables}
          onRun={handleRun}
          onSubmit={handleSubmit}
          onSave={handleSave}
          theme={theme}
        />
      </div>
    </div>
  )
}
