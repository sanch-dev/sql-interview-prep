import { useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

const CONCEPTS = [
  // ───── JOINS ─────
  {
    id: 'inner-join', category: 'Joins', title: 'INNER JOIN',
    summary: 'Returns only rows where the join condition matches in both tables. Non-matching rows are excluded.',
    example: `SELECT e.name, d.dept_name
FROM employees e
INNER JOIN departments d ON e.dept_id = d.dept_id;`,
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
    tip: 'LEFT JOIN + WHERE right_table.col IS NULL is a classic pattern to find records that have NO match — e.g., customers who never ordered.',
  },
  {
    id: 'self-join', category: 'Joins', title: 'Self Join',
    summary: 'Join a table to itself using aliases. Common for org hierarchies or finding pairs within the same table.',
    example: `-- Find each employee and their manager's name
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.emp_id;`,
    tip: 'Always alias both sides of a self-join (e for employee, m for manager). Without aliases, column names become ambiguous.',
  },
  {
    id: 'join-duplicates', category: 'Joins', title: 'Avoiding Duplicate Rows in Joins',
    summary: 'A many-to-many join (e.g., customers → orders → products) fans out rows. Use DISTINCT or aggregate to collapse them.',
    example: `-- Wrong: fans out, customer appears once per product bought
SELECT DISTINCT c.name
FROM customers c
JOIN orders o      ON c.customer_id = o.customer_id
JOIN order_items i ON o.order_id    = i.order_id
WHERE i.category = 'electronics';`,
    tip: 'Whenever you JOIN through a junction/bridge table, always check for unexpected row inflation with a quick COUNT(*) before adding DISTINCT.',
  },

  // ───── AGGREGATION ─────
  {
    id: 'group-by', category: 'Aggregation', title: 'GROUP BY & HAVING',
    summary: 'GROUP BY collapses rows into groups by column values. HAVING filters those groups (like WHERE but for aggregated data).',
    example: `SELECT department, AVG(salary) AS avg_sal, COUNT(*) AS headcount
FROM employees
GROUP BY department
HAVING AVG(salary) > 70000
ORDER BY avg_sal DESC;`,
    tip: 'WHERE filters rows BEFORE grouping; HAVING filters AFTER. You cannot use aggregate functions in WHERE.',
  },
  {
    id: 'count-nulls', category: 'Aggregation', title: 'COUNT(*) vs COUNT(col)',
    summary: 'COUNT(*) counts all rows including NULLs. COUNT(col) counts only non-NULL values in that column.',
    example: `SELECT
  COUNT(*)            AS total_rows,
  COUNT(manager_id)   AS rows_with_manager,  -- NULLs excluded
  COUNT(DISTINCT dept) AS unique_depts
FROM employees;`,
    tip: 'This distinction is a classic interview trap. Always clarify whether NULLs should be counted.',
  },
  {
    id: 'running-total', category: 'Aggregation', title: 'Running Total (Cumulative SUM)',
    summary: 'Use SUM() as a window function with ORDER BY inside OVER() to compute a running total.',
    example: `SELECT
  sale_date,
  amount,
  SUM(amount) OVER (ORDER BY sale_date) AS running_total
FROM daily_sales;`,
    tip: 'Without ORDER BY inside OVER(), SUM() gives the grand total for every row — add ORDER BY to make it cumulative.',
  },

  // ───── WINDOW FUNCTIONS ─────
  {
    id: 'rank-vs-rownumber', category: 'Window Functions', title: 'RANK vs DENSE_RANK vs ROW_NUMBER',
    summary: 'All three number rows. They differ in how they handle ties.',
    example: `SELECT name, score,
  ROW_NUMBER()  OVER (ORDER BY score DESC) AS row_num,   -- 1,2,3,4 (no ties)
  RANK()        OVER (ORDER BY score DESC) AS rnk,       -- 1,1,3,4 (skips 2)
  DENSE_RANK()  OVER (ORDER BY score DESC) AS dense_rnk  -- 1,1,2,3 (no skip)
FROM leaderboard;`,
    tip: '"Top N per group" questions almost always need RANK() or DENSE_RANK() + a WHERE in a subquery or CTE. ROW_NUMBER() works when ties should be broken arbitrarily.',
  },
  {
    id: 'lag-lead', category: 'Window Functions', title: 'LAG & LEAD',
    summary: 'LAG accesses the previous row\'s value; LEAD accesses the next row\'s value. Both without a subquery or self-join.',
    example: `-- Month-over-month revenue change
SELECT month, revenue,
  LAG(revenue, 1, 0) OVER (ORDER BY month) AS prev_month,
  revenue - LAG(revenue, 1, 0) OVER (ORDER BY month) AS change
FROM monthly_revenue;`,
    tip: 'The third argument to LAG/LEAD is the default value when there is no previous/next row. Use 0 or NULL depending on context.',
  },
  {
    id: 'partition-by', category: 'Window Functions', title: 'PARTITION BY',
    summary: 'PARTITION BY resets the window function for each group — like GROUP BY but without collapsing rows.',
    example: `-- Rank employees within each department
SELECT name, department, salary,
  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;`,
    tip: 'Think of PARTITION BY as "restart the numbering/calculation for each value of this column." You can PARTITION BY multiple columns.',
  },
  {
    id: 'ntile', category: 'Window Functions', title: 'NTILE (Percentile Buckets)',
    summary: 'NTILE(n) divides rows into n equal buckets. NTILE(4) gives quartiles (1–4).',
    example: `-- Divide customers into spend quartiles
SELECT customer_id, total_spend,
  NTILE(4) OVER (ORDER BY total_spend) AS quartile
FROM customer_summary;`,
    tip: 'NTILE is great for cohort analysis. Bucket 1 = bottom tier, bucket N = top tier.',
  },

  // ───── CTEs ─────
  {
    id: 'cte-basics', category: 'CTEs', title: 'Common Table Expressions (WITH)',
    summary: 'A CTE is a named temporary result set defined before the main query. It makes complex queries readable and reusable within the statement.',
    example: `WITH dept_avg AS (
  SELECT department, AVG(salary) AS avg_sal
  FROM employees
  GROUP BY department
)
SELECT e.name, e.salary, d.avg_sal,
  e.salary - d.avg_sal AS diff_from_avg
FROM employees e
JOIN dept_avg d ON e.department = d.department;`,
    tip: 'Replace nested subqueries with CTEs when a query becomes hard to read. You can chain multiple CTEs with commas inside a single WITH block.',
  },
  {
    id: 'cte-vs-subquery', category: 'CTEs', title: 'CTE vs Subquery',
    summary: 'CTEs and subqueries are often interchangeable, but CTEs are more readable and can be referenced multiple times.',
    example: `-- Subquery version (hard to read when nested deeply)
SELECT name FROM employees
WHERE dept_id IN (
  SELECT dept_id FROM departments WHERE location = 'NYC'
);

-- CTE version (clearer)
WITH nyc_depts AS (
  SELECT dept_id FROM departments WHERE location = 'NYC'
)
SELECT name FROM employees WHERE dept_id IN (SELECT dept_id FROM nyc_depts);`,
    tip: 'If the same subquery appears more than once, convert it to a CTE — it\'s both cleaner and signals intent to the reader.',
  },

  // ───── SUBQUERIES ─────
  {
    id: 'correlated-subquery', category: 'Subqueries', title: 'Correlated Subquery',
    summary: 'A correlated subquery references columns from the outer query. It runs once per outer row — powerful but potentially slow on large tables.',
    example: `-- Employees earning above their department average
SELECT name, salary, department
FROM employees e1
WHERE salary > (
  SELECT AVG(salary) FROM employees e2
  WHERE e2.department = e1.department  -- references outer row
);`,
    tip: 'Correlated subqueries can often be replaced with a JOIN to a CTE containing the aggregated value, which is usually faster on large datasets.',
  },
  {
    id: 'exists-vs-in', category: 'Subqueries', title: 'EXISTS vs IN',
    summary: 'EXISTS returns true as soon as one matching row is found (short-circuits). IN materialises the subquery result set.',
    example: `-- EXISTS: stops as soon as it finds one order
SELECT name FROM customers c
WHERE EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
);

-- IN: collects all customer_ids first, then checks membership
SELECT name FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders);`,
    tip: 'Prefer NOT EXISTS over NOT IN when the subquery might return NULLs — NOT IN with NULLs always returns an empty result set (classic trap).',
  },

  // ───── NULL HANDLING ─────
  {
    id: 'null-comparisons', category: 'NULL Handling', title: 'NULL Comparisons',
    summary: 'NULL is not a value — it means "unknown." Any comparison with NULL using = or != returns NULL (not true or false).',
    example: `-- Wrong: returns 0 rows because NULL = NULL is NULL, not true
SELECT * FROM employees WHERE manager_id = NULL;

-- Correct
SELECT * FROM employees WHERE manager_id IS NULL;
SELECT * FROM employees WHERE manager_id IS NOT NULL;`,
    tip: 'Always use IS NULL / IS NOT NULL. The = NULL bug is one of the most common mistakes in SQL interviews.',
  },
  {
    id: 'coalesce', category: 'NULL Handling', title: 'COALESCE & NULLIF',
    summary: 'COALESCE returns the first non-NULL argument. NULLIF returns NULL when two arguments are equal (useful to avoid division by zero).',
    example: `-- Replace NULL with a default
SELECT name, COALESCE(phone, 'N/A') AS phone
FROM contacts;

-- Avoid division by zero
SELECT total_sales / NULLIF(num_transactions, 0) AS avg_sale
FROM summary;`,
    tip: 'COALESCE with multiple arguments chains fallbacks: COALESCE(a, b, c) returns the first non-NULL of a, b, or c.',
  },
  {
    id: 'null-in-aggregates', category: 'NULL Handling', title: 'NULLs in Aggregates & Joins',
    summary: 'Aggregate functions like SUM, AVG, COUNT(col) silently ignore NULLs. NULLs in JOIN keys cause rows to be dropped.',
    example: `-- NULLs are excluded from AVG — this might surprise you
SELECT AVG(bonus) FROM employees; -- employees with NULL bonus are excluded

-- NULLs in join keys never match
SELECT * FROM a JOIN b ON a.id = b.id;  -- rows where id IS NULL won't match`,
    tip: 'If a join is dropping more rows than expected, check whether the join key column contains NULLs.',
  },

  // ───── DATE FUNCTIONS ─────
  {
    id: 'date-arithmetic', category: 'Date Functions', title: 'Date Arithmetic (SQLite)',
    summary: 'SQLite stores dates as TEXT (YYYY-MM-DD). Use DATE(), DATETIME(), and STRFTIME() for manipulation.',
    example: `-- Days between two dates
SELECT julianday('2025-12-31') - julianday('2025-01-01') AS days_diff;

-- Add 30 days
SELECT date('now', '+30 days') AS future_date;

-- Extract month
SELECT strftime('%m', order_date) AS month FROM orders;`,
    tip: 'Date strings must be in ISO format (YYYY-MM-DD) for SQLite comparisons to work correctly as text.',
  },

  // ───── STRING FUNCTIONS ─────
  {
    id: 'string-functions', category: 'String Functions', title: 'Key String Functions',
    summary: 'SQLite provides LENGTH, UPPER, LOWER, TRIM, SUBSTR, REPLACE, INSTR, and LIKE for string manipulation.',
    example: `SELECT
  LENGTH(name)             AS name_len,
  UPPER(name)              AS name_upper,
  SUBSTR(email, 1, INSTR(email, '@') - 1) AS email_local,
  REPLACE(phone, '-', '')  AS phone_clean
FROM users
WHERE name LIKE 'A%';  -- names starting with A`,
    tip: 'LIKE is case-insensitive for ASCII in SQLite. For pattern matching, % matches any sequence; _ matches exactly one character.',
  },

  // ───── SET OPERATIONS ─────
  {
    id: 'union', category: 'Set Operations', title: 'UNION / UNION ALL / INTERSECT / EXCEPT',
    summary: 'Combine results from two SELECT statements. Columns must match in count and compatible types.',
    example: `-- UNION removes duplicates; UNION ALL keeps them (faster)
SELECT city FROM customers
UNION
SELECT city FROM suppliers;

-- Rows in set A but not in set B
SELECT product_id FROM old_catalog
EXCEPT
SELECT product_id FROM new_catalog;`,
    tip: 'UNION ALL is almost always faster than UNION because UNION requires a deduplication pass. Use UNION only when duplicates are actually a problem.',
  },

  // ───── PERFORMANCE ─────
  {
    id: 'index-basics', category: 'Performance', title: 'Indexes',
    summary: 'An index lets the database find rows without scanning the whole table — like a book index. Trade-off: faster reads, slightly slower writes.',
    example: `-- Create an index on a frequently-filtered column
CREATE INDEX idx_orders_customer ON orders(customer_id);

-- Composite index for common filter+sort patterns
CREATE INDEX idx_orders_date_status ON orders(order_date, status);`,
    tip: 'Indexes help most on high-cardinality columns (many distinct values) used in WHERE, JOIN ON, or ORDER BY. An index on a boolean column rarely helps.',
  },
  {
    id: 'query-cost', category: 'Performance', title: 'Why Queries Slow Down',
    summary: 'Common causes: full table scans (no index), functions on indexed columns, N+1 queries, SELECT *, large Cartesian joins.',
    example: `-- Bad: function on column prevents index use
SELECT * FROM orders WHERE YEAR(created_at) = 2024;

-- Good: range filter can use index on created_at
SELECT * FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2025-01-01';`,
    tip: 'Apply transformations to the literal value, not the column. This keeps the column "bare" so the index can be used.',
  },

  // ───── CASE / CONDITIONAL ─────
  {
    id: 'case-when', category: 'Conditional Logic', title: 'CASE WHEN',
    summary: 'CASE evaluates conditions top-to-bottom and returns the THEN value of the first true condition.',
    example: `SELECT name, salary,
  CASE
    WHEN salary >= 100000 THEN 'Senior'
    WHEN salary >= 60000  THEN 'Mid'
    ELSE 'Junior'
  END AS level
FROM employees;`,
    tip: 'Order matters! Put the most restrictive condition first. A common bug is checking >= 60000 before >= 100000 — high earners fall into the wrong bucket.',
  },

  // ───── SCHEMA DESIGN ─────
  {
    id: 'normalization', category: 'Schema Design', title: 'Normalization (1NF–3NF)',
    summary: 'Normalization eliminates data redundancy. 1NF: atomic values. 2NF: no partial dependencies. 3NF: no transitive dependencies.',
    example: `-- Denormalized (bad): repeats category_name with every product
orders(order_id, product_id, product_name, category_name, quantity)

-- Normalized (better): category lives in its own table
products(product_id, product_name, category_id)
categories(category_id, category_name)
order_items(order_id, product_id, quantity)`,
    tip: 'Ask "if I update a fact in one place, do I need to update it elsewhere?" If yes, you have redundancy to remove.',
  },
  {
    id: 'foreign-keys', category: 'Schema Design', title: 'Primary & Foreign Keys',
    summary: 'Primary keys uniquely identify rows. Foreign keys enforce referential integrity — a row cannot reference a non-existent parent.',
    example: `CREATE TABLE orders (
  order_id    INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(customer_id),
  order_date  TEXT    NOT NULL
);`,
    tip: 'A composite primary key (multiple columns together) is often correct for junction/bridge tables in many-to-many relationships.',
  },
]

const CATEGORIES = [...new Set(CONCEPTS.map(c => c.category))]

export default function ConceptsPage({ theme }) {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const isDark = theme === 'dark'

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
          Reference guide for every concept you need to crack SQL interviews — with examples and interview tips.
        </p>
      </div>

      <div className="concepts-controls">
        <input
          className="concepts-search"
          placeholder="Search concepts…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
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

                <div className="concept-example-label">Example</div>
                <CodeMirror
                  value={concept.example}
                  extensions={[sql()]}
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
