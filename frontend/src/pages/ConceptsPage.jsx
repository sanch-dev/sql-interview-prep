import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql, MSSQL } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

const CONCEPTS = [
  // ───── JOINS ─────
  {
    id: 'inner-join', category: 'Joins', title: 'INNER JOIN',
    summary: 'Returns only rows where the join condition matches in both tables. Non-matching rows are excluded.',
    example: `SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;`,
    exampleTSQL: `SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;
-- T-SQL syntax is identical to standard SQL`,
    tip: 'If you see fewer rows than expected, a LEFT JOIN may be what you actually need — INNER JOIN silently drops unmatched rows.',
  },
  {
    id: 'left-join', category: 'Joins', title: 'LEFT JOIN',
    summary: 'Returns all rows from the left table, with matched rows from the right. Unmatched right columns are NULL.',
    example: `-- Find all customers, including those with no orders
SELECT c.name, COUNT(o.order_id) AS order_count
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name;`,
    exampleTSQL: `-- T-SQL: LEFT JOIN syntax identical; NOLOCK hint is T-SQL specific
SELECT c.name, COUNT(o.order_id) AS order_count
FROM customers c
LEFT JOIN orders o WITH (NOLOCK) ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name;`,
    tip: 'LEFT JOIN + WHERE right_table.col IS NULL finds rows with no match — classic "customers who never ordered" pattern.',
  },
  {
    id: 'self-join', category: 'Joins', title: 'Self Join',
    summary: 'Join a table to itself using aliases. Common for org hierarchies or finding pairs within the same table.',
    example: `-- Each employee and their manager's name
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;`,
    exampleTSQL: `-- T-SQL: identical self-join syntax
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;`,
    tip: 'Always alias both sides of a self-join. Without aliases column names become ambiguous.',
  },
  {
    id: 'join-duplicates', category: 'Joins', title: 'Avoiding Duplicate Rows from Joins',
    summary: 'A many-to-many join fans out rows. Use DISTINCT or aggregate to collapse duplicates.',
    example: `-- DISTINCT collapses duplicates from many-to-many join
SELECT DISTINCT c.name
FROM customers c
JOIN orders o      ON c.customer_id = o.customer_id
JOIN order_items i ON o.order_id    = i.order_id
JOIN products p    ON i.product_id  = p.product_id
WHERE p.category = 'electronics';`,
    exampleTSQL: `-- T-SQL: DISTINCT works the same way
SELECT DISTINCT c.name
FROM customers c
JOIN orders o      ON c.customer_id = o.customer_id
JOIN order_items i ON o.order_id    = i.order_id
JOIN products p    ON i.product_id  = p.product_id
WHERE p.category = 'electronics';`,
    tip: 'When you JOIN through a junction/bridge table, always check for row inflation with COUNT(*) before adding DISTINCT.',
  },

  // ───── AGGREGATION ─────
  {
    id: 'group-by', category: 'Aggregation', title: 'GROUP BY & HAVING',
    summary: 'GROUP BY collapses rows into groups. HAVING filters those groups (like WHERE but for aggregated data).',
    example: `SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS headcount
FROM employees
GROUP BY department
HAVING AVG(salary) > 70000
ORDER BY avg_sal DESC;`,
    exampleTSQL: `SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS headcount
FROM employees
GROUP BY department
HAVING AVG(salary) > 70000
ORDER BY avg_sal DESC;
-- T-SQL: identical syntax for GROUP BY / HAVING`,
    tip: 'WHERE filters BEFORE grouping; HAVING filters AFTER. You cannot use aggregate functions in WHERE.',
  },
  {
    id: 'count-nulls', category: 'Aggregation', title: 'COUNT(*) vs COUNT(col)',
    summary: 'COUNT(*) counts all rows including NULLs. COUNT(col) counts only non-NULL values.',
    example: `SELECT
  COUNT(*)            AS total_rows,
  COUNT(manager_id)   AS rows_with_manager,  -- NULLs excluded
  COUNT(DISTINCT dept) AS unique_depts
FROM employees;`,
    exampleTSQL: `SELECT
  COUNT(*)             AS total_rows,
  COUNT(manager_id)    AS rows_with_manager,  -- NULLs excluded
  COUNT(DISTINCT dept) AS unique_depts
FROM employees;
-- T-SQL: COUNT behavior is identical to standard SQL`,
    tip: 'This distinction is a classic interview trap. Always clarify whether NULLs should be counted.',
  },
  {
    id: 'running-total', category: 'Aggregation', title: 'Running Total (Cumulative SUM)',
    summary: 'Use SUM() as a window function with ORDER BY inside OVER() to compute a running total.',
    example: `-- SQLite: running total with window function
SELECT sale_date, amount,
  SUM(amount) OVER (ORDER BY sale_date) AS running_total
FROM daily_sales;`,
    exampleTSQL: `-- T-SQL: identical window function syntax
SELECT sale_date, amount,
  SUM(amount) OVER (ORDER BY sale_date) AS running_total
FROM daily_sales;

-- T-SQL also supports explicit ROWS clause:
SUM(amount) OVER (ORDER BY sale_date ROWS UNBOUNDED PRECEDING)`,
    tip: 'Without ORDER BY inside OVER(), SUM() gives the grand total for every row.',
  },

  // ───── WINDOW FUNCTIONS ─────
  {
    id: 'rank-vs-rownumber', category: 'Window Functions', title: 'RANK vs DENSE_RANK vs ROW_NUMBER',
    summary: 'All three number rows. They differ in how they handle ties.',
    example: `SELECT name, score,
  ROW_NUMBER()  OVER (ORDER BY score DESC) AS row_num,   -- 1,2,3 (no ties)
  RANK()        OVER (ORDER BY score DESC) AS rnk,       -- 1,1,3 (skips 2)
  DENSE_RANK()  OVER (ORDER BY score DESC) AS dense_rnk  -- 1,1,2 (no skip)
FROM leaderboard;`,
    exampleTSQL: `-- T-SQL: identical window ranking syntax
SELECT name, score,
  ROW_NUMBER()  OVER (ORDER BY score DESC) AS row_num,
  RANK()        OVER (ORDER BY score DESC) AS rnk,
  DENSE_RANK()  OVER (ORDER BY score DESC) AS dense_rnk
FROM leaderboard;
-- All three functions are standard SQL, supported identically in T-SQL`,
    tip: '"Top N per group" questions almost always need RANK/DENSE_RANK + WHERE rank ≤ N in a CTE.',
  },
  {
    id: 'lag-lead', category: 'Window Functions', title: 'LAG & LEAD',
    summary: 'LAG accesses the previous row; LEAD accesses the next row — both without a self-join.',
    example: `-- SQLite: month-over-month change
SELECT month, revenue,
  LAG(revenue, 1, 0) OVER (ORDER BY month) AS prev_month,
  revenue - LAG(revenue, 1, 0) OVER (ORDER BY month) AS change
FROM monthly_revenue;`,
    exampleTSQL: `-- T-SQL: identical LAG/LEAD syntax
SELECT month, revenue,
  LAG(revenue, 1, 0)  OVER (ORDER BY month) AS prev_month,
  revenue - LAG(revenue, 1, 0) OVER (ORDER BY month) AS mom_change,
  LEAD(revenue, 1, 0) OVER (ORDER BY month) AS next_month
FROM monthly_revenue;`,
    tip: 'The third argument to LAG/LEAD is the default when there is no previous/next row.',
  },
  {
    id: 'partition-by', category: 'Window Functions', title: 'PARTITION BY',
    summary: 'PARTITION BY resets the window function per group — like GROUP BY without collapsing rows.',
    example: `-- Rank employees within each department (SQLite)
SELECT name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;`,
    exampleTSQL: `-- T-SQL: PARTITION BY identical syntax
SELECT name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
  AVG(salary) OVER (PARTITION BY department) AS dept_avg_salary
FROM employees;`,
    tip: 'Think of PARTITION BY as "restart the calculation for each value of this column."',
  },

  // ───── CTEs ─────
  {
    id: 'cte-basics', category: 'CTEs', title: 'Common Table Expressions (WITH)',
    summary: 'A CTE is a named temporary result set defined before the main query. Makes complex queries readable.',
    example: `-- SQLite / Standard SQL CTE
WITH dept_avg AS (
  SELECT department, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department
)
SELECT e.name, e.salary, d.avg_sal
FROM employees e
JOIN dept_avg d ON e.department = d.department;`,
    exampleTSQL: `-- T-SQL: same WITH syntax, also supports multiple CTEs
WITH dept_avg AS (
  SELECT department, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department
),
top_earners AS (
  SELECT name, department, salary
  FROM employees
  WHERE salary > 100000
)
SELECT t.name, t.salary, d.avg_sal
FROM top_earners t
JOIN dept_avg d ON t.department = d.department;`,
    tip: 'Chain multiple CTEs with commas in one WITH block. The last one feeds into the main SELECT.',
  },

  // ───── SUBQUERIES ─────
  {
    id: 'correlated-subquery', category: 'Subqueries', title: 'Correlated Subquery',
    summary: 'A subquery that references the outer query\'s columns. Runs once per outer row — powerful but can be slow.',
    example: `-- Employees earning above their department average (SQLite)
SELECT name, salary, department
FROM employees e1
WHERE salary > (
  SELECT AVG(salary) FROM employees e2
  WHERE e2.department = e1.department
);`,
    exampleTSQL: `-- T-SQL: same correlated subquery syntax
SELECT name, salary, department
FROM employees e1
WHERE salary > (
  SELECT AVG(salary) FROM employees e2
  WHERE e2.department = e1.department
);
-- T-SQL alternative: CROSS APPLY with aggregation (often faster)
SELECT e.name, e.salary, e.department, a.avg_sal
FROM employees e
CROSS APPLY (
  SELECT AVG(salary) AS avg_sal FROM employees i WHERE i.department = e.department
) a
WHERE e.salary > a.avg_sal;`,
    tip: 'Correlated subqueries are often replaceable with a JOIN to a CTE, which can be faster on large tables.',
  },
  {
    id: 'exists-vs-in', category: 'Subqueries', title: 'EXISTS vs IN',
    summary: 'EXISTS short-circuits as soon as one row is found. IN materializes the full subquery result.',
    example: `-- EXISTS: stops on first match
SELECT name FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- IN: collects all customer_ids first
SELECT name FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);`,
    exampleTSQL: `-- T-SQL: EXISTS and IN work identically
SELECT name FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- T-SQL also has NOT EXISTS (safer than NOT IN with NULLs)
SELECT name FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);`,
    tip: 'Prefer NOT EXISTS over NOT IN when the subquery might return NULLs — NOT IN with NULLs always returns empty.',
  },

  // ───── NULL HANDLING ─────
  {
    id: 'null-comparisons', category: 'NULL Handling', title: 'NULL Comparisons',
    summary: 'NULL means "unknown." Any comparison with = or != returns NULL (not true/false).',
    example: `-- SQLite: always use IS NULL / IS NOT NULL
SELECT * FROM employees WHERE manager_id IS NULL;
SELECT * FROM employees WHERE manager_id IS NOT NULL;`,
    exampleTSQL: `-- T-SQL: same IS NULL / IS NOT NULL
SELECT * FROM employees WHERE manager_id IS NULL;
SELECT * FROM employees WHERE manager_id IS NOT NULL;

-- T-SQL also has SET ANSI_NULLS OFF (legacy — do NOT use)
-- In ANSI mode (default), = NULL always evaluates to UNKNOWN`,
    tip: 'Always use IS NULL / IS NOT NULL. The = NULL bug is one of the most common SQL interview mistakes.',
  },
  {
    id: 'coalesce', category: 'NULL Handling', title: 'COALESCE / ISNULL / NULLIF',
    summary: 'COALESCE returns the first non-NULL argument (standard SQL). ISNULL is the T-SQL 2-argument shorthand.',
    example: `-- SQLite: COALESCE for NULL fallback
SELECT name, COALESCE(phone, 'N/A') AS phone FROM contacts;

-- NULLIF returns NULL when two args are equal (avoid division by zero)
SELECT total / NULLIF(count, 0) AS avg_value FROM summary;`,
    exampleTSQL: `-- T-SQL: ISNULL (only 2 args) or COALESCE (multi-arg)
SELECT name, ISNULL(phone, 'N/A') AS phone FROM contacts;

-- COALESCE works in T-SQL too (preferred for portability):
SELECT name, COALESCE(mobile, work_phone, 'N/A') AS contact FROM contacts;

-- NULLIF: same as SQLite/standard SQL
SELECT total / NULLIF(count, 0) AS avg_value FROM summary;`,
    tip: 'Use COALESCE for portability. ISNULL is T-SQL-specific and only accepts 2 arguments.',
  },

  // ───── DATE FUNCTIONS ─────
  {
    id: 'date-arithmetic', category: 'Date Functions', title: 'Date Arithmetic',
    summary: 'SQLite uses string-based dates with STRFTIME/JULIANDAY. T-SQL has GETDATE, DATEADD, DATEDIFF, DATEPART.',
    example: `-- SQLite
SELECT DATE('now')                           AS today,
       DATE('now', '+30 days')               AS future,
       JULIANDAY('2025-12-31')
         - JULIANDAY('2025-01-01')           AS days_diff,
       STRFTIME('%m', order_date)            AS month
FROM orders;`,
    exampleTSQL: `-- T-SQL / SSMS
SELECT GETDATE()                             AS today,
       DATEADD(DAY, 30, GETDATE())           AS future,
       DATEDIFF(DAY, '2025-01-01', '2025-12-31') AS days_diff,
       DATEPART(MONTH, order_date)           AS month_num,
       FORMAT(order_date, 'yyyy-MM')         AS year_month,
       EOMONTH(GETDATE())                    AS last_day_of_month
FROM orders;`,
    tip: 'In T-SQL: DATEADD(interval, n, date) adds n units. DATEDIFF(interval, start, end) gives the difference.',
  },
  {
    id: 'date-filter', category: 'Date Functions', title: 'Filtering by Date Range',
    summary: 'Range filters on dates must keep the column bare to allow index usage.',
    example: `-- SQLite: keep column bare for index
SELECT * FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2024-02-01';`,
    exampleTSQL: `-- T-SQL / SSMS: same principle — keep column bare
SELECT * FROM orders
WHERE order_date >= '2024-01-01'
  AND order_date <  '2024-02-01';

-- Avoid wrapping the column in a function (prevents index use):
-- Bad:  WHERE YEAR(order_date) = 2024 AND MONTH(order_date) = 1
-- Good: WHERE order_date >= '2024-01-01' AND order_date < '2024-02-01'`,
    tip: 'Apply transformations to the literal, not the column — keeps the column index-friendly.',
  },

  // ───── STRING FUNCTIONS ─────
  {
    id: 'string-functions', category: 'String Functions', title: 'String Functions: SQLite vs T-SQL',
    summary: 'Many string functions differ between SQLite and T-SQL/SQL Server.',
    example: `-- SQLite
SELECT
  LENGTH(name)             AS name_len,
  SUBSTR(email, 1, INSTR(email,'@') - 1) AS email_local,
  REPLACE(phone, '-', '')  AS phone_clean,
  UPPER(name)              AS name_upper
FROM users
WHERE name LIKE 'A%';`,
    exampleTSQL: `-- T-SQL / SSMS equivalents
SELECT
  LEN(name)                AS name_len,        -- LEN not LENGTH
  LEFT(email, CHARINDEX('@', email) - 1) AS email_local,  -- not INSTR
  REPLACE(phone, '-', '')  AS phone_clean,     -- same as SQLite
  UPPER(name)              AS name_upper,       -- same
  STUFF(name, 1, 1, UPPER(LEFT(name,1))) AS name_capitalized  -- T-SQL only
FROM users
WHERE name LIKE 'A%';`,
    tip: 'Key differences: LENGTH → LEN, SUBSTR → SUBSTRING, INSTR → CHARINDEX (reversed args!)',
  },

  // ───── SET OPERATIONS ─────
  {
    id: 'union', category: 'Set Operations', title: 'UNION / UNION ALL / INTERSECT / EXCEPT',
    summary: 'Combine results from two SELECTs. Column counts and compatible types must match.',
    example: `-- SQLite: UNION removes duplicates; UNION ALL is faster
SELECT city FROM customers
UNION ALL
SELECT city FROM suppliers;

-- Rows in A but not in B:
SELECT product_id FROM old_catalog
EXCEPT
SELECT product_id FROM new_catalog;`,
    exampleTSQL: `-- T-SQL: same UNION / UNION ALL / INTERSECT / EXCEPT
SELECT city FROM customers
UNION ALL
SELECT city FROM suppliers;

-- T-SQL also has EXCEPT (not MINUS like Oracle):
SELECT product_id FROM old_catalog
EXCEPT
SELECT product_id FROM new_catalog;`,
    tip: 'UNION ALL is almost always faster than UNION — use UNION only when deduplication is actually needed.',
  },

  // ───── PERFORMANCE ─────
  {
    id: 'index-basics', category: 'Performance', title: 'Indexes',
    summary: 'An index lets the database find rows without a full scan. Trade-off: faster reads, slower writes.',
    example: `-- SQLite index creation
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Composite index: equality col first, range col second
CREATE INDEX idx_orders_status_date ON orders(status, created_at);`,
    exampleTSQL: `-- T-SQL / SQL Server index creation
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Clustered index (T-SQL concept — physically orders the table)
CREATE CLUSTERED INDEX idx_pk ON orders(order_id);

-- Non-clustered composite with included columns (covering index)
CREATE NONCLUSTERED INDEX idx_orders_status_date
  ON orders(status, created_at)
  INCLUDE (customer_id, total_amount);
-- INCLUDE avoids key lookups for included columns`,
    tip: 'SQL Server has clustered and non-clustered indexes (SQLite only has non-clustered). Each table can have ONE clustered index.',
  },

  // ───── CASE / CONDITIONAL ─────
  {
    id: 'case-when', category: 'Conditional Logic', title: 'CASE WHEN',
    summary: 'CASE evaluates conditions top-to-bottom and returns the THEN of the first true condition.',
    example: `-- SQLite: CASE WHEN
SELECT name, salary,
  CASE
    WHEN salary >= 100000 THEN 'Senior'
    WHEN salary >= 60000  THEN 'Mid'
    ELSE 'Junior'
  END AS level
FROM employees;`,
    exampleTSQL: `-- T-SQL: CASE WHEN is identical + IIF shorthand
SELECT name, salary,
  CASE
    WHEN salary >= 100000 THEN 'Senior'
    WHEN salary >= 60000  THEN 'Mid'
    ELSE 'Junior'
  END AS level,
  -- T-SQL IIF: single condition shorthand
  IIF(salary >= 100000, 'High Earner', 'Standard') AS earner_type,
  -- T-SQL CHOOSE: index-based selection
  CHOOSE(MONTH(GETDATE()), 'Jan','Feb','Mar','Apr','May','Jun',
         'Jul','Aug','Sep','Oct','Nov','Dec') AS current_month
FROM employees;`,
    tip: 'Order matters! Put the most restrictive condition first — a common bug is checking >= 60000 before >= 100000.',
  },

  // ───── SCHEMA DESIGN ─────
  {
    id: 'normalization', category: 'Schema Design', title: 'Normalization (1NF–3NF)',
    summary: 'Normalization eliminates redundancy. 1NF: atomic values. 2NF: no partial deps. 3NF: no transitive deps.',
    example: `-- Normalized design
customers(customer_id, name, email)
products(product_id, name, category_id)
categories(category_id, category_name)
order_items(order_id, product_id, quantity)`,
    exampleTSQL: `-- T-SQL CREATE TABLE with constraints
CREATE TABLE customers (
  customer_id INT IDENTITY(1,1) PRIMARY KEY,
  name        NVARCHAR(100) NOT NULL,
  email       NVARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE orders (
  order_id    INT IDENTITY(1,1) PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(customer_id),
  order_date  DATETIME2 NOT NULL DEFAULT GETDATE()
);`,
    tip: 'Ask "if I update a fact in one place, do I need to update it elsewhere?" If yes, you have redundancy to normalize.',
  },
]

const CATEGORIES = [...new Set(CONCEPTS.map(c => c.category))]

export default function ConceptsPage({ theme }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const isDark = theme === 'dark'

  const sqlExt = sql({ dialect: MSSQL })

  const filtered = CONCEPTS.filter(c => {
    const inCat = activeCategory === 'All' || c.category === activeCategory
    const inSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.summary.toLowerCase().includes(search.toLowerCase())
    return inCat && inSearch
  })

  return (
    <div className="page-full concepts-page">
      <div className="page-header">
        <h1 className="page-title">SQL Concepts</h1>
        <p className="page-subtitle">
          Reference guide for every concept tested in SQL interviews — with examples in T-SQL (SSMS / Azure SQL).
        </p>
      </div>

      <div className="concepts-controls">
        <div className="concepts-controls-row">
          <input
            className="concepts-search"
            placeholder="Search concepts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="dialect-badge">T-SQL (SSMS)</span>
        </div>
        <div className="category-pills">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              className={`pill${activeCategory === cat ? ' pill-active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="concepts-grid">
        {filtered.map(concept => (
          <div
            key={concept.id}
            className={`concept-card${expanded === concept.id ? ' concept-card-open' : ''}`}
          >
            <button
              className="concept-card-header"
              onClick={() => setExpanded(expanded === concept.id ? null : concept.id)}
            >
              <div className="concept-card-meta">
                <span className="concept-category-tag">{concept.category}</span>
                <span className="concept-title">{concept.title}</span>
              </div>
              <span className="concept-chevron">{expanded === concept.id ? '▲' : '▼'}</span>
            </button>

            {expanded === concept.id && (
              <div className="concept-card-body">
                <p className="concept-summary">{concept.summary}</p>

                <div className="concept-example-label">
                  T-SQL / SSMS Example
                </div>
                <CodeMirror
                  value={concept.exampleTSQL || concept.example}
                  extensions={[sqlExt]}
                  theme={isDark ? oneDark : 'light'}
                  editable={false}
                  basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, autocompletion: false }}
                  className="concept-code"
                />

                <div className="concept-tip">
                  <span className="concept-tip-label">Interview tip</span>
                  {concept.tip}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="concepts-empty">No concepts match your search.</div>
        )}
      </div>
    </div>
  )
}
