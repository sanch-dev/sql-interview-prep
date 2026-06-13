import { useState } from 'react'
import { COACHING } from '../data/coaching'

export default function PatternDebrief({ questionId, mastered, onDismiss }) {
  const [expanded, setExpanded] = useState(true)
  const c = COACHING[questionId]
  if (!c) return null

  return (
    <div className="debrief-card">
      <div className="debrief-header">
        <div className="debrief-header-left">
          <span className="debrief-tag">Pattern</span>
          <span className="debrief-pattern-name">{c.pattern}</span>
          {mastered && <span className="mastery-badge">⭐ Mastered</span>}
        </div>
        <div className="debrief-header-right">
          <button className="debrief-toggle btn-icon" onClick={() => setExpanded(e => !e)} title={expanded ? 'Collapse' : 'Expand'}>
            {expanded ? '▲' : '▼'}
          </button>
          <button className="debrief-close btn-icon" onClick={onDismiss} title="Dismiss">✕</button>
        </div>
      </div>

      {expanded && (
        <div className="debrief-body">
          <div className="debrief-section">
            <div className="debrief-section-label">Why this technique works</div>
            <p className="debrief-text">{c.debrief}</p>
          </div>

          <div className="debrief-section">
            <div className="debrief-section-label">Variants you'll see in interviews</div>
            <ul className="debrief-variants">
              {c.variants.map((v, i) => (
                <li key={i} className="debrief-variant-item">
                  <span className="debrief-variant-bullet">→</span>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="debrief-de-context">
            <span className="debrief-de-icon">🏭</span>
            <p className="debrief-de-text">{c.deContext}</p>
          </div>
        </div>
      )}
    </div>
  )
}
