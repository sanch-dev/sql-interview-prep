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
  const { progress, solvedCount } = useProgress()
  const [search, setSearch] = useState('')
  const [difficulty, setDifficulty] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const categories = useMemo(
    () => ['All', ...new Set(questions.map((q) => q.category))].sort((a, b) => a === 'All' ? -1 : a.localeCompare(b)),
    [questions]
  )
  const [category, setCategory] = useState('All')

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (difficulty !== 'All' && q.difficulty !== difficulty) return false
      if (category !== 'All' && q.category !== category) return false
      const qStatus = progress[q.id]?.status || 'todo'
      if (statusFilter !== 'All' && qStatus !== statusFilter) return false
      if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [questions, difficulty, category, statusFilter, search, progress])

  const total = questions.length

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
          <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="sidebar-actions">
          <button className="btn btn-ghost btn-sm w-full" onClick={pickRandom}>🎲 Random</button>
        </div>
      </div>

      <nav className="question-list">
        {filtered.length === 0 && (
          <p className="empty-list">No questions match your filters.</p>
        )}
        {filtered.map((q) => {
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
