import { useProgress } from '../contexts/ProgressContext'

export default function Welcome({ questions, onSelect }) {
  const { solvedCount, attemptedCount } = useProgress()
  const total = questions.length
  const easy   = questions.filter((q) => q.difficulty === 'Easy').length
  const medium = questions.filter((q) => q.difficulty === 'Medium').length
  const hard   = questions.filter((q) => q.difficulty === 'Hard').length

  return (
    <div className="welcome">
      <div className="welcome-hero">
        <h1 className="welcome-title">Master SQL Interviews</h1>
        <p className="welcome-sub">
          60 curated questions · Real SQLite engine · Expert explanations
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => questions.length && onSelect(questions[0])}
        >
          Start Practicing →
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-num">{total}</div>
          <div className="stat-name">Total</div>
        </div>
        <div className="stat-card stat-easy">
          <div className="stat-num">{easy}</div>
          <div className="stat-name">Easy</div>
        </div>
        <div className="stat-card stat-medium">
          <div className="stat-num">{medium}</div>
          <div className="stat-name">Medium</div>
        </div>
        <div className="stat-card stat-hard">
          <div className="stat-num">{hard}</div>
          <div className="stat-name">Hard</div>
        </div>
      </div>

      {(solvedCount > 0 || attemptedCount > 0) && (
        <div className="welcome-progress">
          <h2>Your Progress</h2>
          <div className="welcome-progress-bar">
            <div
              className="wp-solved"
              style={{ width: `${(solvedCount / total) * 100}%` }}
              title={`${solvedCount} solved`}
            />
            <div
              className="wp-attempted"
              style={{ width: `${(attemptedCount / total) * 100}%` }}
              title={`${attemptedCount} attempted`}
            />
          </div>
          <p className="wp-label">
            {solvedCount} solved · {attemptedCount} attempted · {total - solvedCount - attemptedCount} remaining
          </p>
        </div>
      )}

      <div className="welcome-grid">
        <section className="welcome-section">
          <h2>How It Works</h2>
          <ol className="steps">
            <li><strong>Pick a question</strong> from the sidebar</li>
            <li><strong>Write SQL</strong> against a real in-browser SQLite database (<kbd>Ctrl+Enter</kbd> to run)</li>
            <li><strong>Submit</strong> for instant validation with diagnostic feedback</li>
            <li><strong>Unlock hints</strong> and full solutions with explanations</li>
            <li><strong>Track progress</strong> — sign in to sync across devices</li>
          </ol>
        </section>

        <section className="welcome-section">
          <h2>Learning Path</h2>
          <div className="path-cards">
            <div className="path-card">
              <span className="path-num path-easy">1</span>
              <div>
                <h3>Easy</h3>
                <p>Filters, JOINs, aggregates, GROUP BY</p>
              </div>
            </div>
            <div className="path-card">
              <span className="path-num path-medium">2</span>
              <div>
                <h3>Medium</h3>
                <p>Window functions, subqueries, CTEs</p>
              </div>
            </div>
            <div className="path-card">
              <span className="path-num path-hard">3</span>
              <div>
                <h3>Hard</h3>
                <p>Gaps &amp; islands, sessionization, retention</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
