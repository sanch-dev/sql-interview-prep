import { useAuth } from '../contexts/AuthContext'
import { useProgress } from '../contexts/ProgressContext'

export default function Header({ theme, onToggleTheme }) {
  const { user, signOut } = useAuth()
  const { solvedCount } = useProgress()
  const totalQuestions = (window.QUESTIONS || []).length

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-left">
          <span className="logo">
            <span className="logo-icon">🧪</span>
            <span className="logo-text">Query<strong>Lab</strong></span>
          </span>
        </div>

        <div className="header-right">
          {user && (
            <span className="header-progress">
              <span className="progress-solved">{solvedCount}</span>
              <span className="progress-sep">/</span>
              <span className="progress-total">{totalQuestions}</span>
              <span className="progress-label">solved</span>
            </span>
          )}

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
            <button className="btn btn-ghost btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
