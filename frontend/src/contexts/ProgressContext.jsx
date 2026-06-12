import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ProgressContext = createContext(null)
const LOCAL_KEY = 'sqlforge_progress_v3'

function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') } catch { return {} }
}
function writeLocal(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
}

export function ProgressProvider({ children }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState({})

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
    setProgress((prev) => {
      const next = { ...prev, [questionId]: { ...(prev[questionId] || {}), ...patch } }
      writeLocal(next)
      return next
    })

    if (!user || !supabase) return

    await supabase.from('user_progress').upsert(
      {
        user_id: user.id,
        question_id: questionId,
        status: patch.status,
        solution: patch.solution ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,question_id' }
    )
  }, [user])

  const solvedCount = Object.values(progress).filter((p) => p.status === 'solved').length
  const attemptedCount = Object.values(progress).filter((p) => p.status === 'attempted').length

  return (
    <ProgressContext.Provider value={{ progress, updateProgress, loadProgress, solvedCount, attemptedCount }}>
      {children}
    </ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)
