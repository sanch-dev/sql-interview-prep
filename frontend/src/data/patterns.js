// 9 interview patterns for DE SQL roles.
// All 60 practice questions belong to exactly one primary pattern.
// Weights sum to 100 — readiness score = Σ(weight × mastery_pct).

export const PATTERNS = [
  {
    id: 'window_functions',
    name: 'Window Functions',
    shortName: 'Window Fns',
    icon: '▦',
    interviewFreq: 70,
    weight: 22,
    color: '#8b5cf6',
    description: 'RANK, ROW_NUMBER, LAG/LEAD, running totals, partitioned aggregations',
    whyItMatters: 'Window functions appear in ~70% of DE interviews. They separate analysts from engineers — the key is understanding when PARTITION BY is correct vs GROUP BY, and which ranking function to choose.',
    interviewerLooksFor: [
      'Choosing RANK vs DENSE_RANK vs ROW_NUMBER with clear reasoning',
      'PARTITION BY to reset the window per group (not GROUP BY which collapses rows)',
      'ROWS BETWEEN for explicit rolling windows',
      'LAG/LEAD for period-over-period metrics without a self-join',
    ],
    questionIds: ['m01','m03','m06','m16','m18','h02','h03','h08','h09','h14','ip02','ip04','ip05'],
  },
  {
    id: 'joins',
    name: 'Joins & Anti-Joins',
    shortName: 'Joins',
    icon: '⋈',
    interviewFreq: 68,
    weight: 18,
    color: '#3b82f6',
    description: 'INNER JOIN, LEFT JOIN, self-join, anti-join, multi-table lookups',
    whyItMatters: 'Joins are the foundation of all SQL at scale. Interviewers test whether you know when LEFT vs INNER changes the result, understand the fan-out problem, and know the NULL-safe anti-join pattern.',
    interviewerLooksFor: [
      'LEFT JOIN + IS NULL for anti-joins instead of NOT IN (NULL trap)',
      'Self-join for co-occurrence and hierarchical relationships',
      'Fan-out awareness when joining through many-to-many tables',
      'Correct join direction — which table is the source of truth',
    ],
    questionIds: ['e03','e07','e09','e11','m04','m08','m10','h11','sqlz03','sqlz04','ext02'],
  },
  {
    id: 'aggregation',
    name: 'Core Aggregation',
    shortName: 'Aggregation',
    icon: '∑',
    interviewFreq: 65,
    weight: 16,
    color: '#16a34a',
    description: 'GROUP BY, HAVING, conditional aggregation, CASE expressions, pivoting',
    whyItMatters: 'The first pattern tested in every SQL interview. Strong candidates write aggregations with clean WHERE → GROUP BY → HAVING logic, know COUNT(*) vs COUNT(col) with NULLs, and use AVG(CASE WHEN …) for conditional rates.',
    interviewerLooksFor: [
      'HAVING for group-level filters (not WHERE on aggregated values)',
      'COUNT(*) vs COUNT(col) distinction — NULLs are skipped by COUNT(col)',
      'AVG(CASE WHEN cond THEN 1 ELSE 0 END) for conditional rates without division errors',
      'Relational division: HAVING COUNT(DISTINCT x) = (SELECT COUNT(DISTINCT x))',
    ],
    questionIds: ['e01','e05','e06','e08','e10','e15','m07','m12','m14','m15','m17','sqlz02','sqlz05'],
  },
  {
    id: 'deduplication',
    name: 'Deduplication',
    shortName: 'Dedup',
    icon: '⊟',
    interviewFreq: 55,
    weight: 12,
    color: '#f59e0b',
    description: 'Latest record per entity, ROW_NUMBER = 1, SCD Type 2, remove duplicates',
    whyItMatters: 'Real pipelines produce duplicate events constantly. Deduplication appears in every DE take-home. ROW_NUMBER() OVER (PARTITION BY entity ORDER BY timestamp DESC) = 1 is one of the most-used patterns in production DE code.',
    interviewerLooksFor: [
      'ROW_NUMBER = 1 inside a CTE for latest-per-entity (not MAX in a subquery)',
      'PARTITION BY the entity key, ORDER BY the recency key DESC',
      'Awareness that GROUP BY + MAX returns the value but not the full row',
      'Handling ties — when two rows share the same max timestamp',
    ],
    questionIds: ['e04','m05','m09','h06','h07','ext01'],
  },
  {
    id: 'date_logic',
    name: 'Date & Time Logic',
    shortName: 'Date Logic',
    icon: '📅',
    interviewFreq: 50,
    weight: 11,
    color: '#06b6d4',
    description: 'Date arithmetic, period grouping, DATEADD/DATEDIFF, time-series truncation',
    whyItMatters: 'Almost every analytical query involves a time dimension. DE interviewers expect fluency with date truncation for grouping, date arithmetic for gap detection, and avoiding off-by-one errors that break production reports.',
    interviewerLooksFor: [
      'FORMAT/DATETRUNC for time-series grouping — never group on a raw datetime column',
      'DATEDIFF with awareness of what "day boundary" means vs calendar day',
      'Date spine joins when gaps in source data would break LAG comparisons',
      'DATEPART for extracting components: weekday, month, quarter, hour',
    ],
    questionIds: ['e16','m02','m11'],
  },
  {
    id: 'gaps_islands',
    name: 'Gaps & Islands',
    shortName: 'Gaps & Islands',
    icon: '⋯',
    interviewFreq: 40,
    weight: 10,
    color: '#ec4899',
    description: 'Consecutive sequences, streak detection, interval merging, sessionization',
    whyItMatters: 'The hardest pattern in DE interviews. Gaps and islands strongly differentiate candidates — the ROW_NUMBER anchor trick is non-obvious and rarely seen by those who only use common practice sites. Appears at senior+ levels.',
    interviewerLooksFor: [
      'Deduplication before ROW_NUMBER — duplicate dates break the anchor',
      'date - ROW_NUMBER() = constant as the group anchor for consecutive date runs',
      'Current streak vs longest historical streak (different queries)',
      'Interval merging with a running MAX of end times for overlapping ranges',
    ],
    questionIds: ['h01','h04','h10','h12','ip03'],
  },
  {
    id: 'retention',
    name: 'Retention & Cohorts',
    shortName: 'Retention',
    icon: '↩',
    interviewFreq: 38,
    weight: 7,
    color: '#f97316',
    description: 'D1/D7/D30 retention, cohort tables, MoM growth, funnel completion',
    whyItMatters: 'Growth and product analytics roles require retention fluency. The D-N retention LEFT JOIN pattern and cohort table construction appear frequently at data-centric companies, especially for senior+ roles.',
    interviewerLooksFor: [
      'LEFT JOIN (not INNER) for retention — users who did not return must appear as 0%',
      'Cohort = first event date; activity = any later event',
      'DATEDIFF(month, cohort_date, activity_date) for months-since-cohort column',
      'NULLIF in the denominator for MoM growth rate to avoid division by zero',
    ],
    questionIds: ['h05','h13','ip01'],
  },
  {
    id: 'filtering',
    name: 'Filtering & NULL',
    shortName: 'Filtering',
    icon: '≡',
    interviewFreq: 35,
    weight: 3,
    color: '#94a3b8',
    description: 'WHERE conditions, IN/EXISTS, subqueries, set operations, NULL traps',
    whyItMatters: 'Filtering fundamentals are tested in every interview as a baseline. Interviewers specifically test NULL awareness (= NULL vs IS NULL), the NOT IN null trap, and when to prefer EXISTS over IN.',
    interviewerLooksFor: [
      'IS NULL / IS NOT NULL — never = NULL (always evaluates to UNKNOWN)',
      'NOT IN vs LEFT JOIN + IS NULL vs NOT EXISTS — NULL safety determines correctness',
      'UNION vs UNION ALL — deduplication cost is real; prefer UNION ALL when safe',
      'EXISTS short-circuits on first match; more efficient than IN on large subqueries',
    ],
    questionIds: ['e02','e13','m13','sqlz01'],
  },
  {
    id: 'data_quality',
    name: 'Data Quality',
    shortName: 'Data Quality',
    icon: '✓',
    interviewFreq: 30,
    weight: 1,
    color: '#64748b',
    description: 'NULL handling, anomaly detection, referential integrity, stale record checks',
    whyItMatters: 'DE roles require writing queries that verify data integrity and find pipeline failures. This pattern tests systematic thinking about what "correct" data looks like before transforming it.',
    interviewerLooksFor: [
      'Expressing expected invariants as SQL assertions (count mismatches, orphan keys)',
      'COALESCE for NULL replacement vs NULLIF for zero-division safety',
      'Pattern matching (LIKE, string functions) to find malformed records',
      'Window functions to detect sequences that should never repeat',
    ],
    questionIds: ['e12','e14'],
  },
]

// ── Mastery level system ─────────────────────────────────────────────────────

export const MASTERY_LEVELS = ['locked', 'learning', 'practicing', 'proficient', 'interview_ready']

export const MASTERY_PCT = {
  locked:          0,
  learning:       25,
  practicing:     50,
  proficient:     75,
  interview_ready: 100,
}

export const LEVEL_CONFIG = {
  locked:          { label: 'Not started',    color: '#94a3b8', icon: '○'  },
  learning:        { label: 'Learning',        color: '#f59e0b', icon: '◔' },
  practicing:      { label: 'Practicing',      color: '#3b82f6', icon: '◑' },
  proficient:      { label: 'Proficient',      color: '#8b5cf6', icon: '◕' },
  interview_ready: { label: 'Interview Ready', color: '#16a34a', icon: '●' },
}

// ── Core computation ─────────────────────────────────────────────────────────

export function computePatternMastery(pattern, allQuestions, progress, mastery) {
  const qs      = allQuestions.filter(q => pattern.questionIds.includes(q.id))
  const hardQs  = qs.filter(q => q.difficulty === 'Hard')
  const hasHard = hardQs.length > 0
  const total   = qs.length

  const solvedCount       = qs.filter(q => progress[q.id]?.status === 'solved').length
  const masteredCount     = qs.filter(q => mastery[q.id]?.mastered === true).length
  const hardMasteredCount = hardQs.filter(q => mastery[q.id]?.mastered === true).length

  // Adaptive thresholds — scale down for small patterns
  const readyThreshold     = Math.min(3, Math.max(1, Math.ceil(total * 0.6)))
  const proficientThreshold = Math.min(2, Math.max(1, Math.ceil(total * 0.4)))

  let level
  if (solvedCount === 0) {
    level = 'locked'
  } else if (masteredCount === 0) {
    level = 'learning'
  } else if (masteredCount < proficientThreshold) {
    level = 'practicing'
  } else if (masteredCount < readyThreshold || (hasHard && hardMasteredCount === 0 && total > 2)) {
    level = 'proficient'
  } else {
    level = 'interview_ready'
  }

  const masteryPct = MASTERY_PCT[level]
  const score      = (masteryPct / 100) * pattern.weight

  // Score gain if user completes next level
  const nextLevelIdx = MASTERY_LEVELS.indexOf(level) + 1
  const nextLevel    = nextLevelIdx < MASTERY_LEVELS.length ? MASTERY_LEVELS[nextLevelIdx] : null
  const nextPct      = nextLevel ? MASTERY_PCT[nextLevel] : masteryPct
  const scoreGain    = Math.round(((nextPct - masteryPct) / 100) * pattern.weight * 10) / 10

  let nextAction = null
  if (nextLevel === 'learning') {
    nextAction = `Solve your first ${pattern.shortName} question`
  } else if (nextLevel === 'practicing') {
    nextAction = 'Get 1 clean solve — first try, no hints'
  } else if (nextLevel === 'proficient') {
    const need = proficientThreshold - masteredCount
    nextAction = `${need} more clean solve${need > 1 ? 's' : ''} needed`
  } else if (nextLevel === 'interview_ready') {
    if (hasHard && hardMasteredCount === 0 && total > 2) {
      nextAction = 'Clean-solve a Hard question in this pattern'
    } else {
      const need = readyThreshold - masteredCount
      nextAction = `${need} more clean solve${need > 1 ? 's' : ''} needed`
    }
  }

  return {
    level, masteryPct, score,
    solvedCount, masteredCount, hardMasteredCount, totalCount: total,
    nextLevel, nextAction, scoreGain,
    patternQs: qs,
  }
}

export function computeAllPatternMastery(allQuestions, progress, mastery) {
  const result = {}
  for (const pattern of PATTERNS) {
    result[pattern.id] = computePatternMastery(pattern, allQuestions, progress, mastery)
  }
  return result
}

// Weighted readiness score 0-100
export function computeReadinessScore(patternMasteries) {
  const total = Object.values(patternMasteries).reduce((s, pm) => s + pm.score, 0)
  return Math.round(Math.min(100, Math.max(0, total)))
}

// Returns the PATTERNS entry whose questionIds contains the given questionId
export function getPatternForQuestion(questionId) {
  return PATTERNS.find(p => p.questionIds.includes(questionId)) || null
}
