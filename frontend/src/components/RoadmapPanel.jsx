import { useMemo } from 'react'
import { computeAllPatternMastery, MASTERY_PCT } from '../data/patterns'
import { useProgress } from '../contexts/ProgressContext'

const PHASES = [
  {
    num: 1,
    title: 'Core SQL Foundations',
    time: '2–3 hours',
    color: '#16a34a',
    description: 'Build the instinct for GROUP BY + HAVING before anything else.',
    milestone: 'Solve 6 Aggregation questions cleanly',
    patternIds: ['aggregation', 'filtering'],
    targetPct: 40,
  },
  {
    num: 2,
    title: 'Mastering Joins',
    time: '2–3 hours',
    color: '#3b82f6',
    description: 'Anti-joins, self-joins, and knowing when INNER vs LEFT changes your answer.',
    milestone: 'Solve every JOIN question, including LEFT JOIN + IS NULL',
    patternIds: ['joins'],
    targetPct: 60,
  },
  {
    num: 3,
    title: 'Window Functions',
    time: '4–6 hours',
    color: '#8b5cf6',
    description: 'The highest-leverage DE skill. PARTITION BY ≠ GROUP BY — this is where most candidates fall short.',
    milestone: 'Clean-solve 3 Window Functions questions (no hints, first try)',
    patternIds: ['window_functions'],
    targetPct: 50,
  },
  {
    num: 4,
    title: 'Deduplication & Date Logic',
    time: '2–3 hours',
    color: '#f59e0b',
    description: 'ROW_NUMBER = 1 for latest-per-entity. Date arithmetic without off-by-one bugs.',
    milestone: 'Master the ROW_NUMBER dedup pattern and date grouping',
    patternIds: ['deduplication', 'date_logic'],
    targetPct: 50,
  },
  {
    num: 5,
    title: 'Senior-Level Patterns',
    time: '4–6 hours',
    color: '#ec4899',
    description: 'Gaps & Islands, Retention cohorts, and Sessionization — these appear at senior DE interviews.',
    milestone: 'Solve at least one Hard question in each of these patterns',
    patternIds: ['gaps_islands', 'retention', 'sessionization'],
    targetPct: 25,
  },
  {
    num: 6,
    title: 'Interview Simulation',
    time: 'Ongoing',
    color: '#f97316',
    description: 'Timed practice under real conditions. Target 75%+ on three consecutive simulator runs.',
    milestone: 'Readiness score ≥ 75 · Simulator score ≥ 75% three times',
    patternIds: [],
    targetPct: 75,
  },
]

export default function RoadmapPanel({ questions, readinessScore, patternMasteries }) {
  const currentPhase = useMemo(() => {
    for (let i = 0; i < PHASES.length - 1; i++) {
      const phase = PHASES[i]
      const pms = phase.patternIds.map(id => patternMasteries[id]).filter(Boolean)
      const avgPct = pms.length ? pms.reduce((s, pm) => s + pm.masteryPct, 0) / pms.length : 0
      if (avgPct < phase.targetPct) return i
    }
    return readinessScore >= 75 ? PHASES.length : PHASES.length - 1
  }, [patternMasteries, readinessScore])

  return (
    <section className="roadmap-panel">
      <div className="coach-section-header">
        <h2 className="coach-section-title">DE Interview Roadmap</h2>
        <span className="coach-section-sub">Your 6-phase path from beginner to interview-ready</span>
      </div>
      <div className="roadmap-track">
        {PHASES.map((phase, idx) => {
          const isDone    = idx < currentPhase
          const isCurrent = idx === currentPhase
          const isLocked  = idx > currentPhase

          return (
            <div
              key={phase.num}
              className={`roadmap-phase ${isDone ? 'rp-done' : isCurrent ? 'rp-current' : 'rp-locked'}`}
            >
              <div className="rp-connector">
                <div
                  className="rp-dot"
                  style={{ background: isDone || isCurrent ? phase.color : 'var(--border)', borderColor: phase.color }}
                >
                  {isDone ? '✓' : phase.num}
                </div>
                {idx < PHASES.length - 1 && (
                  <div className="rp-line" style={{ background: isDone ? phase.color : 'var(--border)' }} />
                )}
              </div>
              <div className="rp-content">
                <div className="rp-header">
                  <span className="rp-title" style={{ color: isLocked ? 'var(--text-3)' : 'var(--text-1)' }}>
                    {phase.title}
                  </span>
                  <span className="rp-time">{phase.time}</span>
                  {isCurrent && <span className="rp-badge" style={{ background: phase.color }}>Current</span>}
                </div>
                {!isLocked && (
                  <>
                    <p className="rp-desc">{phase.description}</p>
                    <div className="rp-milestone">
                      <span className="rp-milestone-icon" style={{ color: phase.color }}>▷</span>
                      <span>{phase.milestone}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
