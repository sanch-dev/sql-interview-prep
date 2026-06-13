import { useMemo, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import { STAGES, getMastery, getNextUp, getStageStats } from '../lib/stages'
import DonutRing from './DonutRing'

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']
const STATUSES = [
  { value: 'All',       label: 'All status'    },
  { value: 'solved',    label: '✓ Solved'       },
  { value: 'attempted', label: '◐ Attempted'    },
  { value: 'todo',      label: '○ Not started'  },
]

function StatusDot({ status }) {
  if (status === 'solved')    return <span className="qdot qdot-solved">✓</span>
  if (status === 'attempted') return <span className="qdot qdot-attempted">◐</span>
  return <span className="qdot qdot-todo">○</span>
}

export default function Sidebar({ questions, selectedId, onSelect, mobileOpen, onMobileClose }) {
  const { progress, reviewMarks } = useProgress()

  const [search,       setSearch]       = useState('')
  const [difficulty,   setDifficulty]   = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [company,      setCompany]      = useState('All')
  const [reviewMode,   setReviewMode]   = useState(false)
  const [showFilters,  setShowFilters]  = useState(false)
  const [openStages,   setOpenStages]   = useState(() => new Set(['foundations']))
  const [openCats,     setOpenCats]     = useState(() => new Set())

  const getStatus = (q) => progress[q.id]?.status || 'todo'

  const isFiltering = search || difficulty !== 'All' || statusFilter !== 'All' || company !== 'All'

  const companies = useMemo(() => {
    const all = new Set()
    questions.forEach(q => (q.companies || []).forEach(c => all.add(c)))
    return ['All', ...Array.from(all).sort()]
  }, [questions])

  const filtered = useMemo(() => {
    if (!isFiltering && !reviewMode) return []
    return questions.filter(q => {
      if (difficulty !== 'All' && q.difficulty !== difficulty) return false
      const st = getStatus(q)
      if (reviewMode) return st === 'attempted' || reviewMarks.has(q.id)
      if (statusFilter !== 'All' && st !== statusFilter) return false
      if (company !== 'All' && !(q.companies || []).includes(company)) return false
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [questions, difficulty, statusFilter, company, reviewMode, search, progress, reviewMarks])

  const stageStats = useMemo(() => getStageStats(questions, progress), [questions, progress])

  const catStats = useMemo(() => {
    const map = {}
    questions.forEach(q => {
      if (!map[q.category]) map[q.category] = { total: 0, solved: 0 }
      map[q.category].total++
      if (getStatus(q) === 'solved') map[q.category].solved++
    })
    return map
  }, [questions, progress])

  const nextUp = useMemo(() => getNextUp(questions, progress), [questions, progress])

  const reviewCount = useMemo(
    () => questions.filter(q => getStatus(q) === 'attempted' || reviewMarks.has(q.id)).length,
    [questions, progress, reviewMarks]
  )

  function toggleStage(id) {
    setOpenStages(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleCat(cat) {
    setOpenCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  function pickRandom() {
    if (!questions.length) return
    const q = questions[Math.floor(Math.random() * questions.length)]
    onSelect(q)
    onMobileClose?.()
  }

  function handleSelect(q) {
    onSelect(q)
    onMobileClose?.()
  }

  const showFlat = isFiltering || reviewMode

  return (
    <>
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>

        {/* ── Search bar ──────────────────────────────── */}
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
          <button
            className={`sb-filter-btn ${showFilters ? 'sb-filter-btn-active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
            title="Filters"
          >
            ⚙
          </button>
        </div>

        {/* ── Filters (collapsible) ───────────────────── */}
        {showFilters && (
          <div className="sb-filters">
            <div className="sb-chips">
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`chip ${difficulty === d ? 'chip-active' : ''} ${d !== 'All' ? `chip-${d.toLowerCase()}` : ''}`}
                  onClick={() => setDifficulty(d)}
                >{d}</button>
              ))}
            </div>
            <div className="sb-selects">
              <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select className="filter-select" value={company} onChange={e => setCompany(e.target.value)}>
                {companies.map(c => <option key={c} value={c}>{c === 'All' ? 'All companies' : c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── Body ────────────────────────────────────── */}
        <div className="sb-body">

          {showFlat ? (
            /* ── Flat filtered list ─────────────────── */
            <div className="sb-flat">
              {reviewMode && (
                <div className="sb-banner">📚 Review — {filtered.length} to revisit</div>
              )}
              {filtered.length === 0 ? (
                <p className="sb-empty">
                  {reviewMode ? 'Nothing to review — keep practicing!' : 'No questions match.'}
                </p>
              ) : filtered.map(q => {
                const st = getStatus(q)
                return (
                  <button
                    key={q.id}
                    className={`qrow ${selectedId === q.id ? 'qrow-active' : ''} ${st === 'solved' ? 'qrow-solved' : ''}`}
                    data-diff={q.difficulty.toLowerCase()}
                    onClick={() => handleSelect(q)}
                  >
                    <StatusDot status={st} />
                    <span className="qrow-title">{q.title}</span>
                    {reviewMarks.has(q.id) && <span className="q-bookmark">🔖</span>}
                    <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            /* ── Learning Path ──────────────────────── */
            <div className="learning-path">

              {/* Next Up card */}
              {nextUp && (
                <div className="lp-section">
                  <span className="lp-label">Next Up</span>
                  <button className="next-up-card" onClick={() => handleSelect(nextUp.question)}>
                    <div className="nuc-body">
                      <span className="nuc-stage">
                        {nextUp.stage.emoji} {nextUp.stage.label} · {nextUp.category}
                      </span>
                      <span className="nuc-title">{nextUp.question.title}</span>
                      <span className={`badge badge-${nextUp.question.difficulty.toLowerCase()}`}>
                        {nextUp.question.difficulty}
                      </span>
                    </div>
                    <span className="nuc-arrow">→</span>
                  </button>
                </div>
              )}

              {/* Stages */}
              <div className="lp-section">
                <span className="lp-label">Learning Path</span>

                {STAGES.map((stage, stageIdx) => {
                  const stats    = stageStats[stage.id]
                  const isOpen   = openStages.has(stage.id)
                  const stagePct = stats.total ? Math.round((stats.solved / stats.total) * 100) : 0

                  return (
                    <div key={stage.id} className="stage-group">
                      <button
                        className={`stage-header ${isOpen ? 'stage-header-open' : ''}`}
                        onClick={() => toggleStage(stage.id)}
                      >
                        <DonutRing solved={stats.solved} total={stats.total} size={30} color={stage.color} />
                        <div className="stage-info">
                          <span className="stage-name">{stage.emoji} {stage.label}</span>
                          <span className="stage-meta">{stagePct}% · {stats.solved}/{stats.total}</span>
                        </div>
                        <span className="stage-chevron">{isOpen ? '▾' : '▸'}</span>
                      </button>

                      {isOpen && (
                        <div className="stage-cats">
                          {stage.categories.map(catName => {
                            const catQs   = questions.filter(q => q.category === catName)
                            if (!catQs.length) return null
                            const cStats  = catStats[catName] || { total: 0, solved: 0 }
                            const cMast   = getMastery(cStats.solved, cStats.total)
                            const isCatOpen = openCats.has(catName)

                            return (
                              <div key={catName} className="cat-block">
                                <button
                                  className={`cat-row ${isCatOpen ? 'cat-row-open' : ''}`}
                                  onClick={() => toggleCat(catName)}
                                >
                                  <span className={`mastery-icon ${cMast.cls}`} title={cMast.label}>
                                    {cMast.icon}
                                  </span>
                                  <span className="cat-row-name">{catName}</span>
                                  <span className="cat-row-frac">{cStats.solved}/{cStats.total}</span>
                                  <span className="cat-row-chev">{isCatOpen ? '▾' : '▸'}</span>
                                </button>

                                {isCatOpen && (
                                  <div className="cat-questions">
                                    {catQs.map(q => {
                                      const st = getStatus(q)
                                      return (
                                        <button
                                          key={q.id}
                                          className={`qrow qrow-nested ${selectedId === q.id ? 'qrow-active' : ''} ${st === 'solved' ? 'qrow-solved' : ''}`}
                                          data-diff={q.difficulty.toLowerCase()}
                                          onClick={() => handleSelect(q)}
                                        >
                                          <StatusDot status={st} />
                                          <span className="qrow-title">{q.title}</span>
                                          {reviewMarks.has(q.id) && <span className="q-bookmark">🔖</span>}
                                          <span className={`badge badge-${q.difficulty.toLowerCase()}`}>
                                            {q.difficulty}
                                          </span>
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
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer actions ──────────────────────────── */}
        <div className="sb-footer">
          <button
            className={`btn btn-sm w-full ${reviewMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setReviewMode(v => !v)}
          >
            📚 Review{reviewCount > 0 ? ` (${reviewCount})` : ''}
          </button>
          <button className="btn btn-ghost btn-sm w-full" onClick={pickRandom}>
            🎲 Random
          </button>
        </div>
      </aside>
    </>
  )
}
