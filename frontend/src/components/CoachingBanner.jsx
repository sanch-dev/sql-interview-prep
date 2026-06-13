import { useState } from 'react'
import { COACHING } from '../data/coaching'

export default function CoachingBanner({ questionId }) {
  const [open, setOpen] = useState(true)
  const c = COACHING[questionId]
  if (!c || !c.commonMistakes?.length) return null

  return (
    <div className={`coaching-banner ${open ? 'coaching-banner-open' : ''}`}>
      <button className="coaching-banner-toggle" onClick={() => setOpen(o => !o)}>
        <span className="coaching-banner-label">
          <span className="coaching-warn-icon">⚠</span>
          Common Mistakes · <strong>{c.pattern}</strong>
        </span>
        <span className="coaching-banner-chev">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="coaching-mistake-list">
          {c.commonMistakes.map((m, i) => (
            <li key={i} className="coaching-mistake-item">
              <span className="coaching-mistake-bullet">✗</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
