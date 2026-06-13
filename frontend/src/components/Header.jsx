import { useAuth } from '../contexts/AuthContext'
import { useProgress } from '../contexts/ProgressContext'

const DAILY_GOAL = 3

const NAV_TABS = [
  { id: 'practice',   label: 'Practice',   icon: '⌨' },
  { id: 'concepts',   label: 'Concepts',   icon: '📚' },
  { id: 'simulator',  label: 'Simulator',  icon: '🎯' },
  { id: 'analyzer',   label: 'Analyzer',   icon: '⚡' },
  { id: 'schema',     label: 'Schema',     icon: '🗄' },
]

export default function Header({ theme, onToggleTheme, currentPage, onChangePage, onOpenSidebar }) {
  const { user, signOut }  = useAuth()
  const { solvedCount, streak, todaySolved, readinessScore } = useProgress()
  const totalQuestions = (window.QUESTIONS || []).filter(q => q.type !== 'debug').length

  return (
    <header className="header">
      <div className="header-inner">

        {/* Hamburger — mobile only */}
        <button className="hamburger-btn" onClick={onOpenSidebar} aria-label="Open menu">
          ☰
        </button>

        <div className="header-left">
          <span className="logo">
            <span className="logo-icon">🧪</span>
            <span className="logo-text">Query<strong>Lab</strong></span>
          </span>
        </div>

        <nav className="header-nav">
          {NAV_TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab${currentPage === tab.id ? ' nav-tab-active' : ''}`}
              onClick={() => onChangePage(tab.id)}
            >
              <span className="nav-tab-icon">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-right">
          {streak > 0 && (
            <span className="streak-badge" title={`${streak}-day streak`}>🔥 {streak}</span>
          )}

          <span className="header-progress" title={`${todaySolved}/${DAILY_GOAL} daily goal`}>
            <span className="progress-solved">{todaySolved}</span>
            <span className="progress-sep">/</span>
            <span className="progress-total">{DAILY_GOAL}</span>
            <span className="progress-label">today</span>
          </span>

          <span className="header-readiness" title="Readiness score: mastered questions count double">
            <span className="readiness-label">Ready</span>
            <span className="readiness-value">{readinessScore}%</span>
          </span>

          <button
            className="icon-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          <div className="user-menu">
            <span className="user-avatar">{user.email[0].toUpperCase()}</span>
            <span className="user-email">{user.email}</span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign out</button>
          </div>
        </div>

      </div>
    </header>
  )
}
