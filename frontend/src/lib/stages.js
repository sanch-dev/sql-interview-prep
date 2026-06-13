export const STAGES = [
  {
    id: 'foundations',
    label: 'SQL Foundations',
    emoji: '🌱',
    color: '#16a34a',
    description: 'Core query techniques',
    categories: ['Filtering', 'Aggregation', 'NULL Handling'],
  },
  {
    id: 'relationships',
    label: 'Data Relationships',
    emoji: '🔗',
    color: '#3b82f6',
    description: 'Multi-table queries',
    categories: ['Joins', 'Subqueries', 'Set Operations'],
  },
  {
    id: 'advanced',
    label: 'Advanced Techniques',
    emoji: '⚡',
    color: '#8b5cf6',
    description: 'Power user patterns',
    categories: ['CTEs', 'Window Functions', 'Ranking', 'String Functions', 'Date Functions'],
  },
  {
    id: 'mastery',
    label: 'Professional SQL',
    emoji: '🏆',
    color: '#f59e0b',
    description: 'Expert-level skills',
    categories: ['Data Analysis', 'Performance', 'Schema Design'],
  },
]

export function getMastery(solved, total) {
  if (!total || solved === 0) return { icon: '○', cls: 'mastery-none',      label: 'Not started' }
  const pct = solved / total
  if (pct < 0.4)            return { icon: '◔', cls: 'mastery-learning',   label: 'Learning'    }
  if (pct < 0.8)            return { icon: '◑', cls: 'mastery-practicing', label: 'Practicing'  }
  if (pct < 1.0)            return { icon: '◕', cls: 'mastery-proficient', label: 'Proficient'  }
  return                           { icon: '●', cls: 'mastery-mastered',   label: 'Mastered'    }
}

export function getNextUp(questions, progress) {
  for (const stage of STAGES) {
    for (const cat of stage.categories) {
      const catQs = questions.filter(q => q.category === cat)
      const unsolved = catQs.find(q => (progress[q.id]?.status || 'todo') !== 'solved')
      if (unsolved) return { question: unsolved, stage, category: cat }
    }
  }
  return null
}

export function getStageStats(questions, progress) {
  const map = {}
  STAGES.forEach(stage => {
    const stageQs = questions.filter(q => stage.categories.includes(q.category))
    const solved  = stageQs.filter(q => progress[q.id]?.status === 'solved').length
    map[stage.id] = { total: stageQs.length, solved }
  })
  return map
}

