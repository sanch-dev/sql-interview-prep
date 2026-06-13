import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProgress } from '../contexts/ProgressContext'
import { STAGES, getNextUp, getStageStats } from '../lib/stages'
import DonutRing from './DonutRing'

const DAILY_GOAL = 3

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function ReadinessMeter({ score }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#f59e0b' : '#3b82f6'
  const label = score >= 70 ? 'Interview Ready' : score >= 40 ? 'Building Skills' : 'Just Starting'

  return (
    <div className="readiness-meter">
      <div className="readiness-ring-wrap">
        <svg viewBox="0 0 64 64" className="readiness-ring-svg">
          <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="32" cy="32" r="27"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={`${(score / 100) * 169.6} 169.6`}
            strokeLinecap="round"
            transform="rotate(-90 32 32)"
          />
        </svg>
        <div className="readiness-ring-inner">
          <span className="readiness-ring-num">{score}</span>
          <span className="readiness-ring-pct">%</span>
        </div>
      </div>
      <div className="readiness-meta">
        <span className="readiness-title">Readiness Score</span>
        <span className="readiness-label-text" style={{ color }}>{label}</span>
        <span className="readiness-hint">Mastered questions count double</span>
      </div>
    </div>
  )
}

export default function Welcome({ questions, onSelect }) {
  const { user }    = useAuth()
  const { progress, solvedCount, streak, todaySolved, readinessScore, masteredCount, topWeakSpots } = useProgress()

  const total  = questions.length
  const name   = user?.email?.split('@')[0] || 'there'

  const nextUp     = useMemo(() => getNextUp(questions, progress), [questions, progress])
  const stageStats = useMemo(() => getStageStats(questions, progress), [questions, progress])

  return (
    <div className="welcome">

      {/* ── Greeting + readiness ────────────────────────────── */}
      <div className="wh-top">
        <div className="wh-greeting">
          <h1 className="wh-title">
            {getGreeting()}, <span className="greeting-name">{name}</span> 👋
          </h1>
          <p className="wh-sub">
            {solvedCount === 0
              ? 'Start your SQL interview prep journey.'
              : `${solvedCount} solved · ${masteredCount} mastered — keep the momentum.`}
          </p>
        </div>

        <ReadinessMeter score={readinessScore} />
      </div>

      {/* ── Stats row ───────────────────────────────────────── */}
      <div className="wh-stats-row">
        {streak > 0 && (
          <div className="wh-stat">
            <span className="wh-stat-val">🔥 {streak}</span>
            <span className="wh-stat-lbl">day streak</span>
          </div>
        )}
        <div className="wh-stat">
          <span className="wh-stat-val">{todaySolved}<span className="wh-stat-dim">/{DAILY_GOAL}</span></span>
          <span className="wh-stat-lbl">today's goal</span>
        </div>
        <div className="wh-stat">
          <span className="wh-stat-val">{solvedCount}<span className="wh-stat-dim">/{total}</span></span>
          <span className="wh-stat-lbl">solved</span>
        </div>
        <div className="wh-stat">
          <span className="wh-stat-val">{masteredCount}<span className="wh-stat-dim">/{total}</span></span>
          <span className="wh-stat-lbl">mastered</span>
        </div>
      </div>

      {/* ── Weak spots ─────────────────────────────────────── */}
      {topWeakSpots.length > 0 && (
        <div className="wh-weakspots">
          <h2 className="wh-section-title">Focus Areas</h2>
          <div className="weakspot-list">
            {topWeakSpots.map(({ category, count }) => (
              <div key={category} className="weakspot-item">
                <span className="weakspot-icon">⚠</span>
                <span className="weakspot-cat">{category}</span>
                <span className="weakspot-count">{count} wrong attempt{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
          <p className="weakspot-hint">Practice these categories to improve your readiness score.</p>
        </div>
      )}

      {/* ── Primary CTA ─────────────────────────────────────── */}
      {nextUp ? (
        <button className="wh-cta" onClick={() => onSelect(nextUp.question)}>
          <div className="wh-cta-text">
            <span className="wh-cta-eyebrow">
              {nextUp.stage.emoji} {nextUp.stage.label} · {nextUp.category}
            </span>
            <span className="wh-cta-title">{nextUp.question.title}</span>
            <span className={`badge wh-cta-badge badge-${nextUp.question.difficulty.toLowerCase()}`}>
              {nextUp.question.difficulty}
            </span>
          </div>
          <span className="wh-cta-arrow">Continue →</span>
        </button>
      ) : (
        <div className="wh-cta wh-cta-done">
          <span className="wh-cta-title">🎉 All {total} questions complete — you're ready!</span>
        </div>
      )}

      {/* ── Stage cards ─────────────────────────────────────── */}
      <section className="wh-stages">
        <h2 className="wh-section-title">Your Learning Path</h2>
        <div className="wh-stage-grid">
          {STAGES.map((stage) => {
            const st   = stageStats[stage.id]
            const pct  = st.total ? Math.round((st.solved / st.total) * 100) : 0
            const done = st.solved === st.total && st.total > 0

            return (
              <div
                key={stage.id}
                className={`wh-stage-card ${done ? 'wh-stage-done' : ''}`}
              >
                <div className="wh-stage-ring">
                  <DonutRing solved={st.solved} total={st.total} size={48} color={stage.color} />
                  {done && <span className="wh-stage-check">✓</span>}
                </div>
                <span className="wh-stage-name">{stage.emoji} {stage.label}</span>
                <span className="wh-stage-desc">{stage.description}</span>
                <span className="wh-stage-pct" style={{ color: stage.color }}>
                  {pct}% · {st.solved}/{st.total}
                </span>
              </div>
            )
          })}
        </div>
      </section>

    </div>
  )
}
