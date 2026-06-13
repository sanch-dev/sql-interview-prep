import { useState } from 'react'

const CHALLENGES = [
  {
    id: 'sd01',
    title: 'Why Does This JOIN Return Duplicates?',
    category: 'JOIN Mechanics',
    difficulty: 'Easy',
    scenario: `
You have two tables:
  customers (customer_id, name)  — 5 rows
  orders    (order_id, customer_id, amount)  — 12 rows (some customers have multiple orders)

A teammate runs:

  SELECT c.name, o.amount
  FROM customers c
  JOIN orders o ON c.customer_id = o.customer_id

They expect 5 rows but get 12. Why?`,
    options: [
      { id: 'a', label: 'The JOIN is creating duplicates due to a bug in SQLite.' },
      { id: 'b', label: 'A customer with 3 orders produces 3 rows — one per order. The result has one row per (customer, order) pair, which is correct.' },
      { id: 'c', label: 'The ORDER BY clause is missing, which causes duplication.' },
      { id: 'd', label: 'GROUP BY customer_id is needed to collapse duplicates before the JOIN.' },
    ],
    answer: 'b',
    explanation: `A JOIN is a row-level cross-product filtered by a condition. Each customer row is paired with every matching order row.
If Alice has 3 orders, she appears 3 times — once per order. This is correct behavior.

If you genuinely need 5 rows (one per customer with aggregated order info), restructure the query:

  SELECT c.name, COUNT(o.order_id) AS orders, SUM(o.amount) AS total
  FROM customers c
  LEFT JOIN orders o ON c.customer_id = o.customer_id
  GROUP BY c.customer_id, c.name

Understanding that JOINs fan out rows is fundamental to reading result sets correctly.`,
  },
  {
    id: 'sd02',
    title: 'Choose the Right Primary Key',
    category: 'Keys & Constraints',
    difficulty: 'Easy',
    scenario: `
You're designing a table to store student course enrollments at a university.
Each student can enroll in multiple courses, and each course has multiple students.

Which of the following is the best primary key design for the enrollment table?`,
    options: [
      { id: 'a', label: 'enrollment_id INTEGER (auto-increment surrogate key)' },
      { id: 'b', label: 'Composite key: (student_id, course_id) — natural key from both foreign keys' },
      { id: 'c', label: 'student_id alone — each student row is unique' },
      { id: 'd', label: 'No primary key — enrollment records are transient data' },
    ],
    answer: 'b',
    explanation: `Both options A and B are defensible, but the composite key (student_id, course_id) is the better natural choice for this scenario:

• It directly enforces the business rule: a student can only enroll in a given course once.
• It requires no extra surrogate column.
• Foreign keys to this table are clear and self-documenting.

A surrogate key (option A) is sometimes preferred when you need the enrollment record itself to be referenced by other tables (e.g., a grades table), since a composite key as a foreign key becomes verbose.

Never leave out a primary key (option D) — duplicate records corrupt data integrity and JOIN results.`,
  },
  {
    id: 'sd03',
    title: 'Normalization: Spot the Redundancy',
    category: 'Normalization',
    difficulty: 'Medium',
    scenario: `
A developer designs a single orders table:

  orders(
    order_id, customer_id, customer_name, customer_email,
    product_id, product_name, product_price,
    quantity, order_date
  )

What is the primary normalization problem with this design?`,
    options: [
      { id: 'a', label: 'Too many columns — tables should have at most 5 columns.' },
      { id: 'b', label: 'Transitive dependency: customer_name and customer_email depend on customer_id (not order_id). Same for product facts.' },
      { id: 'c', label: 'order_date should be stored in a separate dates table.' },
      { id: 'd', label: 'quantity should be in a separate line_items table.' },
    ],
    answer: 'b',
    explanation: `This violates Third Normal Form (3NF) — there are transitive dependencies:

• customer_name, customer_email depend on customer_id, which depends on order_id.
  But they don't depend directly on order_id — they depend on the customer.

• product_name, product_price depend on product_id similarly.

Problems this causes:
  ① Update anomaly: if a customer changes their email, you must update every order row.
  ② Insertion anomaly: you can't record a customer until they have an order.
  ③ Deletion anomaly: deleting all orders for a customer loses their contact info.

Correct design:
  customers(customer_id, name, email)
  products(product_id, name, price)
  orders(order_id, customer_id, order_date)
  order_items(order_id, product_id, quantity)`,
  },
  {
    id: 'sd04',
    title: 'When to Denormalize',
    category: 'Normalization',
    difficulty: 'Medium',
    scenario: `
Your e-commerce platform has a highly normalized schema. A new analytics dashboard queries:

  SELECT p.name, SUM(oi.quantity * p.price) AS revenue
  FROM order_items oi
  JOIN products p ON oi.product_id = p.product_id
  JOIN orders o   ON oi.order_id = o.order_id
  WHERE o.order_date >= '2024-01-01'
  GROUP BY p.product_id, p.name

This query runs on a table with 50 million order_item rows and takes 8 seconds.
The dashboard refreshes every 5 minutes. What is the best approach?`,
    options: [
      { id: 'a', label: 'Add DISTINCT to remove duplicates (this is the bottleneck).' },
      { id: 'b', label: 'Create a pre-aggregated summary table (materialized view / daily rollup) that this dashboard queries instead.' },
      { id: 'c', label: 'Denormalize: store product_name and price inside order_items to avoid JOINs.' },
      { id: 'd', label: 'Shard the orders table by year.' },
    ],
    answer: 'b',
    explanation: `A pre-aggregated summary table (option B) is the right tradeoff here:

  daily_product_revenue(product_id, product_name, date, quantity_sold, revenue)

• Populated nightly or on a schedule — the write cost is paid once per aggregation window.
• The dashboard query becomes a simple scan on a small table.
• Normalization is preserved in the source tables (no data integrity risk).

Option C (denormalizing order_items with product_name/price) is tempting but dangerous:
  — If a product price changes, historical order_items would need updating.
  — In fact, for orders, storing the price-at-time-of-purchase IS correct (snapshot fact),
    but product_name duplication is still bad.

Indexes (not listed) are the first thing to check for an 8-second query. But for an OLAP dashboard over 50M rows, pre-aggregation is the architectural solution.`,
  },
  {
    id: 'sd05',
    title: 'Index Design for This Query',
    category: 'Indexes',
    difficulty: 'Medium',
    scenario: `
This query runs thousands of times per day:

  SELECT order_id, customer_id, status, created_at
  FROM orders
  WHERE status = 'pending'
    AND created_at >= '2024-06-01'
  ORDER BY created_at DESC
  LIMIT 50;

The orders table has 10 million rows. No indexes exist beyond the primary key.
Which index would help the most?`,
    options: [
      { id: 'a', label: 'CREATE INDEX idx ON orders(order_id)' },
      { id: 'b', label: 'CREATE INDEX idx ON orders(status)' },
      { id: 'c', label: 'CREATE INDEX idx ON orders(status, created_at)' },
      { id: 'd', label: 'CREATE INDEX idx ON orders(customer_id)' },
    ],
    answer: 'c',
    explanation: `A composite index on (status, created_at) is the best choice:

• status is an equality filter — the index can jump directly to 'pending' rows.
• created_at is a range filter and also the ORDER BY column.
  Within the status partition, rows are already sorted by created_at — the LIMIT 50 can be satisfied without sorting.

This is a "covering index" pattern for equality + range + sort: (equality_col, range_col).

The index on status alone (option B) helps find 'pending' rows, but then the database still has to scan and sort them by created_at.

The index on order_id (option A) is the primary key — it doesn't help at all for this WHERE clause.`,
  },
  {
    id: 'sd06',
    title: 'Many-to-Many Relationship Design',
    category: 'Relationships',
    difficulty: 'Easy',
    scenario: `
You're building a recipe app. A recipe can have many ingredients,
and an ingredient can appear in many recipes. You also need to store
the quantity of each ingredient per recipe.

Which schema correctly models this?`,
    options: [
      { id: 'a', label: 'recipes(recipe_id, name, ingredient_ids_csv) — store ingredient IDs as comma-separated values' },
      { id: 'b', label: 'recipes(recipe_id, name) + ingredients(ingredient_id, name) + recipe_ingredients(recipe_id, ingredient_id, quantity, unit)' },
      { id: 'c', label: 'recipes(recipe_id, name, ingredient_id, quantity) — one row per ingredient per recipe' },
      { id: 'd', label: 'ingredients(ingredient_id, name, recipe_id_list) — store recipe IDs as a JSON array' },
    ],
    answer: 'b',
    explanation: `Option B is correct — this is the standard junction table (bridge table) pattern:

  recipes(recipe_id PK, name)
  ingredients(ingredient_id PK, name)
  recipe_ingredients(recipe_id FK, ingredient_id FK, quantity, unit)
                     └── composite PK on (recipe_id, ingredient_id)

• Many-to-many relationships always need a junction table.
• Extra attributes on the relationship (quantity, unit) live in the junction table.

Why the others are wrong:
  A, D — storing lists in a column (CSV, JSON) violates First Normal Form (1NF). You can't index, query, or JOIN into a comma-separated field properly.
  C — no ingredients table means you'd duplicate ingredient names everywhere and can't find all recipes using a given ingredient.`,
  },
  {
    id: 'sd07',
    title: 'Soft Deletes vs Hard Deletes',
    category: 'Schema Patterns',
    difficulty: 'Medium',
    scenario: `
Your app needs to allow users to delete their account. However:
• GDPR requires you to eventually purge all personal data.
• The business analytics team needs to track churn — when users left.
• Some tables reference the user (orders, reviews, etc.) and you can't easily delete them.

Which approach best balances these requirements?`,
    options: [
      { id: 'a', label: 'Hard delete — immediately remove the user row and cascade-delete all related rows.' },
      { id: 'b', label: 'Soft delete — add deleted_at TIMESTAMP NULL to the users table. Filter WHERE deleted_at IS NULL in all queries. Run a GDPR purge job after the retention period.' },
      { id: 'c', label: 'Never delete users — just mark them inactive with a status column.' },
      { id: 'd', label: 'Move deleted users to a separate deleted_users archive table immediately.' },
    ],
    answer: 'b',
    explanation: `Soft delete (option B) is the industry-standard pattern for user-facing apps:

  users(user_id, email, name, created_at, deleted_at)  -- NULL means active

Benefits:
  • Historical data (orders, reviews) remains valid — no cascade-delete chaos.
  • Analytics can compute churn rate by querying deleted_at.
  • A scheduled job can truly purge rows older than N days for GDPR compliance.

Key implementation details:
  • Add WHERE deleted_at IS NULL to every query that shouldn't see deleted users.
  • Use a database view or ORM default scope to enforce this automatically.
  • Consider anonymizing PII at deletion time and purging later, rather than keeping raw email.

Option C (just mark inactive) is fine for simple cases but loses the deletion timestamp needed for churn analysis and GDPR tracking.`,
  },
]

const CATEGORIES = [...new Set(CHALLENGES.map(c => c.category))]
const DIFF_LABELS = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }

export default function SchemaDesignPage() {
  const [selected, setSelected]  = useState(null)
  const [chosen, setChosen]      = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [allAnswers, setAllAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem('qldb_schema_answers') || '{}') }
    catch { return {} }
  })
  const [activeCategory, setActiveCategory] = useState('All')

  function selectChallenge(c) {
    setSelected(c)
    setChosen(allAnswers[c.id]?.chosen || null)
    setSubmitted(!!allAnswers[c.id])
  }

  function handleSubmit() {
    if (!chosen || submitted) return
    const isCorrect = chosen === selected.answer
    const next = { ...allAnswers, [selected.id]: { chosen, correct: isCorrect } }
    setAllAnswers(next)
    localStorage.setItem('qldb_schema_answers', JSON.stringify(next))
    setSubmitted(true)
  }

  function handleReset() {
    const next = { ...allAnswers }
    delete next[selected.id]
    setAllAnswers(next)
    localStorage.setItem('qldb_schema_answers', JSON.stringify(next))
    setChosen(null)
    setSubmitted(false)
  }

  const filtered = activeCategory === 'All'
    ? CHALLENGES
    : CHALLENGES.filter(c => c.category === activeCategory)

  const correctCount = Object.values(allAnswers).filter(a => a.correct).length

  return (
    <div className="page-full schema-page">
      <div className="schema-layout">
        {/* Left sidebar */}
        <aside className="debug-sidebar">
          <div className="debug-sidebar-header">
            <span className="debug-sidebar-title">Schema Design</span>
            <span className="debug-sidebar-count">{correctCount}/{CHALLENGES.length} correct</span>
          </div>

          <div className="schema-categories">
            {['All', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                className={`schema-cat-btn${activeCategory === cat ? ' schema-cat-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="debug-list">
            {filtered.map(c => {
              const answered = allAnswers[c.id]
              return (
                <button
                  key={c.id}
                  className={`debug-list-item${selected?.id === c.id ? ' debug-list-item-active' : ''}`}
                  onClick={() => selectChallenge(c)}
                >
                  <div className="debug-list-item-top">
                    <span className={`badge ${DIFF_LABELS[c.difficulty] || 'badge-easy'}`}>{c.difficulty}</span>
                    {answered && (
                      <span className={answered.correct ? 'debug-solved-check' : 'debug-wrong-x'}>
                        {answered.correct ? '✓' : '✕'}
                      </span>
                    )}
                  </div>
                  <div className="debug-list-item-title">{c.title}</div>
                  <div className="debug-list-item-cat">{c.category}</div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Right: content */}
        <div className="schema-content">
          {!selected ? (
            <div className="schema-empty">
              <div className="schema-empty-icon">🗄</div>
              <div className="schema-empty-title">Schema Design Challenges</div>
              <p className="schema-empty-text">
                Practice real-world schema design decisions: normalization, keys, indexes,
                and relationship patterns — all commonly tested in system design interviews.
              </p>
              <p className="schema-empty-text">Select a challenge from the left to begin.</p>
            </div>
          ) : (
            <div className="schema-challenge">
              <div className="debug-problem-meta">
                <span className={`badge ${DIFF_LABELS[selected.difficulty] || 'badge-easy'}`}>{selected.difficulty}</span>
                <span className="badge badge-category">{selected.category}</span>
                {allAnswers[selected.id]?.correct && <span className="badge badge-solved">✓ Correct</span>}
              </div>
              <h2 className="debug-problem-title">{selected.title}</h2>

              <pre className="schema-scenario">{selected.scenario.trim()}</pre>

              <div className="schema-options">
                {selected.options.map(opt => {
                  let cls = 'schema-option'
                  if (chosen === opt.id) cls += ' schema-option-chosen'
                  if (submitted) {
                    if (opt.id === selected.answer) cls += ' schema-option-correct'
                    else if (chosen === opt.id) cls += ' schema-option-wrong'
                  }
                  return (
                    <button
                      key={opt.id}
                      className={cls}
                      onClick={() => !submitted && setChosen(opt.id)}
                      disabled={submitted}
                    >
                      <span className="schema-option-letter">{opt.id.toUpperCase()}</span>
                      <span className="schema-option-label">{opt.label}</span>
                      {submitted && opt.id === selected.answer && (
                        <span className="schema-option-icon">✓</span>
                      )}
                      {submitted && chosen === opt.id && opt.id !== selected.answer && (
                        <span className="schema-option-icon schema-option-icon-wrong">✕</span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="schema-actions">
                {!submitted ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!chosen}
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={handleReset}>Try Again</button>
                )}
              </div>

              {submitted && (
                <div className={`schema-explanation ${allAnswers[selected.id]?.correct ? 'schema-explanation-correct' : 'schema-explanation-wrong'}`}>
                  <div className="schema-explanation-title">
                    {allAnswers[selected.id]?.correct ? '✓ Correct!' : '✕ Not quite'}
                  </div>
                  <pre className="schema-explanation-text">{selected.explanation}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
