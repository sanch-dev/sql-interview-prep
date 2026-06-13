import { useMemo, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import { PATTERNS, computeAllPatternMastery, computeReadinessScore, LEVEL_CONFIG } from '../data/patterns'

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']

function StatusDot({ status, mastered }) {
  if (mastered) return <span className="qdot qdot-mastered" title="Mastered">★</span>
  if (status === 'solved')    return <span className="qdot qdot-solved" title="Solved">✓</span>
  if (status === 'attempted') return <span className="qdot qdot-attempted" title="Attempted">◐</span>
  return <span className="qdot qdot-todo" title="Not started">○</span>
}

export default function Sidebar({ questions, selectedId, onSelect, mobileOpen, onMobileClose, onGoSimulator }) {
  const { progress, mastery, reviewMarks } = useProgress()
  const [search,       setSearch]       = useState('')
  const [difficulty,   setDifficulty]   = useState('All')
  const [openPatterns, setOpenPatterns] = useState(() => new Set())

  const patternMasteries = useMemo(
    () => computeAllPatternMastery(questions, progress, mastery),
    [questions, progress, mastery]
  )

  const readinessScore = useMemo(
    () => computeReadinessScore(patternMasteries),
    [patternMasteries]
  )

  const masteredCount = useMemo(
    () => questions.filter(q => mastery[q.id]?.mastered).length,
    [questions, mastery]
  )

  const scoreColor = readinessScore >= 70 ? '#16a34a' : readinessScore >= 40 ? '#f59e0b' : '#3b82f6'

  // Show flat filtered list when search or difficulty filter is active
  const showFlat = search.trim().length > 0 || difficulty !== 'All'

  const filtered = useMemo(() => {
    if (!showFlat) return []
    return questions.filter(q => {
      if (difficulty !== 'All' && q.difficulty !== difficulty) return false
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [questions, search, difficulty, showFlat])

  function togglePattern(id) {
    setOpenPatterns(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSelect(q) {
    onSelect(q)
    onMobileClose?.()
  }

  function pickRandom() {
    if (!questions.length) return
    const unmastered = questions.filter(q => !mastery[q.id]?.mastered)
    const pool = unmastered.length > 0 ? unmastered : questions
    handleSelect(pool[Math.floor(Math.random() * pool.length)])
  }

  function getStatus(q) {
    return progress[q.id]?.status || 'todo'
  }

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>

        {/* ── Readiness bar ─────────────────────────────────────── */}
        <div className="sb-coach-bar">
          <div className="sb-coach-bar-row">
            <span className="sb-coach-label">Interview Readiness</span>
            <span className="sb-coach-score" style={{ color: scoreColor }}>{readinessScore}%</span>
          </div>
          <div className="sb-coach-track">
            <div className="sb-coach-fill" style={{ width: `${readinessScore}%`, background: scoreColor }} />
          </div>
          {masteredCount > 0 && (
            <span className="sb-coach-mastered">⭐ {masteredCount} question{masteredCount !== 1 ? 's' : ''} mastered</span>
          )}
        </div>

        {/* ── Search ────────────────────────────────────────────── */}
        <div className="sb-search-row">
          <div className="sb-search-wrap">
            <span className="sb-search-icon">🔍</span>
            <input
              className="sb-search"
              type="search"
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* ── Difficulty chips ──────────────────────────────────── */}
        <div className="sb-diff-chips">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className={`chip chip-sm ${difficulty === d ? 'chip-active' : ''} ${d !== 'All' ? `chip-${d.toLowerCase()}` : ''}`}
              onClick={() => setDifficulty(d)}
            >{d}</button>
          ))}
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="sb-body">

          {showFlat ? (
            <div className="sb-flat">
              {filtered.length === 0 ? (
                <p className="sb-empty">No questions match.</p>
              ) : filtered.map(q => {
                const st  = getStatus(q)
                const isM = mastery[q.id]?.mastered
                return (
                  <button
                    key={q.id}
                    className={`qrow ${selectedId === q.id ? 'qrow-active' : ''}`}
                    onClick={() => handleSelect(q)}
                  >
                    <StatusDot status={st} mastered={isM} />
                    <span className="qrow-title">{q.title}</span>
                    {reviewMarks.has(q.id) && <span className="q-bookmark">🔖</span>}
                    <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="sb-pattern-list">
              <div className="sb-section-label">INTERVIEW PATTERNS</div>

              {PATTERNS.map(pattern => {
                const pm      = patternMasteries[pattern.id]
                const lc      = LEVEL_CONFIG[pm.level]
                const isOpen  = openPatterns.has(pattern.id)
                const patternQs = questions.filter(q => pattern.questionIds.includes(q.id))

                return (
                  <div key={pattern.id} className="sb-pattern-group">
                    <button
                      className={`sb-pattern-header ${isOpen ? 'sb-pattern-header-open' : ''}`}
                      onClick={() => togglePattern(pattern.id)}
                    >
                      <span className="sb-p-icon" style={{ color: pattern.color }}>{pattern.icon}</span>
                      <div className="sb-p-info">
                        <span className="sb-p-name">{pattern.name}</span>
                        <div className="sb-p-bar">
                          <div
                            className="sb-p-bar-fill"
                            style={{ width: `${pm.masteryPct}%`, background: pattern.color }}
                          />
                        </div>
                      </div>
                      <span className="sb-p-level" style={{ color: lc.color }} title={lc.label}>
                        {lc.icon}
                      </span>
                      <span className="sb-p-count">{pm.masteredCount}/{pm.totalCount}</span>
                      <span className="sb-p-chev">{isOpen ? '▾' : '▸'}</span>
                    </button>

                    {isOpen && (
                      <div className="sb-pattern-questions">
                        <div className="sb-p-level-row">
                          <span className="sb-p-level-badge" style={{ color: lc.color }}>
                            {lc.icon} {lc.label}
                          </span>
                          {pm.nextAction && (
                            <span className="sb-p-next-action">{pm.nextAction}</span>
                          )}
                        </div>
                        {patternQs.map(q => {
                          const st  = getStatus(q)
                          const isM = mastery[q.id]?.mastered
                          return (
                            <button
                              key={q.id}
                              className={`qrow qrow-nested ${selectedId === q.id ? 'qrow-active' : ''}`}
                              onClick={() => handleSelect(q)}
                            >
                              <StatusDot status={st} mastered={isM} />
                              <span className="qrow-title">{q.title}</span>
                              {reviewMarks.has(q.id) && <span className="q-bookmark">🔖</span>}
                              <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────────── */}
        <div className="sb-footer">
          <button className="btn btn-ghost btn-sm w-full" onClick={onGoSimulator}>
            🎯 Interview Simulator
          </button>
          <button className="btn btn-ghost btn-sm w-full" onClick={pickRandom}>
            🎲 Random from weak patterns
          </button>
        </div>
      </aside>
    </>
  )
}
