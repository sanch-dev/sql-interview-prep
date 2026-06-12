import { useCallback, useEffect, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'
import { keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import ResultsPanel from './ResultsPanel'

export default function EditorPane({ question, initialValue, results, isRunning, onRun, onSubmit, onSave, theme }) {
  const [code, setCode] = useState(initialValue || '')
  const isDark = theme === 'dark'

  useEffect(() => {
    setCode(initialValue || '')
  }, [question.id, initialValue])

  const handleRun = useCallback(() => {
    onRun(code)
  }, [code, onRun])

  const handleSubmit = useCallback(() => {
    onSubmit(code)
  }, [code, onSubmit])

  const runKeymap = Prec.highest(
    keymap.of([
      { key: 'Ctrl-Enter', run: () => { handleRun(); return true } },
      { key: 'Mod-Enter',  run: () => { handleRun(); return true } },
    ])
  )

  // Auto-save on change
  useEffect(() => {
    const t = setTimeout(() => onSave(code), 1500)
    return () => clearTimeout(t)
  }, [code, onSave])

  return (
    <div className="editor-pane">
      <div className="editor-header">
        <span className="editor-label">SQL Editor</span>
        <div className="editor-actions">
          <kbd className="shortcut-hint">Ctrl+Enter to run</kbd>
          <button className="btn btn-outline btn-sm" onClick={handleRun} disabled={isRunning}>
            ▶ Run
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={isRunning}>
            ✓ Submit
          </button>
        </div>
      </div>

      <div className="cm-wrapper">
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={[sql(), runKeymap]}
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

      <ResultsPanel result={results} isRunning={isRunning} />
    </div>
  )
}
