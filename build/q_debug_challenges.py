# Debug challenge questions — each has broken_sql (pre-populated in editor)
# and solution (the corrected query users are working toward).
# type='debug' excludes them from the practice sidebar.

DEBUG_CHALLENGES = [
    {
        "id": "dbg01",
        "type": "debug",
        "title": "The Missing GROUP BY Column",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": [],
        "description": """
<p>Someone on the team wrote a query to count employees per department.
It runs in SQLite without an error — but it returns wrong/non-deterministic values for <code>name</code>.</p>
<p>Your job: <strong>fix the bug</strong> so the query returns only <code>department</code> and <code>headcount</code>,
correctly grouped.</p>
<p><strong>Expected columns:</strong> <code>department</code>, <code>headcount</code> — ordered by <code>department</code>.</p>
<div class="bug-banner">🐛 Bug type: non-grouped column in SELECT</div>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     INTEGER NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Alice',   'Engineering', 95000),
 (2, 'Bob',     'Engineering', 88000),
 (3, 'Carol',   'Marketing',   72000),
 (4, 'Dave',    'Engineering', 105000),
 (5, 'Eve',     'Marketing',   68000),
 (6, 'Frank',   'HR',          61000),
 (7, 'Grace',   'HR',          63000),
 (8, 'Hank',    'Engineering', 91000);
""",
        "broken_sql": """SELECT department, name, COUNT(*) AS headcount
FROM employees
GROUP BY department
ORDER BY department;""",
        "solution": """
SELECT department, COUNT(*) AS headcount
FROM employees
GROUP BY department
ORDER BY department;
""",
        "explanation": """
<p>In standard SQL, every column in SELECT must either be aggregated (via COUNT, SUM, etc.) or appear in GROUP BY.
SQLite silently allows non-grouped columns and returns an arbitrary row's value — which is almost never correct.</p>
<p>The fix: remove <code>name</code> from the SELECT list (or move it to GROUP BY if you actually need it per name).</p>
""",
        "hints": [
            "Look at every column in the SELECT list.",
            "Is every non-aggregate column also in GROUP BY?",
            "Remove any column from SELECT that you're not grouping by and don't need.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg02",
        "type": "debug",
        "title": "Aggregate in WHERE Clause",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["Amazon", "Google"],
        "description": """
<p>The query tries to find departments where the average salary exceeds 80,000.
It throws an error: <em>"misuse of aggregate function AVG()"</em>.</p>
<p>Fix the query so it correctly returns departments with <code>avg_salary &gt; 80000</code>.</p>
<p><strong>Expected columns:</strong> <code>department</code>, <code>avg_salary</code> — ordered by <code>avg_salary DESC</code>.</p>
<div class="bug-banner">🐛 Bug type: aggregate function in WHERE clause</div>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     INTEGER NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Alice',   'Engineering', 95000),
 (2, 'Bob',     'Engineering', 88000),
 (3, 'Carol',   'Marketing',   72000),
 (4, 'Dave',    'Engineering', 105000),
 (5, 'Eve',     'Marketing',   68000),
 (6, 'Frank',   'Finance',     84000),
 (7, 'Grace',   'Finance',     91000),
 (8, 'Hank',    'Engineering', 91000);
""",
        "broken_sql": """SELECT department, AVG(salary) AS avg_salary
FROM employees
WHERE AVG(salary) > 80000
GROUP BY department
ORDER BY avg_salary DESC;""",
        "solution": """
SELECT department, AVG(salary) AS avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > 80000
ORDER BY avg_salary DESC;
""",
        "explanation": """
<p><code>WHERE</code> filters individual rows <em>before</em> grouping happens, so aggregate functions are not available there.</p>
<p><code>HAVING</code> filters <em>after</em> grouping — it's the correct clause for filtering on aggregate values.</p>
<p>Memory trick: WHERE = row filter (pre-GROUP), HAVING = group filter (post-GROUP).</p>
""",
        "hints": [
            "WHERE runs before GROUP BY — aggregate functions don't exist yet at that stage.",
            "There is another SQL clause that filters groups after aggregation.",
            "Replace WHERE with HAVING.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg03",
        "type": "debug",
        "title": "NULL Comparison with =",
        "difficulty": "Easy",
        "category": "NULL Handling",
        "companies": ["Meta", "Microsoft"],
        "description": """
<p>This query tries to find all employees who have no manager (i.e., <code>manager_id</code> is NULL).
It runs without error but <strong>returns 0 rows</strong>, even though 2 employees are top-level managers.</p>
<p>Fix it to correctly return employees without a manager.</p>
<p><strong>Expected columns:</strong> <code>name</code>, <code>manager_id</code>.</p>
<div class="bug-banner">🐛 Bug type: comparing NULL with = instead of IS NULL</div>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    manager_id INTEGER    -- NULL means top-level (no manager)
);
INSERT INTO employees VALUES
 (1, 'Alice',   NULL),
 (2, 'Bob',     1),
 (3, 'Carol',   1),
 (4, 'Dave',    NULL),
 (5, 'Eve',     4),
 (6, 'Frank',   4);
""",
        "broken_sql": """SELECT name, manager_id
FROM employees
WHERE manager_id = NULL;""",
        "solution": """
SELECT name, manager_id
FROM employees
WHERE manager_id IS NULL;
""",
        "explanation": """
<p>In SQL, NULL represents an unknown value. Comparing anything to NULL with <code>=</code> yields NULL (not TRUE or FALSE),
so the WHERE condition never matches any row.</p>
<p>The correct operators are <code>IS NULL</code> and <code>IS NOT NULL</code>.
This is one of the most common SQL bugs — interviewers test for it deliberately.</p>
""",
        "hints": [
            "Run the broken query — it returns 0 rows despite having NULLs in the table.",
            "NULL is not a value — it's the absence of one. = NULL never evaluates to true.",
            "Use IS NULL instead of = NULL.",
        ],
        "order_matters": False,
    },
    {
        "id": "dbg04",
        "type": "debug",
        "title": "INNER JOIN Drops Unmatched Rows",
        "difficulty": "Easy",
        "category": "Joins",
        "companies": ["Netflix", "Airbnb"],
        "description": """
<p>The query counts orders per customer to identify engagement levels.
The requirement: <strong>include every customer</strong>, even those with zero orders.</p>
<p>The current query silently excludes customers who have never ordered.
Fix it so all 6 customers appear, with <code>order_count = 0</code> for those with no orders.</p>
<p><strong>Expected columns:</strong> <code>name</code>, <code>order_count</code> — ordered by <code>name</code>.</p>
<div class="bug-banner">🐛 Bug type: INNER JOIN excludes non-matching rows</div>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    amount      REAL NOT NULL
);
INSERT INTO customers VALUES
 (1, 'Alice'), (2, 'Bob'), (3, 'Carol'),
 (4, 'Dave'),  (5, 'Eve'), (6, 'Frank');
INSERT INTO orders VALUES
 (1, 1, 120.50),
 (2, 1, 89.00),
 (3, 3, 45.00),
 (4, 2, 200.00),
 (5, 3, 75.50);
""",
        "broken_sql": """SELECT c.name, COUNT(o.order_id) AS order_count
FROM customers c
INNER JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
ORDER BY c.name;""",
        "solution": """
SELECT c.name, COUNT(o.order_id) AS order_count
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.name
ORDER BY c.name;
""",
        "explanation": """
<p>INNER JOIN only returns rows where the join condition matches in <em>both</em> tables.
Customers with no orders have no matching rows in the <code>orders</code> table, so INNER JOIN drops them.</p>
<p>LEFT JOIN keeps all rows from the left table (<code>customers</code>) and fills the right side with NULLs when there's no match.
<code>COUNT(o.order_id)</code> correctly returns 0 for NULL order_ids (since COUNT ignores NULLs).</p>
""",
        "hints": [
            "How many rows does the broken query return? Compare to the total number of customers.",
            "Which join type keeps all rows from the left table, even without a match on the right?",
            "Change INNER JOIN to LEFT JOIN.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg05",
        "type": "debug",
        "title": "NOT IN with NULLs Always Returns Empty",
        "difficulty": "Medium",
        "category": "NULL Handling",
        "companies": ["Oracle", "SAP"],
        "description": """
<p>The query tries to find employees who are not managers (not in the <code>manager_id</code> column).
It runs fine but <strong>returns 0 rows</strong>, even though most employees are not managers.</p>
<p>Fix it to correctly return non-managers.</p>
<p><strong>Expected columns:</strong> <code>name</code> — ordered by <code>name</code>.</p>
<div class="bug-banner">🐛 Bug type: NOT IN returns empty when subquery contains NULLs</div>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    manager_id INTEGER   -- NULL for top-level employees
);
INSERT INTO employees VALUES
 (1, 'Alice',   NULL),
 (2, 'Bob',     1),
 (3, 'Carol',   1),
 (4, 'Dave',    NULL),
 (5, 'Eve',     4),
 (6, 'Frank',   4),
 (7, 'Grace',   2);
""",
        "broken_sql": """SELECT name
FROM employees
WHERE emp_id NOT IN (SELECT manager_id FROM employees)
ORDER BY name;""",
        "solution": """
SELECT name
FROM employees
WHERE emp_id NOT IN (
    SELECT manager_id FROM employees WHERE manager_id IS NOT NULL
)
ORDER BY name;
""",
        "explanation": """
<p>When a subquery used with NOT IN contains even a single NULL, the entire NOT IN expression evaluates to NULL for every row —
resulting in zero rows returned.</p>
<p>This is because <code>x NOT IN (1, 2, NULL)</code> is equivalent to
<code>x != 1 AND x != 2 AND x != NULL</code>. The last part (<code>x != NULL</code>) is always NULL, making the whole
expression NULL (not TRUE).</p>
<p>The fix: filter NULLs out of the subquery with <code>WHERE manager_id IS NOT NULL</code>.</p>
""",
        "hints": [
            "Run SELECT DISTINCT manager_id FROM employees — notice the NULL value.",
            "x NOT IN (...NULL...) is always NULL, not TRUE, for any x.",
            "Filter out NULLs in the subquery: WHERE manager_id IS NOT NULL.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg06",
        "type": "debug",
        "title": "Wrong ORDER for RANK()",
        "difficulty": "Easy",
        "category": "Window Functions",
        "companies": ["LinkedIn", "Twitter"],
        "description": """
<p>The query ranks employees by salary so that the highest-paid employee gets rank 1.
But the ranks come out reversed — the lowest salary gets rank 1.</p>
<p>Fix the window function so <strong>rank 1 = highest salary</strong>.</p>
<p><strong>Expected columns:</strong> <code>name</code>, <code>salary</code>, <code>salary_rank</code>
— ordered by <code>salary_rank</code>.</p>
<div class="bug-banner">🐛 Bug type: wrong ORDER BY direction in OVER clause</div>
""",
        "schema": """
CREATE TABLE employees (
    emp_id  INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    salary  INTEGER NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Alice',   95000),
 (2, 'Bob',     88000),
 (3, 'Carol',   72000),
 (4, 'Dave',   105000),
 (5, 'Eve',     68000),
 (6, 'Frank',  105000);
""",
        "broken_sql": """SELECT name, salary,
    RANK() OVER (ORDER BY salary ASC) AS salary_rank
FROM employees
ORDER BY salary_rank;""",
        "solution": """
SELECT name, salary,
    RANK() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees
ORDER BY salary_rank;
""",
        "explanation": """
<p>RANK() assigns rank 1 to the first row according to the ORDER BY inside OVER().
With <code>ORDER BY salary ASC</code>, the smallest salary sorts first — so it gets rank 1.</p>
<p>To rank highest-first, use <code>ORDER BY salary DESC</code>.
Note that Dave and Frank both earn 105,000 and share rank 1; the next rank is 3 (RANK skips).</p>
""",
        "hints": [
            "Which salary ends up with rank 1 in the broken query?",
            "RANK() assigns rank 1 to the first row in the OVER ORDER BY.",
            "Change ASC to DESC inside the OVER clause.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg07",
        "type": "debug",
        "title": "Missing ON Clause Creates a Cross Join",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Uber", "DoorDash"],
        "description": """
<p>The query is supposed to return sales with their product names, filtered to amounts over 50.
Instead it returns a massive result — every sale paired with every product.</p>
<p>This is a <strong>Cartesian product (cross join)</strong> caused by a missing ON clause.
Fix it to join on the correct key.</p>
<p><strong>Expected columns:</strong> <code>sale_id</code>, <code>product_name</code>, <code>amount</code>
— where <code>amount &gt; 50</code>, ordered by <code>sale_id</code>.</p>
<div class="bug-banner">🐛 Bug type: missing ON clause → unintended cross join</div>
""",
        "schema": """
CREATE TABLE products (
    product_id   INTEGER PRIMARY KEY,
    product_name TEXT NOT NULL,
    price        REAL NOT NULL
);
CREATE TABLE sales (
    sale_id    INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    amount     REAL NOT NULL,
    sale_date  TEXT NOT NULL
);
INSERT INTO products VALUES
 (1, 'Laptop',   999.00),
 (2, 'Mouse',     29.99),
 (3, 'Keyboard',  79.00),
 (4, 'Monitor',  349.00);
INSERT INTO sales VALUES
 (1, 1, 999.00, '2024-01-10'),
 (2, 2,  29.99, '2024-01-11'),
 (3, 3,  79.00, '2024-01-12'),
 (4, 4, 349.00, '2024-01-13'),
 (5, 1, 999.00, '2024-01-14'),
 (6, 2,  29.99, '2024-01-15');
""",
        "broken_sql": """SELECT s.sale_id, p.product_name, s.amount
FROM sales s
JOIN products p
WHERE s.amount > 50
ORDER BY s.sale_id;""",
        "solution": """
SELECT s.sale_id, p.product_name, s.amount
FROM sales s
JOIN products p ON s.product_id = p.product_id
WHERE s.amount > 50
ORDER BY s.sale_id;
""",
        "explanation": """
<p>A JOIN without an ON clause (or WHERE-based join condition) produces a Cartesian product:
every row in the left table is paired with every row in the right table.</p>
<p>Here 6 sales × 4 products = 24 rows — but only a fraction of those have the WHERE condition satisfied,
so it "looks" like fewer rows but is still wrong.</p>
<p>Always add <code>ON left.key = right.key</code> to define how tables relate.</p>
""",
        "hints": [
            "Count the rows in the broken query. Then count products × sales separately.",
            "A JOIN without ON means every row pairs with every other row.",
            "Add: ON s.product_id = p.product_id",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg08",
        "type": "debug",
        "title": "CASE WHEN Order Bug",
        "difficulty": "Medium",
        "category": "Conditional Logic",
        "companies": ["Stripe", "Square"],
        "description": """
<p>The query classifies employees into <em>Senior</em> (≥5 years), <em>Mid</em> (2–4 years),
and <em>Junior</em> (&lt;2 years) levels based on <code>years_exp</code>.</p>
<p>The bug: nobody is classified as <em>Senior</em> — they all fall into <em>Mid</em> or <em>Junior</em>.</p>
<p>Fix the CASE statement so Senior employees are correctly identified.</p>
<p><strong>Expected columns:</strong> <code>name</code>, <code>years_exp</code>, <code>level</code>
— ordered by <code>years_exp DESC</code>.</p>
<div class="bug-banner">🐛 Bug type: CASE WHEN conditions evaluated in wrong order</div>
""",
        "schema": """
CREATE TABLE employees (
    emp_id    INTEGER PRIMARY KEY,
    name      TEXT NOT NULL,
    years_exp INTEGER NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Alice',   8),
 (2, 'Bob',     3),
 (3, 'Carol',   1),
 (4, 'Dave',    6),
 (5, 'Eve',     2),
 (6, 'Frank',   0),
 (7, 'Grace',   5);
""",
        "broken_sql": """SELECT name, years_exp,
    CASE
        WHEN years_exp >= 2 THEN 'Mid'
        WHEN years_exp >= 5 THEN 'Senior'
        ELSE 'Junior'
    END AS level
FROM employees
ORDER BY years_exp DESC;""",
        "solution": """
SELECT name, years_exp,
    CASE
        WHEN years_exp >= 5 THEN 'Senior'
        WHEN years_exp >= 2 THEN 'Mid'
        ELSE 'Junior'
    END AS level
FROM employees
ORDER BY years_exp DESC;
""",
        "explanation": """
<p>CASE evaluates conditions top-to-bottom and returns the THEN value for the <em>first</em> true condition.
With <code>WHEN years_exp >= 2</code> first, any employee with 5+ years also satisfies <code>>= 2</code>
and is immediately classified as Mid — the Senior branch is never reached.</p>
<p>Rule: always put the <strong>most restrictive condition first</strong> (highest threshold first for >= checks).</p>
""",
        "hints": [
            "What is Alice's level in the broken query? She has 8 years of experience.",
            "CASE stops at the first true condition. Does >= 2 also match employees with >= 5 years?",
            "Reorder: put WHEN years_exp >= 5 before WHEN years_exp >= 2.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg09",
        "type": "debug",
        "title": "Date Range Off-by-One",
        "difficulty": "Easy",
        "category": "Date Functions",
        "companies": ["Booking.com", "Expedia"],
        "description": """
<p>The query retrieves orders placed in <strong>January 2024</strong>.
It misses orders placed on January 31st because the date range ends on the 30th.</p>
<p>Fix the BETWEEN range so all January 2024 orders are included.</p>
<p><strong>Expected columns:</strong> <code>order_id</code>, <code>order_date</code>, <code>amount</code>
— ordered by <code>order_date</code>.</p>
<div class="bug-banner">🐛 Bug type: off-by-one in BETWEEN date range</div>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INTEGER PRIMARY KEY,
    order_date TEXT NOT NULL,
    amount     REAL NOT NULL
);
INSERT INTO orders VALUES
 (1, '2024-01-05',  120.00),
 (2, '2024-01-15',   89.50),
 (3, '2024-01-30',  200.00),
 (4, '2024-01-31',   55.00),
 (5, '2024-02-01',  310.00),
 (6, '2024-02-14',   45.00);
""",
        "broken_sql": """SELECT order_id, order_date, amount
FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-30'
ORDER BY order_date;""",
        "solution": """
SELECT order_id, order_date, amount
FROM orders
WHERE order_date BETWEEN '2024-01-01' AND '2024-01-31'
ORDER BY order_date;
""",
        "explanation": """
<p>BETWEEN is inclusive on both ends: <code>BETWEEN '2024-01-01' AND '2024-01-30'</code> includes the 30th
but not the 31st. January has 31 days, so order #4 is missed.</p>
<p>Two good practices: (1) use <code>BETWEEN '2024-01-01' AND '2024-01-31'</code>, or
(2) use a half-open range: <code>order_date >= '2024-01-01' AND order_date < '2024-02-01'</code>.
The half-open pattern works cleanly for any month length.</p>
""",
        "hints": [
            "How many days does January have?",
            "BETWEEN is inclusive. What is the last date in the BETWEEN range?",
            "Change '2024-01-30' to '2024-01-31'.",
        ],
        "order_matters": True,
    },
    {
        "id": "dbg10",
        "type": "debug",
        "title": "Duplicate Rows from Multi-Table Join",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Shopify", "Amazon"],
        "description": """
<p>The query finds customer names who purchased a product from the <em>electronics</em> category.
It returns duplicate names because some customers have multiple electronics orders.</p>
<p>Fix the query to return each customer name only once.</p>
<p><strong>Expected columns:</strong> <code>name</code> — ordered alphabetically, no duplicates.</p>
<div class="bug-banner">🐛 Bug type: many-to-many join fan-out causing duplicate rows</div>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date  TEXT NOT NULL
);
CREATE TABLE order_items (
    item_id    INTEGER PRIMARY KEY,
    order_id   INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL
);
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL
);
INSERT INTO customers VALUES
 (1, 'Alice'), (2, 'Bob'), (3, 'Carol'), (4, 'Dave');
INSERT INTO orders VALUES
 (1, 1, '2024-02-01'), (2, 1, '2024-03-10'),
 (3, 2, '2024-02-15'), (4, 3, '2024-01-20');
INSERT INTO products VALUES
 (1, 'Laptop',   'electronics'),
 (2, 'T-Shirt',  'clothing'),
 (3, 'Phone',    'electronics'),
 (4, 'Headphones','electronics');
INSERT INTO order_items VALUES
 (1, 1, 1, 1),
 (2, 1, 3, 2),
 (3, 2, 4, 1),
 (4, 3, 2, 3),
 (5, 4, 1, 1);
""",
        "broken_sql": """SELECT c.name
FROM customers c
JOIN orders o      ON c.customer_id = o.customer_id
JOIN order_items i ON o.order_id    = i.order_id
JOIN products p    ON i.product_id  = p.product_id
WHERE p.category = 'electronics'
ORDER BY c.name;""",
        "solution": """
SELECT DISTINCT c.name
FROM customers c
JOIN orders o      ON c.customer_id = o.customer_id
JOIN order_items i ON o.order_id    = i.order_id
JOIN products p    ON i.product_id  = p.product_id
WHERE p.category = 'electronics'
ORDER BY c.name;
""",
        "explanation": """
<p>When you JOIN through multiple tables and a customer has several electronics purchases,
the join creates one row per (customer, order, item, product) combination — the customer name appears once for each.</p>
<p>The fix is DISTINCT, which deduplicates the final result set.
Alternatively, you could restructure the query using EXISTS or a subquery that aggregates first.</p>
""",
        "hints": [
            "Count how many rows the broken query returns vs how many unique customers you expect.",
            "Alice has 3 electronics items across 2 orders — how many times does her name appear?",
            "Add DISTINCT after SELECT.",
        ],
        "order_matters": True,
    },
]
