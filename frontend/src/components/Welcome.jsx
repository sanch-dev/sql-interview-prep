import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useProgress } from '../contexts/ProgressContext'
import { STAGES, getNextUp, getStageStats, isStageUnlocked } from '../lib/stages'
import DonutRing from './DonutRing'

const DAILY_GOAL = 3

function getGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function Welcome({ questions, onSelect }) {
  const { user }    = useAuth()
  const { progress, solvedCount, streak, todaySolved } = useProgress()

  const total  = questions.length
  const name   = user?.email?.split('@')[0] || 'there'

  const nextUp     = useMemo(() => getNextUp(questions, progress), [questions, progress])
  const stageStats = useMemo(() => getStageStats(questions, progress), [questions, progress])

  const overallPct = total ? Math.round((solvedCount / total) * 100) : 0

  return (
    <div className="welcome">

      {/* ── Greeting + stats ────────────────────────────────── */}
      <div className="wh-top">
        <div className="wh-greeting">
          <h1 className="wh-title">
            {getGreeting()}, <span className="greeting-name">{name}</span> 👋
          </h1>
          <p className="wh-sub">
            {solvedCount === 0
              ? 'Start your SQL interview prep journey.'
              : `${solvedCount} of ${total} solved — keep the momentum going.`}
          </p>
        </div>

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
            <span className="wh-stat-val">{overallPct}<span className="wh-stat-dim">%</span></span>
            <span className="wh-stat-lbl">complete</span>
          </div>
        </div>
      </div>

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

      {/* ── Overall progress bar ────────────────────────────── */}
      <div className="wh-prog-wrap">
        <div className="wh-prog-bar">
          <div className="wh-prog-fill" style={{ width: `${overallPct}%` }} />
        </div>
        <span className="wh-prog-label">{solvedCount} / {total} questions solved</span>
      </div>

      {/* ── Stage cards ─────────────────────────────────────── */}
      <section className="wh-stages">
        <h2 className="wh-section-title">Your Learning Path</h2>
        <div className="wh-stage-grid">
          {STAGES.map((stage, idx) => {
            const st       = stageStats[stage.id]
            const unlocked = isStageUnlocked(idx, stageStats)
            const pct      = st.total ? Math.round((st.solved / st.total) * 100) : 0
            const done     = st.solved === st.total && st.total > 0

            return (
              <div
                key={stage.id}
                className={`wh-stage-card ${!unlocked ? 'wh-stage-locked' : ''} ${done ? 'wh-stage-done' : ''}`}
              >
                <div className="wh-stage-ring">
                  <DonutRing solved={st.solved} total={st.total} size={48} color={stage.color} />
                  {!unlocked && <span className="wh-stage-lock">🔒</span>}
                  {done && <span className="wh-stage-check">✓</span>}
                </div>
                <span className="wh-stage-name">{stage.emoji} {stage.label}</span>
                <span className="wh-stage-desc">{stage.description}</span>
                <span className="wh-stage-pct" style={{ color: unlocked ? stage.color : undefined }}>
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
