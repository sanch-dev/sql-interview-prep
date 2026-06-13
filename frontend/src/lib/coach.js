import { PATTERNS, MASTERY_LEVELS, MASTERY_PCT } from '../data/patterns'

// Returns the highest-impact recommendation for the user's next question.
// Output: { pattern, question, scoreGain, reason, nextAction, pm } or null if all mastered.
export function getCoachRecommendation(patternMasteries, allQuestions, progress, mastery) {
  const candidates = []

  for (const pattern of PATTERNS) {
    const pm = patternMasteries[pattern.id]
    if (!pm || !pm.nextLevel) continue  // already interview_ready, skip

    const scoreGain = pm.scoreGain
    if (scoreGain <= 0) continue

    // Best question to try: prefer unattempted, then attempted-not-solved, then solved-not-mastered
    const qs = pm.patternQs
    const bestQuestion =
      qs.find(q => !progress[q.id] || progress[q.id].status === 'todo') ||
      qs.find(q => progress[q.id]?.status === 'attempted') ||
      qs.find(q => progress[q.id]?.status === 'solved' && !mastery[q.id]?.mastered) ||
      null

    if (!bestQuestion) continue

    // Priority drives sort: score gain × interview importance
    const priority = scoreGain * (pattern.interviewFreq / 10)

    let reason = ''
    switch (pm.level) {
      case 'locked':
        reason = `${pattern.name} appears in ${pattern.interviewFreq}% of DE interviews — you haven't started it yet.`
        break
      case 'learning':
        reason = `You've solved ${pm.solvedCount} ${pattern.shortName} question${pm.solvedCount !== 1 ? 's' : ''} but haven't mastered any cleanly. Get your first clean solve (first try, no hints) to unlock +${scoreGain} pts.`
        break
      case 'practicing':
        reason = `One more clean ${pattern.shortName} solve moves you to Proficient and adds +${scoreGain} readiness points.`
        break
      case 'proficient':
        if (pm.hardMasteredCount === 0 && pm.patternQs.some(q => q.difficulty === 'Hard')) {
          reason = `You're proficient at ${pattern.shortName}. Solving a Hard question cleanly makes you Interview-Ready (+${scoreGain} pts).`
        } else {
          reason = `${pm.nextAction} to reach Interview-Ready on ${pattern.shortName} (+${scoreGain} pts).`
        }
        break
    }

    candidates.push({ pattern, question: bestQuestion, pm, scoreGain, priority, reason })
  }

  if (!candidates.length) return null

  candidates.sort((a, b) => b.priority - a.priority)
  return candidates[0]
}
