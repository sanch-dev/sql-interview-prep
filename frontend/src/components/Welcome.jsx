import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProgress } from '../contexts/ProgressContext'

const CAT_ICONS = {
  'Filtering':        '🔎',
  'Aggregation':      '📊',
  'Subqueries':       '🔄',
  'Joins':            '🔗',
  'CTEs':             '♻',
  'Window Functions': '🪟',
  'Ranking':          '🏆',
  'NULL Handling':    '∅',
  'String Functions': '🔤',
  'Date Functions':   '📅',
  'Set Operations':   '🔀',
  'Data Analysis':    '📈',
  'Performance':      '⚡',
  'Schema Design':    '🏗',
}

const CAT_ORDER = [
  'Filtering', 'Aggregation', 'Subqueries', 'Joins', 'CTEs',
  'Window Functions', 'Ranking', 'NULL Handling',
  'String Functions', 'Date Functions', 'Set Operations',
  'Data Analysis', 'Performance', 'Schema Design',
]

const DAILY_GOAL = 3

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Welcome({ questions, onSelect }) {
  const { user } = useAuth()
  const { progress, solvedCount, streak, todaySolved } = useProgress()

  const total    = questions.length
  const easyQs   = useMemo(() => questions.filter(q => q.difficulty === 'Easy'),   [questions])
  const mediumQs = useMemo(() => questions.filter(q => q.difficulty === 'Medium'), [questions])
  const hardQs   = useMemo(() => questions.filter(q => q.difficulty === 'Hard'),   [questions])

  const easySolved   = useMemo(() => easyQs.filter(q   => progress[q.id]?.status === 'solved').length, [easyQs,   progress])
  const mediumSolved = useMemo(() => mediumQs.filter(q => progress[q.id]?.status === 'solved').length, [mediumQs, progress])
  const hardSolved   = useMemo(() => hardQs.filter(q   => progress[q.id]?.status === 'solved').length, [hardQs,   progress])

  const lastAttempted = useMemo(() => {
    const entries = Object.entries(progress)
      .filter(([, p]) => p?.updatedAt)
      .sort(([, a], [, b]) => b.updatedAt.localeCompare(a.updatedAt))
    if (!entries.length) return null
    const [id] = entries[0]
    return questions.find(q => q.id === id) || null
  }, [progress, questions])

  const catStats = useMemo(() => {
    const map = {}
    questions.forEach(q => {
      if (!map[q.category]) map[q.category] = { total: 0, solved: 0 }
      map[q.category].total++
      if (progress[q.id]?.status === 'solved') map[q.category].solved++
    })
    return map
  }, [questions, progress])

  const orderedCats = CAT_ORDER.filter(c => catStats[c])
  const name = user?.email?.split('@')[0] || 'there'
  const goalPct = Math.min(100, (todaySolved / DAILY_GOAL) * 100)

  const diffCards = [
    { label: 'Easy',   solved: easySolved,   qs: easyQs,   cls: 'diff-easy'   },
    { label: 'Medium', solved: mediumSolved, qs: mediumQs, cls: 'diff-medium' },
    { label: 'Hard',   solved: hardSolved,   qs: hardQs,   cls: 'diff-hard'   },
  ]

  return (
    <div className="welcome">

      {/* ── Greeting ──────────────────────────────────────────── */}
      <div className="welcome-greeting">
        <div>
          <h1 className="welcome-title">
            {getGreeting()}, <span className="greeting-name">{name}</span> 👋
          </h1>
          <p className="welcome-sub">
            {solvedCount === 0
              ? 'Start your SQL interview prep journey today.'
              : `You've solved ${solvedCount} of ${total} questions — keep the momentum going.`}
          </p>
        </div>
        {solvedCount === 0 && (
          <button
            className="btn btn-primary btn-lg"
            onClick={() => easyQs.length && onSelect(easyQs[0])}
          >
            Start Practicing →
          </button>
        )}
      </div>

      {/* ── Top cards ─────────────────────────────────────────── */}
      <div className="welcome-cards-row">

        {/* Daily goal */}
        <div className="wcard wcard-goal">
          <div className="wcard-head">
            <span className="wcard-label">Daily Goal</span>
            {streak > 0 && <span className="streak-pill">🔥 {streak} day streak</span>}
          </div>
          <div className="goal-track">
            <div className="goal-bar">
              <div className="goal-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <span className="goal-fraction">
              {todaySolved}<span>/{DAILY_GOAL}</span>
            </span>
          </div>
          <p className="goal-note">
            {todaySolved >= DAILY_GOAL
              ? '✓ Goal reached — keep the momentum!'
              : `${DAILY_GOAL - todaySolved} more to reach today's goal`}
          </p>
        </div>

        {/* Continue / start */}
        {lastAttempted ? (
          <button className="wcard wcard-continue" onClick={() => onSelect(lastAttempted)}>
            <span className="continue-eyebrow">Continue where you left off</span>
            <span className={`badge badge-${lastAttempted.difficulty.toLowerCase()} badge-light`}>
              {lastAttempted.difficulty}
            </span>
            <span className="continue-title">{lastAttempted.title}</span>
            <span className="continue-cta">Resume →</span>
          </button>
        ) : (
          <div className="wcard wcard-start">
            <span className="continue-eyebrow">Ready to begin?</span>
            <span className="continue-title">Start with Easy questions</span>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => easyQs.length && onSelect(easyQs[0])}
            >
              Go to first question →
            </button>
          </div>
        )}

        {/* Overall */}
        <div className="wcard wcard-overall">
          <div className="wcard-head">
            <span className="wcard-label">Overall</span>
            <span className="overall-fraction">{solvedCount}<span>/{total}</span></span>
          </div>
          <div className="overall-bar">
            <div className="overall-fill" style={{ width: `${total ? (solvedCount / total) * 100 : 0}%` }} />
          </div>
          <p className="goal-note">
            {Math.round(total ? (solvedCount / total) * 100 : 0)}% complete
          </p>
        </div>
      </div>

      {/* ── Difficulty breakdown ───────────────────────────────── */}
      <section className="welcome-block">
        <h2 className="block-title">By Difficulty</h2>
        <div className="diff-row">
          {diffCards.map(d => (
            <div key={d.label} className={`diff-card ${d.cls}`}>
              <div className="diff-top">
                <span className="diff-label">{d.label}</span>
                <span className="diff-count">{d.solved}/{d.qs.length}</span>
              </div>
              <div className="diff-bar">
                <div className="diff-fill" style={{ width: `${d.qs.length ? (d.solved / d.qs.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category grid ─────────────────────────────────────── */}
      <section className="welcome-block">
        <h2 className="block-title">Browse by Category</h2>
        <div className="cat-grid">
          {orderedCats.map(cat => {
            const st = catStats[cat]
            const pct = st.total ? (st.solved / st.total) * 100 : 0
            const allDone = st.solved === st.total && st.total > 0
            return (
              <button
                key={cat}
                className={`cat-card ${allDone ? 'cat-card-done' : ''}`}
                onClick={() => {
                  const first = questions.find(q => q.category === cat)
                  if (first) onSelect(first)
                }}
              >
                <span className="cat-card-icon">{CAT_ICONS[cat] || '📋'}</span>
                <span className="cat-card-name">{cat}</span>
                <span className="cat-card-count">{st.solved}/{st.total}</span>
                <div className="cat-card-bar">
                  <div className="cat-card-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            )
          })}
        </div>
      </section>

    </div>
  )
}
