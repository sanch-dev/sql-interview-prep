import { useMemo } from 'react'
import { useProgress } from '../contexts/ProgressContext'
import { PATTERNS, computeAllPatternMastery, LEVEL_CONFIG } from '../data/patterns'
import { getCoachRecommendation } from '../lib/coach'
import RoadmapPanel from './RoadmapPanel'

function ScoreRing({ score }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#f59e0b' : '#3b82f6'
  const label = score >= 70 ? 'Interview Ready' : score >= 40 ? 'Building Skills' : 'Getting Started'
  const circumference = 2 * Math.PI * 28
  const dash = (score / 100) * circumference

  return (
    <div className="coach-score-ring">
      <svg viewBox="0 0 72 72" width="88" height="88">
        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="36" cy="36" r="28"
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="coach-score-inner">
        <span className="coach-score-num" style={{ color }}>{score}</span>
        <span className="coach-score-label">/ 100</span>
      </div>
      <div className="coach-score-status" style={{ color }}>{label}</div>
    </div>
  )
}

function PatternBar({ pattern, pm, onStart }) {
  const lc = LEVEL_CONFIG[pm.level]
  return (
    <div className="coach-pm-row">
      <span className="coach-pm-icon" style={{ color: pattern.color }}>{pattern.icon}</span>
      <div className="coach-pm-info">
        <div className="coach-pm-name-row">
          <span className="coach-pm-name">{pattern.name}</span>
          <span className="coach-pm-freq">{pattern.interviewFreq}% of interviews</span>
        </div>
        <div className="coach-pm-bar-wrap">
          <div className="coach-pm-bar">
            <div
              className="coach-pm-bar-fill"
              style={{ width: `${pm.masteryPct}%`, background: pattern.color }}
            />
          </div>
          <span className="coach-pm-level" style={{ color: lc.color }}>
            {lc.icon} {lc.label}
          </span>
        </div>
      </div>
      <span className="coach-pm-count">{pm.masteredCount}/{pm.totalCount}</span>
      <button
        className="btn btn-ghost btn-xs coach-pm-cta"
        onClick={() => {
          const next =
            pm.patternQs.find(q => !pm._progress?.[q.id] || pm._progress[q.id].status === 'todo') ||
            pm.patternQs.find(q => pm._progress?.[q.id]?.status === 'attempted') ||
            pm.patternQs[0]
          if (next) onStart(next)
        }}
        disabled={pm.level === 'interview_ready'}
      >
        {pm.level === 'locked' ? 'Start →' :
         pm.level === 'interview_ready' ? '✓ Done' :
         'Continue →'}
      </button>
    </div>
  )
}

export default function Welcome({ questions, onSelect }) {
  const { progress, mastery, masteredCount, topWeakSpots, solvedCount, streak, todaySolved, readinessScore } = useProgress()

  const patternMasteries = useMemo(
    () => computeAllPatternMastery(questions, progress, mastery),
    [questions, progress, mastery]
  )

  const rec = useMemo(
    () => getCoachRecommendation(patternMasteries, questions, progress, mastery),
    [patternMasteries, questions, progress, mastery]
  )

  // Patterns sorted by: score gain (desc) so highest-impact shows first
  const sortedPatterns = useMemo(
    () => [...PATTERNS].sort((a, b) => {
      const pa = patternMasteries[a.id]
      const pb = patternMasteries[b.id]
      // Interview-ready patterns sink to bottom
      if (pa.level === 'interview_ready' && pb.level !== 'interview_ready') return 1
      if (pb.level === 'interview_ready' && pa.level !== 'interview_ready') return -1
      return (pb.interviewFreq * b.weight) - (pa.interviewFreq * a.weight)
    }),
    [patternMasteries]
  )

  // Attach progress so PatternBar can find next question
  const pmWithProgress = useMemo(() => {
    const out = {}
    for (const [id, pm] of Object.entries(patternMasteries)) {
      out[id] = { ...pm, _progress: progress }
    }
    return out
  }, [patternMasteries, progress])

  const scoreColor = readinessScore >= 70 ? '#16a34a' : readinessScore >= 40 ? '#f59e0b' : '#3b82f6'

  return (
    <div className="coach-dashboard">

      {/* ── Top row: score + coach recommendation ─────────────── */}
      <div className="coach-top-grid">

        {/* Score card */}
        <div className="coach-score-card">
          <div className="coach-score-card-inner">
            <ScoreRing score={readinessScore} />
            <div className="coach-score-detail">
              <div className="coach-score-title">Readiness Score</div>
              <div className="coach-score-breakdown">
                {PATTERNS.slice(0, 5).map(p => {
                  const pm = patternMasteries[p.id]
                  return (
                    <div key={p.id} className="coach-score-row">
                      <span className="coach-score-row-name">{p.shortName}</span>
                      <div className="coach-score-mini-bar">
                        <div
                          className="coach-score-mini-fill"
                          style={{ width: `${pm.masteryPct}%`, background: p.color }}
                        />
                      </div>
                      <span className="coach-score-row-pts" style={{ color: p.color }}>
                        +{Math.round(pm.score)}/{p.weight}
                      </span>
                    </div>
                  )
                })}
                <div className="coach-score-row coach-score-row-more">
                  <span className="coach-score-row-name coach-score-muted">4 more patterns…</span>
                </div>
              </div>
            </div>
          </div>
          <div className="coach-score-stats">
            {streak > 0 && <span className="coach-stat">🔥 {streak} day streak</span>}
            <span className="coach-stat">{todaySolved} solved today</span>
            <span className="coach-stat">⭐ {masteredCount} mastered</span>
          </div>
        </div>

        {/* Coach recommendation card */}
        {rec ? (
          <div className="coach-rec-card">
            <div className="coach-rec-eyebrow">
              <span className="coach-rec-dot" style={{ background: rec.pattern.color }} />
              Your coach says
            </div>
            <div className="coach-rec-pattern">
              <span style={{ color: rec.pattern.color }}>{rec.pattern.icon}</span>
              {rec.pattern.name}
              <span className="coach-rec-freq-tag">{rec.pattern.interviewFreq}% of DE interviews</span>
            </div>
            <p className="coach-rec-reason">{rec.reason}</p>
            <div className="coach-rec-gain">
              +{rec.scoreGain} readiness points
            </div>
            <button
              className="btn btn-primary coach-rec-btn"
              onClick={() => onSelect(rec.question)}
            >
              <div className="coach-rec-btn-inner">
                <span className="coach-rec-q-title">{rec.question.title}</span>
                <span className={`badge badge-${rec.question.difficulty.toLowerCase()}`}>
                  {rec.question.difficulty}
                </span>
              </div>
              <span className="coach-rec-arrow">→</span>
            </button>
          </div>
        ) : (
          <div className="coach-rec-card coach-rec-done">
            <div className="coach-rec-eyebrow">All patterns mastered!</div>
            <p className="coach-rec-reason">
              You've reached Interview-Ready on every pattern. Run the Simulator to confirm
              your readiness under real interview conditions.
            </p>
          </div>
        )}
      </div>

      {/* ── Pattern mastery grid ───────────────────────────────── */}
      <section className="coach-pm-section">
        <div className="coach-section-header">
          <h2 className="coach-section-title">Interview Pattern Mastery</h2>
          <span className="coach-section-sub">Sorted by impact on your readiness score</span>
        </div>
        <div className="coach-pm-grid">
          {sortedPatterns.map(pattern => (
            <PatternBar
              key={pattern.id}
              pattern={pattern}
              pm={pmWithProgress[pattern.id]}
              onStart={onSelect}
            />
          ))}
        </div>
      </section>

      {/* ── Roadmap — show for users still building skills ──── */}
      {readinessScore < 60 && (
        <RoadmapPanel
          questions={questions}
          readinessScore={readinessScore}
          patternMasteries={patternMasteries}
        />
      )}

      {/* ── Weak spots ────────────────────────────────────────── */}
      {topWeakSpots.length > 0 && (
        <section className="coach-weak-section">
          <h2 className="coach-section-title">Focus Areas</h2>
          <p className="coach-weak-sub">
            Categories where you've had the most wrong attempts — worth reviewing.
          </p>
          <div className="coach-weak-list">
            {topWeakSpots.map(({ category, count }) => (
              <div key={category} className="coach-weak-item">
                <span className="coach-weak-icon">⚠</span>
                <span className="coach-weak-cat">{category}</span>
                <span className="coach-weak-count">{count} wrong attempt{count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
