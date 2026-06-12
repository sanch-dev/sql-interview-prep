import { useCallback, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import { compareResults, executeSQL } from '../lib/sql'
import EditorPane from './EditorPane'
import ProblemPane from './ProblemPane'

export default function Workspace({ question, allQuestions, onSelect, onBack, theme }) {
  const { progress, updateProgress } = useProgress()
  const [results, setResults] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const savedCode = progress[question.id]?.solution || ''

  const currentIndex = allQuestions.findIndex((q) => q.id === question.id)
  const prevQ = currentIndex > 0 ? allQuestions[currentIndex - 1] : null
  const nextQ = currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1] : null

  const handleRun = useCallback(async (sql) => {
    setIsRunning(true)
    const result = await executeSQL(sql, question.schema)
    setResults({ ...result, type: 'run' })
    if (!result.error) updateProgress(question.id, { status: 'attempted', solution: sql })
    setIsRunning(false)
  }, [question, updateProgress])

  const handleSubmit = useCallback(async (sql) => {
    setIsRunning(true)
    const [userResult, refResult] = await Promise.all([
      executeSQL(sql, question.schema),
      executeSQL(question.solution, question.schema),
    ])

    if (userResult.error) {
      setResults({ ...userResult, type: 'submit' })
      setIsRunning(false)
      return
    }

    const correct = compareResults(userResult, refResult, question.order_matters)
    setResults({ ...userResult, type: 'submit', correct })

    const status = correct ? 'solved' : 'attempted'
    updateProgress(question.id, { status, solution: sql })
    setIsRunning(false)
  }, [question, updateProgress])

  const handleSave = useCallback((sql) => {
    updateProgress(question.id, { status: progress[question.id]?.status || 'attempted', solution: sql })
  }, [question.id, progress, updateProgress])

  return (
    <div className="workspace">
      <div className="workspace-nav">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← All questions</button>
        <span className="workspace-pos">{currentIndex + 1} / {allQuestions.length}</span>
        <div className="workspace-nav-btns">
          <button className="btn btn-ghost btn-sm" onClick={() => prevQ && onSelect(prevQ)} disabled={!prevQ}>← Prev</button>
          <button className="btn btn-ghost btn-sm" onClick={() => nextQ && onSelect(nextQ)} disabled={!nextQ}>Next →</button>
        </div>
      </div>

      <div className="workspace-split">
        <ProblemPane question={question} theme={theme} />
        <div className="split-divider" />
        <EditorPane
          question={question}
          initialValue={savedCode}
          results={results}
          isRunning={isRunning}
          onRun={handleRun}
          onSubmit={handleSubmit}
          onSave={handleSave}
          theme={theme}
        />
      </div>
    </div>
  )
}
