import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProgressProvider } from './contexts/ProgressContext'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import Welcome from './components/Welcome'
import Workspace from './components/Workspace'
import AuthPage from './components/AuthPage'
import ConceptsPage from './pages/ConceptsPage'
import DebugPage from './pages/DebugPage'
import AnalyzerPage from './pages/AnalyzerPage'
import SchemaDesignPage from './pages/SchemaDesignPage'
import SimulatorPage from './pages/SimulatorPage'

const allQuestions   = (window.QUESTIONS || []).filter(q => q.type !== 'debug')
const debugQuestions = (window.QUESTIONS || []).filter(q => q.type === 'debug')

function AppContent() {
  const { user, loading } = useAuth()
  const [selected,     setSelected]     = useState(null)
  const [currentPage,  setCurrentPage]  = useState('practice')
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
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

  if (!user) return <AuthPage />

  return (
    <div className="app" data-theme={theme}>
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        currentPage={currentPage}
        onChangePage={(page) => { setCurrentPage(page); setSelected(null) }}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      {currentPage === 'practice' && (
        <div className="layout">
          <Sidebar
            questions={allQuestions}
            selectedId={selected?.id}
            onSelect={setSelected}
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
            onGoSimulator={() => { setCurrentPage('simulator'); setSelected(null) }}
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
      )}

      {currentPage === 'concepts'   && <ConceptsPage theme={theme} />}
      {currentPage === 'debug'      && <DebugPage questions={debugQuestions} theme={theme} />}
      {currentPage === 'simulator'  && <SimulatorPage questions={allQuestions} theme={theme} />}
      {currentPage === 'analyzer'   && <AnalyzerPage theme={theme} />}
      {currentPage === 'schema'     && <SchemaDesignPage theme={theme} />}
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
