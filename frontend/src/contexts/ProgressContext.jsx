import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ProgressContext = createContext(null)
const LOCAL_KEY    = 'sqlforge_progress_v3'
const REVIEWS_KEY  = 'sqlforge_review_marks'

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') } catch { return {} }
}
function writeLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
}
function readReviewMarks() {
  try { return new Set(JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]')) } catch { return new Set() }
}
function writeReviewMarks(set) {
  localStorage.setItem(REVIEWS_KEY, JSON.stringify([...set]))
}

function toDateStr(iso) {
  // Convert ISO timestamp to YYYY-MM-DD in local time
  if (!iso) return null
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr() {
  return toDateStr(new Date().toISOString())
}

export function ProgressProvider({ children }) {
  const { user } = useAuth()
  const [progress, setProgress]         = useState({})
  const [reviewMarks, setReviewMarks]   = useState(() => readReviewMarks())

  const loadProgress = useCallback(async () => {
    if (!user || !supabase) {
      setProgress(readLocal())
      return
    }
    const { data, error } = await supabase
      .from('user_progress')
      .select('question_id, status, solution, updated_at')
      .eq('user_id', user.id)

    if (error) { setProgress(readLocal()); return }

    const map = {}
    data.forEach(({ question_id, status, solution, updated_at }) => {
      map[question_id] = { status, solution, updatedAt: updated_at }
    })
    setProgress(map)
  }, [user])

  useEffect(() => { loadProgress() }, [loadProgress])

  const updateProgress = useCallback(async (questionId, patch) => {
    const now = new Date().toISOString()
    setProgress((prev) => {
      const next = {
        ...prev,
        [questionId]: { ...(prev[questionId] || {}), ...patch, updatedAt: now },
      }
      writeLocal(next)
      return next
    })

    if (!user || !supabase) return

    await supabase.from('user_progress').upsert(
      {
        user_id:    user.id,
        question_id: questionId,
        status:     patch.status,
        solution:   patch.solution ?? null,
        updated_at: now,
      },
      { onConflict: 'user_id,question_id' }
    )
  }, [user])

  const toggleReviewMark = useCallback((questionId) => {
    setReviewMarks((prev) => {
      const next = new Set(prev)
      next.has(questionId) ? next.delete(questionId) : next.add(questionId)
      writeReviewMarks(next)
      return next
    })
  }, [])

  const solvedCount    = useMemo(() => Object.values(progress).filter((p) => p.status === 'solved').length,   [progress])
  const attemptedCount = useMemo(() => Object.values(progress).filter((p) => p.status === 'attempted').length, [progress])

  const todaySolved = useMemo(() => {
    const today = todayStr()
    return Object.values(progress).filter(
      (p) => p.status === 'solved' && toDateStr(p.updatedAt) === today
    ).length
  }, [progress])

  const streak = useMemo(() => {
    const activeDays = new Set(
      Object.values(progress)
        .map((p) => toDateStr(p.updatedAt))
        .filter(Boolean)
    )

    const today = todayStr()
    const d = new Date()

    // If no activity today, check if yesterday counts (grace period so streak doesn't die at midnight)
    if (!activeDays.has(today)) {
      d.setDate(d.getDate() - 1)
      const yesterday = toDateStr(d.toISOString())
      if (!activeDays.has(yesterday)) return 0
    } else {
      // start counting from today
      d.setDate(d.getDate())
    }

    let count = 0
    const cur = new Date()
    // Walk backwards until a gap
    while (true) {
      const ds = toDateStr(cur.toISOString())
      if (!activeDays.has(ds)) break
      count++
      cur.setDate(cur.getDate() - 1)
    }
    return count
  }, [progress])

  return (
    <ProgressContext.Provider value={{ progress, updateProgress, loadProgress, solvedCount, attemptedCount, streak, todaySolved, reviewMarks, toggleReviewMark }}>
      {children}
    </ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)
