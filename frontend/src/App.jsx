import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProgressProvider } from './contexts/ProgressContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import Workspace from './components/Workspace'
import AuthPage from './components/AuthPage'

const allQuestions = window.QUESTIONS || []

function AppContent() {
  const { user, loading } = useAuth()
  const [selected, setSelected] = useState(null)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('sqlforge_theme') || 'light'
    document.documentElement.setAttribute('data-theme', saved)
    return saved
  })

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    localStorage.setItem('sqlforge_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-spinner" />
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <div className="app" data-theme={theme}>
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <div className="layout">
        <Sidebar
          questions={allQuestions}
          selectedId={selected?.id}
          onSelect={setSelected}
        />

        <main className="main">
          {selected ? (
            <Workspace
              key={selected.id}
              question={selected}
              allQuestions={allQuestions}
              onSelect={setSelected}
              onBack={() => setSelected(null)}
              theme={theme}
            />
          ) : (
            <Welcome questions={allQuestions} onSelect={setSelected} />
          )}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </AuthProvider>
  )
}
