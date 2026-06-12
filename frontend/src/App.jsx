import { useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ProgressProvider } from './contexts/ProgressContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import Workspace from './components/Workspace'
import AuthModal from './components/AuthModal'

const allQuestions = window.QUESTIONS || []

export default function App() {
  const [selected, setSelected]   = useState(null)
  const [authOpen, setAuthOpen]   = useState(false)
  const [authMode, setAuthMode]   = useState('login')
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

  function openAuth(mode) {
    setAuthMode(mode)
    setAuthOpen(true)
  }

  return (
    <AuthProvider>
      <ProgressProvider>
        <div className="app" data-theme={theme}>
          <Header theme={theme} onToggleTheme={toggleTheme} onOpenAuth={openAuth} />

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

          {authOpen && (
            <AuthModal
              mode={authMode}
              onClose={() => setAuthOpen(false)}
              onSwitchMode={(m) => setAuthMode(m)}
            />
          )}
        </div>
      </ProgressProvider>
    </AuthProvider>
  )
}
