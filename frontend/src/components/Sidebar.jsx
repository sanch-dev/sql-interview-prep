import { useMemo, useState } from 'react'
import { useProgress } from '../contexts/ProgressContext'

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard']
const STATUSES = [
  { value: 'All',       label: 'All' },
  { value: 'solved',    label: 'Solved' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'todo',      label: 'Not started' },
]

function statusIcon(status) {
  if (status === 'solved')    return <span className="status-icon solved">✓</span>
  if (status === 'attempted') return <span className="status-icon attempted">◐</span>
  return <span className="status-icon todo">○</span>
}

export default function Sidebar({ questions, selectedId, onSelect }) {
  const { progress, solvedCount, reviewMarks } = useProgress()
  const [search, setSearch]           = useState('')
  const [difficulty, setDifficulty]   = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [category, setCategory]       = useState('All')
  const [company, setCompany]         = useState('All')
  const [reviewMode, setReviewMode]   = useState(false)

  const categories = useMemo(
    () => ['All', ...new Set(questions.map((q) => q.category))].sort((a, b) => a === 'All' ? -1 : a.localeCompare(b)),
    [questions]
  )

  const companies = useMemo(() => {
    const all = new Set()
    questions.forEach((q) => (q.companies || []).forEach((c) => all.add(c)))
    return ['All', ...Array.from(all).sort()]
  }, [questions])

  const filtered = useMemo(() => {
    let list = questions.filter((q) => {
      if (difficulty !== 'All' && q.difficulty !== difficulty) return false
      if (category !== 'All' && q.category !== category) return false
      if (company !== 'All' && !(q.companies || []).includes(company)) return false
      const qStatus = progress[q.id]?.status || 'todo'
      if (reviewMode) return qStatus === 'attempted' || reviewMarks.has(q.id)
      if (statusFilter !== 'All' && qStatus !== statusFilter) return false
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
  }, [questions, difficulty, category, company, statusFilter, reviewMode, search, progress, reviewMarks])

  const total = questions.length
  const reviewCount = useMemo(
    () => questions.filter((q) => (progress[q.id]?.status || 'todo') === 'attempted' || reviewMarks.has(q.id)).length,
    [questions, progress, reviewMarks]
  )

  function toggleReviewMode() {
    setReviewMode((v) => !v)
    if (!reviewMode) {
      setStatusFilter('All')
      setSearch('')
    }
  }

  function pickRandom() {
    if (!filtered.length) return
    const q = filtered[Math.floor(Math.random() * filtered.length)]
    onSelect(q)
  }

  return (
    <aside className="sidebar">
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
            onChange={(e) => setSearch(e.target.value)}
            disabled={reviewMode}
          />
        </div>

        <div className="filter-row">
          {DIFFICULTIES.map((d) => (
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
          <select className="filter-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            disabled={reviewMode}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="filter-row">
          <select className="filter-select" value={company} onChange={(e) => setCompany(e.target.value)}>
            {companies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="sidebar-actions">
          <button
            className={`btn btn-sm w-full ${reviewMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={toggleReviewMode}
            title="Show questions you got wrong, oldest first"
          >
            📚 Review{reviewCount > 0 ? ` (${reviewCount})` : ''}
          </button>
          <button className="btn btn-ghost btn-sm w-full" onClick={pickRandom}>🎲 Random</button>
        </div>
      </div>

      <nav className="question-list">
        {reviewMode && (
          <div className="review-mode-banner">
            Review mode — {filtered.length} question{filtered.length !== 1 ? 's' : ''} to revisit, oldest first
          </div>
        )}
        {filtered.length === 0 && (
          <p className="empty-list">
            {reviewMode ? 'No questions to review — keep practicing!' : 'No questions match your filters.'}
          </p>
        )}
        {filtered.map((q) => {
          const qStatus = progress[q.id]?.status || 'todo'
          const marked  = reviewMarks.has(q.id)
          return (
            <button
              key={q.id}
              className={`q-item ${selectedId === q.id ? 'q-item-active' : ''} ${qStatus === 'solved' ? 'q-item-solved' : ''}`}
              onClick={() => onSelect(q)}
            >
              <div className="q-item-main">
                {statusIcon(qStatus)}
                <span className="q-item-title">{q.title}</span>
                {marked && <span className="q-item-bookmark" title="Marked for review">🔖</span>}
              </div>
              <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-count">{filtered.length} of {total} questions</span>
      </div>
    </aside>
  )
}
