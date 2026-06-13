import { useMemo, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']
const STATUSES = [
  { value: 'All',       label: 'All status' },
  { value: 'solved',    label: '✓ Solved' },
  { value: 'attempted', label: '◐ Attempted' },
  { value: 'todo',      label: '○ Not started' },
]

// Canonical category display order
const CAT_ORDER = [
  'Filtering', 'Aggregation', 'Subqueries', 'Joins', 'CTEs',
  'Window Functions', 'Ranking', 'NULL Handling',
  'String Functions', 'Date Functions', 'Set Operations',
  'Data Analysis', 'Performance', 'Schema Design',
]

function statusIcon(status) {
  if (status === 'solved')    return <span className="status-icon solved">✓</span>
  if (status === 'attempted') return <span className="status-icon attempted">◐</span>
  return <span className="status-icon todo">○</span>
}

export default function Sidebar({ questions, selectedId, onSelect }) {
  const { progress, solvedCount, reviewMarks } = useProgress()
  const [search, setSearch]             = useState('')
  const [difficulty, setDifficulty]     = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [company, setCompany]           = useState('All')
  const [reviewMode, setReviewMode]     = useState(false)
  const [openCats, setOpenCats]         = useState(new Set())

  const companies = useMemo(() => {
    const all = new Set()
    questions.forEach(q => (q.companies || []).forEach(c => all.add(c)))
    return ['All', ...Array.from(all).sort()]
  }, [questions])

  // Apply filters to produce a flat list
  const filtered = useMemo(() => {
    let list = questions.filter(q => {
      if (difficulty !== 'All' && q.difficulty !== difficulty) return false
      const qStatus = progress[q.id]?.status || 'todo'
      if (reviewMode) return qStatus === 'attempted' || reviewMarks.has(q.id)
      if (statusFilter !== 'All' && qStatus !== statusFilter) return false
      if (company !== 'All' && !(q.companies || []).includes(company)) return false
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    if (reviewMode) {
      list = [...list].sort((a, b) => {
        const aDate = progress[a.id]?.updatedAt || ''
        const bDate = progress[b.id]?.updatedAt || ''
        return aDate.localeCompare(bDate)
      })
    }
    return list
  }, [questions, difficulty, statusFilter, company, reviewMode, search, progress, reviewMarks])

  // Group by category (only for normal mode — review mode stays flat)
  const grouped = useMemo(() => {
    if (reviewMode) return null
    const map = {}
    filtered.forEach(q => {
      if (!map[q.category]) map[q.category] = []
      map[q.category].push(q)
    })
    const orderedKeys = [
      ...CAT_ORDER.filter(k => map[k]),
      ...Object.keys(map).filter(k => !CAT_ORDER.includes(k)).sort(),
    ]
    return { map, keys: orderedKeys }
  }, [filtered, reviewMode])

  // Per-category progress (all questions, not just filtered)
  const catProgress = useMemo(() => {
    const result = {}
    questions.forEach(q => {
      if (!result[q.category]) result[q.category] = { total: 0, solved: 0 }
      result[q.category].total++
      if ((progress[q.id]?.status || 'todo') === 'solved') result[q.category].solved++
    })
    return result
  }, [questions, progress])

  function toggleCat(cat) {
    setOpenCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleReviewMode() {
    setReviewMode(v => !v)
    if (!reviewMode) { setStatusFilter('All'); setSearch('') }
  }

  function pickRandom() {
    if (!filtered.length) return
    onSelect(filtered[Math.floor(Math.random() * filtered.length)])
  }

  const total = questions.length
  const reviewCount = useMemo(
    () => questions.filter(q => (progress[q.id]?.status || 'todo') === 'attempted' || reviewMarks.has(q.id)).length,
    [questions, progress, reviewMarks]
  )

  const isFiltering = search || difficulty !== 'All' || statusFilter !== 'All' || company !== 'All'

  return (
    <aside className="sidebar">
      {/* Top controls */}
      <div className="sidebar-top">
        <div className="sidebar-stats">
          <span className="stat-label">Progress</span>
          <span className="stat-count">{solvedCount}<span className="stat-total">/{total}</span></span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${total ? (solvedCount / total) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="search"
            placeholder="Search questions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={reviewMode}
          />
        </div>

        <div className="filter-row">
          {DIFFICULTIES.map(d => (
            <button
              key={d}
              className={`chip ${difficulty === d ? 'chip-active' : ''} ${d !== 'All' ? `chip-${d.toLowerCase()}` : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="filter-row">
          <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} disabled={reviewMode}>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select className="filter-select" value={company} onChange={e => setCompany(e.target.value)}>
            {companies.map(c => <option key={c} value={c}>{c === 'All' ? 'All companies' : c}</option>)}
          </select>
        </div>

        <div className="sidebar-actions">
          <button
            className={`btn btn-sm w-full ${reviewMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={toggleReviewMode}
          >
            📚 Review{reviewCount > 0 ? ` (${reviewCount})` : ''}
          </button>
          <button className="btn btn-ghost btn-sm w-full" onClick={pickRandom}>🎲 Random</button>
        </div>
      </div>

      {/* Question list */}
      <nav className="question-list">
        {reviewMode && (
          <div className="review-mode-banner">
            Review mode — {filtered.length} question{filtered.length !== 1 ? 's' : ''} to revisit
          </div>
        )}

        {/* Review mode or when filtering: flat list */}
        {(reviewMode || isFiltering || !grouped) && (
          <>
            {filtered.length === 0 && (
              <p className="empty-list">
                {reviewMode ? 'Nothing to review — keep practicing!' : 'No questions match.'}
              </p>
            )}
            {filtered.map(q => {
              const qStatus = progress[q.id]?.status || 'todo'
              return (
                <button
                  key={q.id}
                  className={`q-item ${selectedId === q.id ? 'q-item-active' : ''} ${qStatus === 'solved' ? 'q-item-solved' : ''}`}
                  onClick={() => onSelect(q)}
                >
                  <div className="q-item-main">
                    {statusIcon(qStatus)}
                    <span className="q-item-title">{q.title}</span>
                    {reviewMarks.has(q.id) && <span className="q-item-bookmark">🔖</span>}
                  </div>
                  <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                </button>
              )
            })}
          </>
        )}

        {/* Normal mode: grouped by category */}
        {!reviewMode && !isFiltering && grouped && (
          <>
            {grouped.keys.length === 0 && <p className="empty-list">No questions match.</p>}
            {grouped.keys.map(cat => {
              const isOpen = openCats.has(cat)
              const catQs  = grouped.map[cat]
              const cp     = catProgress[cat] || { total: 0, solved: 0 }
              const allSolved = cp.solved === cp.total
              return (
                <div key={cat} className="cat-group">
                  <button
                    className={`cat-header ${isOpen ? 'cat-header-open' : ''}`}
                    onClick={() => toggleCat(cat)}
                  >
                    <span className="cat-chevron">{isOpen ? '▼' : '▶'}</span>
                    <span className="cat-name">{cat}</span>
                    <span className={`cat-progress ${allSolved ? 'cat-progress-done' : ''}`}>
                      {cp.solved}/{catQs.length}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="cat-questions">
                      {catQs.map(q => {
                        const qStatus = progress[q.id]?.status || 'todo'
                        return (
                          <button
                            key={q.id}
                            className={`q-item q-item-nested ${selectedId === q.id ? 'q-item-active' : ''} ${qStatus === 'solved' ? 'q-item-solved' : ''}`}
                            onClick={() => onSelect(q)}
                          >
                            <div className="q-item-main">
                              {statusIcon(qStatus)}
                              <span className="q-item-title">{q.title}</span>
                              {reviewMarks.has(q.id) && <span className="q-item-bookmark">🔖</span>}
                            </div>
                            <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-count">{filtered.length} of {total} questions</span>
      </div>
    </aside>
  )
}
