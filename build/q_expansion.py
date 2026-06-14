# Expansion pack — T-SQL questions for Azure SQL / SSMS.
# tsql=True skips SQLite validation in build.py.

EXPANSION_MEDIUM = [
    # ── Window Functions ────────────────────────────────────────────────────
    {
        "id": "m19",
        "title": "Salary Percentile Band",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Microsoft", "Amazon", "Google"],
        "tsql": True,
        "description": """
<p>HR at <strong>Vantage Systems</strong> wants every employee bucketed into a salary band for
the annual comp review.</p>
<p>Using <code>NTILE(4)</code>, assign each employee to a quartile (1 = bottom 25 %, 4 = top 25 %)
and label it as <code>Bottom 25%</code>, <code>Lower Mid</code>, <code>Upper Mid</code>, or
<code>Top 25%</code>.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>department</code>, <code>salary</code>,
<code>quartile</code>, <code>salary_band</code> — ordered by salary descending.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    salary     INT NOT NULL
);
INSERT INTO employees VALUES
 (1,  'Mona Diaz',      'Engineering', 155000),
 (2,  'Kyle Renner',    'Engineering', 148000),
 (3,  'Suki Ito',       'Engineering', 121000),
 (4,  'Ira Glass',      'Engineering', 104000),
 (5,  'Gail Strand',    'Sales',       118000),
 (6,  'Pat Boyle',      'Sales',        98000),
 (7,  'Ravi Kapoor',    'Sales',        87000),
 (8,  'Fern Ellis',     'Design',      112000),
 (9,  'Drew Holt',      'Design',      109000),
 (10, 'Lena Park',      'Design',       95000),
 (11, 'Omar Haddad',    'Finance',     132000),
 (12, 'Iris Chen',      'Finance',     126000);
""",
        "solution": """
SELECT name,
       department,
       salary,
       NTILE(4) OVER (ORDER BY salary) AS quartile,
       CASE NTILE(4) OVER (ORDER BY salary)
           WHEN 1 THEN 'Bottom 25%'
           WHEN 2 THEN 'Lower Mid'
           WHEN 3 THEN 'Upper Mid'
           ELSE        'Top 25%'
       END AS salary_band
FROM employees
ORDER BY salary DESC;
""",
        "explanation": """
<p><code>NTILE(4)</code> divides the ordered result set into 4 equal buckets (as even as possible)
and assigns each row a bucket number 1–4. It does <em>not</em> partition here — we rank globally
across the whole company. The <code>CASE</code> on the same window expression maps the number to a
human-readable label.</p>
<p>Common mistake: using <code>PARTITION BY department</code> — that would give quartiles <em>within
each department</em>, not company-wide, which changes the meaning entirely.</p>
""",
        "hints": [
            "NTILE(n) splits the full ordered set into n buckets — no PARTITION BY needed for company-wide ranking.",
            "You can use the window expression twice: once for the number, once inside CASE.",
            "NTILE distributes rows as evenly as possible; with 12 rows and 4 buckets, each bucket gets exactly 3.",
        ],
        "order_matters": False,
    },
    {
        "id": "m20",
        "title": "3-Day Rolling Average Revenue",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Shopify", "Stripe", "Square"],
        "tsql": True,
        "description": """
<p><strong>MerchantHub</strong> wants to smooth out day-to-day revenue spikes for its executive
dashboard. Compute the 3-day rolling average (current day + 2 preceding days) for each date.</p>
<p><strong>Return columns:</strong> <code>sale_date</code>, <code>daily_revenue</code>,
<code>rolling_avg_3d</code> (rounded to 2 decimal places) — ordered by date ascending.</p>
""",
        "schema": """
CREATE TABLE daily_revenue (
    sale_date     DATE PRIMARY KEY,
    daily_revenue DECIMAL(10,2) NOT NULL
);
INSERT INTO daily_revenue VALUES
 ('2025-01-01', 12400.00),
 ('2025-01-02',  9800.00),
 ('2025-01-03', 15200.00),
 ('2025-01-04', 11600.00),
 ('2025-01-05', 18900.00),
 ('2025-01-06', 14300.00),
 ('2025-01-07', 21000.00),
 ('2025-01-08', 16500.00);
""",
        "solution": """
SELECT sale_date,
       daily_revenue,
       ROUND(AVG(CAST(daily_revenue AS FLOAT))
             OVER (ORDER BY sale_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2)
           AS rolling_avg_3d
FROM daily_revenue
ORDER BY sale_date;
""",
        "explanation": """
<p><code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> creates a sliding window of exactly 3 rows:
today and the 2 days before it. For the first two dates the window is smaller (1 or 2 rows) — that
is expected behaviour and mirrors how BI tools handle the boundary.</p>
<p><code>RANGE BETWEEN 2 PRECEDING AND CURRENT ROW</code> would use value-based comparison, not
row-based — a subtle but important difference interviewers test.</p>
""",
        "hints": [
            "Use ROWS BETWEEN 2 PRECEDING AND CURRENT ROW inside AVG() OVER.",
            "ROWS = physical rows; RANGE = logical value range — they differ when there are ties.",
            "CAST to FLOAT before AVG to avoid integer division truncation.",
        ],
        "order_matters": True,
    },
    {
        "id": "m21",
        "title": "Cumulative Headcount by Hire Month",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["LinkedIn", "Workday", "ADP"],
        "tsql": True,
        "description": """
<p>People Ops at <strong>NovaCo</strong> tracks hiring momentum. For each month that had at least one
new hire, show the number of new hires that month and the running total headcount since the company's
founding.</p>
<p><strong>Return columns:</strong> <code>hire_month</code> (format <code>YYYY-MM</code>),
<code>new_hires</code>, <code>cumulative_headcount</code> — ordered by hire_month ascending.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id    INT PRIMARY KEY,
    name      VARCHAR(100) NOT NULL,
    hire_date DATE NOT NULL
);
INSERT INTO employees VALUES
 (1,  'Alice Wong',    '2024-01-15'),
 (2,  'Brian Shah',    '2024-01-22'),
 (3,  'Cara Müller',   '2024-02-10'),
 (4,  'Diego Lopez',   '2024-03-05'),
 (5,  'Eva Novak',     '2024-03-18'),
 (6,  'Felix Adeyemi', '2024-03-29'),
 (7,  'Grace Kim',     '2024-04-02'),
 (8,  'Hugo Ferreira', '2024-05-14'),
 (9,  'Isla Brennan',  '2024-05-20'),
 (10, 'Jiro Sato',     '2024-06-01');
""",
        "solution": """
WITH monthly AS (
    SELECT FORMAT(hire_date, 'yyyy-MM') AS hire_month,
           COUNT(*) AS new_hires
    FROM employees
    GROUP BY FORMAT(hire_date, 'yyyy-MM')
)
SELECT hire_month,
       new_hires,
       SUM(new_hires) OVER (ORDER BY hire_month
                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
           AS cumulative_headcount
FROM monthly
ORDER BY hire_month;
""",
        "explanation": """
<p><code>SUM() OVER (ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)</code> is the
running-total pattern. Grouping first in a CTE, then running the window over the aggregated rows,
avoids the common mistake of applying <code>SUM(COUNT(*))</code> directly — which SQL won't allow
without nesting.</p>
<p><code>FORMAT(hire_date, 'yyyy-MM')</code> is the T-SQL way to extract a year-month string.
Interviewers also accept <code>CONVERT(VARCHAR(7), hire_date, 120)</code>.</p>
""",
        "hints": [
            "GROUP BY month first in a CTE, then apply the window function over the grouped results.",
            "SUM() OVER (ORDER BY month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) = running total.",
            "FORMAT(hire_date, 'yyyy-MM') gives 'YYYY-MM' strings that sort lexicographically.",
        ],
        "order_matters": True,
    },
    # ── Joins ───────────────────────────────────────────────────────────────
    {
        "id": "m22",
        "title": "Customers Who Have Never Ordered",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Amazon", "Shopify", "Etsy"],
        "tsql": True,
        "description": """
<p>The marketing team at <strong>CartCo</strong> wants to send a re-engagement email to every
registered customer who has never placed an order.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>name</code>, <code>email</code>
— ordered by name ascending.</p>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    signup_date DATE NOT NULL
);
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    amount      DECIMAL(10,2) NOT NULL
);
INSERT INTO customers VALUES
 (1, 'Alice Brown',   'alice@example.com',   '2024-01-10'),
 (2, 'Bob Chen',      'bob@example.com',     '2024-02-14'),
 (3, 'Clara Davis',   'clara@example.com',   '2024-03-01'),
 (4, 'Daniel Evans',  'daniel@example.com',  '2024-03-22'),
 (5, 'Elena Flores',  'elena@example.com',   '2024-04-05'),
 (6, 'Frank Garcia',  'frank@example.com',   '2024-04-18');
INSERT INTO orders VALUES
 (101, 1, '2024-02-01', 59.99),
 (102, 1, '2024-04-10', 120.00),
 (103, 3, '2024-03-15', 34.50),
 (104, 5, '2024-05-02', 89.00);
""",
        "solution": """
SELECT c.customer_id, c.name, c.email
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL
ORDER BY c.name;
""",
        "explanation": """
<p>A LEFT JOIN keeps all customers regardless of whether they have orders. For customers with no
matching order row, every column from <code>orders</code> is NULL — so <code>WHERE o.order_id IS
NULL</code> isolates the never-ordered group.</p>
<p>Alternatives: <code>NOT EXISTS</code> (preferred for readability) and <code>NOT IN</code>
(dangerous — fails silently if the subquery returns any NULL <code>order_id</code>). Mention all
three in an interview and explain why NOT IN can break.</p>
""",
        "hints": [
            "A LEFT JOIN includes every customer row — even those with no matching order.",
            "When the right side of a LEFT JOIN has no match, its columns are NULL.",
            "Filter WHERE order_id IS NULL to keep only those with no orders.",
        ],
        "order_matters": False,
    },
    {
        "id": "m23",
        "title": "Employee and Their Manager",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Microsoft", "Oracle", "SAP"],
        "tsql": True,
        "description": """
<p><strong>Pinnacle Corp</strong> stores its org chart in a single self-referencing table. HR needs
a flat list of every employee paired with their manager's name. Employees without a manager (the
CEO) should still appear with <code>NULL</code> for manager.</p>
<p><strong>Return columns:</strong> <code>employee</code>, <code>manager</code>,
<code>department</code> — ordered by department, then employee.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    manager_id INT
);
INSERT INTO employees VALUES
 (1,  'Sarah Lin',     'Executive',   NULL),
 (2,  'Tom Reyes',     'Engineering', 1),
 (3,  'Nadia Patel',   'Engineering', 2),
 (4,  'Leo Kwan',      'Engineering', 2),
 (5,  'Chloe Ortega',  'Sales',       1),
 (6,  'Marcus Webb',   'Sales',       5),
 (7,  'Priya Nair',    'Sales',       5),
 (8,  'Jin Park',      'Finance',     1),
 (9,  'Rosa Lima',     'Finance',     8);
""",
        "solution": """
SELECT e.name AS employee,
       m.name AS manager,
       e.department
FROM employees e
LEFT JOIN employees m ON m.emp_id = e.manager_id
ORDER BY e.department, e.name;
""",
        "explanation": """
<p>A self-join joins the table to itself: alias <code>e</code> for employees and <code>m</code> for
managers. The join condition <code>m.emp_id = e.manager_id</code> links each employee to their
manager row. LEFT JOIN is essential — Sarah Lin has no manager, so an INNER JOIN would silently
drop her from the result.</p>
""",
        "hints": [
            "Join the table to itself with two aliases: one for the employee, one for the manager.",
            "The join condition is m.emp_id = e.manager_id.",
            "Use LEFT JOIN so the top of the hierarchy (no manager) still appears.",
        ],
        "order_matters": False,
    },
    {
        "id": "m24",
        "title": "Unshipped Orders",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Amazon", "FedEx", "DHL"],
        "tsql": True,
        "description": """
<p>The operations team at <strong>SwiftShip</strong> needs a list of all orders that have been
placed but not yet shipped so they can prioritise fulfilment.</p>
<p><strong>Return columns:</strong> <code>order_id</code>, <code>customer_id</code>,
<code>order_date</code>, <code>amount</code> — ordered by order_date ascending.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    amount      DECIMAL(10,2) NOT NULL
);
CREATE TABLE shipments (
    shipment_id INT PRIMARY KEY,
    order_id    INT NOT NULL,
    shipped_at  DATE NOT NULL
);
INSERT INTO orders VALUES
 (1001, 1, '2025-02-01', 149.00),
 (1002, 2, '2025-02-03',  89.50),
 (1003, 1, '2025-02-05', 210.00),
 (1004, 3, '2025-02-07',  55.00),
 (1005, 4, '2025-02-08', 320.00),
 (1006, 2, '2025-02-10',  75.00);
INSERT INTO shipments VALUES
 (9001, 1001, '2025-02-03'),
 (9002, 1002, '2025-02-06'),
 (9003, 1003, '2025-02-08');
""",
        "solution": """
SELECT o.order_id, o.customer_id, o.order_date, o.amount
FROM orders o
WHERE NOT EXISTS (
    SELECT 1 FROM shipments s WHERE s.order_id = o.order_id
)
ORDER BY o.order_date;
""",
        "explanation": """
<p><code>NOT EXISTS</code> is the cleanest and safest anti-join. It short-circuits on the first
match and is NULL-safe (unlike <code>NOT IN</code>). The alternative LEFT JOIN approach works too:
<code>LEFT JOIN shipments ON ... WHERE shipments.order_id IS NULL</code>.</p>
<p>In interviews, always mention that <code>NOT IN (SELECT order_id ...)</code> breaks if any
<code>order_id</code> in <code>shipments</code> is NULL — NOT EXISTS does not have this problem.</p>
""",
        "hints": [
            "You need orders with NO matching row in shipments — this is an anti-join.",
            "NOT EXISTS is the cleanest approach and is NULL-safe.",
            "Alternative: LEFT JOIN shipments WHERE shipments.order_id IS NULL.",
        ],
        "order_matters": False,
    },
    {
        "id": "m25",
        "title": "Frequently Bought Together",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Amazon", "eBay", "Walmart"],
        "tsql": True,
        "description": """
<p>The recommendation team at <strong>BuyNest</strong> wants to find product pairs that appear in
the same order at least twice — the foundation of a "customers also bought" feature.</p>
<p><strong>Return columns:</strong> <code>product_a</code>, <code>product_b</code>,
<code>co_order_count</code> — ordered by co_order_count descending, then product_a,
then product_b.</p>
""",
        "schema": """
CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL
);
INSERT INTO order_items VALUES
 (1,  101, 1), (2,  101, 2), (3,  101, 3),
 (4,  102, 1), (5,  102, 2), (6,  102, 4),
 (7,  103, 2), (8,  103, 3),
 (9,  104, 1), (10, 104, 2), (11, 104, 3),
 (12, 105, 1), (13, 105, 3),
 (14, 106, 3), (15, 106, 4);
""",
        "solution": """
SELECT a.product_id AS product_a,
       b.product_id AS product_b,
       COUNT(*) AS co_order_count
FROM order_items a
JOIN order_items b
    ON b.order_id   = a.order_id
   AND b.product_id > a.product_id
GROUP BY a.product_id, b.product_id
HAVING COUNT(*) >= 2
ORDER BY co_order_count DESC, product_a, product_b;
""",
        "explanation": """
<p>Self-joining <code>order_items</code> on the same <code>order_id</code> generates every pair of
products in each order. The condition <code>b.product_id &gt; a.product_id</code> prevents counting
both (1,2) and (2,1) — each unordered pair appears exactly once. <code>HAVING COUNT(*) &gt;= 2</code>
filters to pairs that co-occur in at least two different orders.</p>
""",
        "hints": [
            "Self-join order_items on order_id to get every pair of products in the same order.",
            "b.product_id > a.product_id ensures each pair is counted once (no (2,1) if you already have (1,2)).",
            "HAVING COUNT(*) >= 2 keeps only frequently co-occurring pairs.",
        ],
        "order_matters": False,
    },
    # ── Aggregation ─────────────────────────────────────────────────────────
    {
        "id": "m26",
        "title": "Revenue by Day of Week",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["Uber Eats", "DoorDash", "Grubhub"],
        "tsql": True,
        "description": """
<p><strong>ForkFast</strong>, a food-delivery app, wants to know which days of the week generate
the most revenue to optimise driver incentives.</p>
<p>For each day of the week, compute total orders and total revenue. Include all 7 days even if
some have no data (show 0).</p>
<p><strong>Return columns:</strong> <code>day_of_week</code>, <code>total_orders</code>,
<code>total_revenue</code> — ordered by the calendar day number (Sunday = 1).</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INT PRIMARY KEY,
    order_date DATE NOT NULL,
    amount     DECIMAL(10,2) NOT NULL
);
INSERT INTO orders VALUES
 (1,  '2025-01-06', 34.50),
 (2,  '2025-01-06', 21.00),
 (3,  '2025-01-07', 88.00),
 (4,  '2025-01-08', 45.00),
 (5,  '2025-01-09', 62.50),
 (6,  '2025-01-10', 77.00),
 (7,  '2025-01-11', 110.00),
 (8,  '2025-01-12', 95.00),
 (9,  '2025-01-13', 40.00),
 (10, '2025-01-14', 130.00),
 (11, '2025-01-15', 58.00),
 (12, '2025-01-17', 72.00),
 (13, '2025-01-18', 115.00),
 (14, '2025-01-19', 48.00);
""",
        "solution": """
SELECT DATENAME(weekday, order_date)       AS day_of_week,
       COUNT(*)                            AS total_orders,
       SUM(amount)                         AS total_revenue
FROM orders
GROUP BY DATENAME(weekday, order_date),
         DATEPART(weekday, order_date)
ORDER BY DATEPART(weekday, order_date);
""",
        "explanation": """
<p><code>DATENAME(weekday, date)</code> returns the full name ('Monday', 'Tuesday', …).
<code>DATEPART(weekday, date)</code> returns the integer (1 = Sunday by default in SQL Server).
You must include <code>DATEPART</code> in the GROUP BY so the ORDER BY works — or use a subquery
to alias it first. Grouping by name alone would silently merge Monday dates with Monday dates but
ORDER BY the name alphabetically ('Friday' before 'Monday'), not in calendar order.</p>
""",
        "hints": [
            "DATENAME(weekday, date) gives the day name; DATEPART(weekday, date) gives the number.",
            "Include DATEPART in the GROUP BY so you can ORDER BY it for correct calendar order.",
            "In SQL Server, DATEPART(weekday, ...) returns 1 for Sunday by default.",
        ],
        "order_matters": True,
    },
    {
        "id": "m27",
        "title": "Users Active on Both Free and Paid Tiers",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["Slack", "Notion", "Dropbox"],
        "tsql": True,
        "description": """
<p><strong>FlowApp</strong> has a freemium model. The growth team wants to identify users who have
triggered events on <em>both</em> the free and paid tiers — these are the strongest upgrade
candidates.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>free_events</code>,
<code>paid_events</code> — ordered by user_id.</p>
""",
        "schema": """
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    event_type VARCHAR(20) NOT NULL,  -- 'free' or 'paid'
    event_date DATE NOT NULL
);
INSERT INTO events VALUES
 (1,  101, 'free',  '2025-01-02'),
 (2,  101, 'paid',  '2025-01-05'),
 (3,  101, 'free',  '2025-01-10'),
 (4,  102, 'free',  '2025-01-03'),
 (5,  102, 'free',  '2025-01-08'),
 (6,  103, 'paid',  '2025-01-04'),
 (7,  103, 'paid',  '2025-01-09'),
 (8,  103, 'free',  '2025-01-12'),
 (9,  104, 'free',  '2025-01-06'),
 (10, 105, 'paid',  '2025-01-07');
""",
        "solution": """
SELECT user_id,
       COUNT(CASE WHEN event_type = 'free' THEN 1 END) AS free_events,
       COUNT(CASE WHEN event_type = 'paid' THEN 1 END) AS paid_events
FROM events
GROUP BY user_id
HAVING COUNT(CASE WHEN event_type = 'free' THEN 1 END) > 0
   AND COUNT(CASE WHEN event_type = 'paid' THEN 1 END) > 0
ORDER BY user_id;
""",
        "explanation": """
<p>Conditional aggregation with <code>COUNT(CASE WHEN ...)</code> counts matching rows without
pivoting to a subquery. The <code>HAVING</code> clause filters groups where both counts are
positive — users who touched both tiers. This is far more readable than two separate subqueries
joined back together.</p>
""",
        "hints": [
            "Use COUNT(CASE WHEN event_type = 'free' THEN 1 END) to count free events per user.",
            "HAVING filters after GROUP BY — use it to keep only users where both counts > 0.",
            "You can reuse the same conditional count expression in both SELECT and HAVING.",
        ],
        "order_matters": False,
    },
    {
        "id": "m28",
        "title": "Category Revenue Share",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["Walmart", "Target", "Costco"],
        "tsql": True,
        "description": """
<p>Finance at <strong>RetailCore</strong> wants to see what percentage of total company revenue
each product category contributes this quarter.</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>category_revenue</code>,
<code>pct_of_total</code> (rounded to 2 decimal places) — ordered by category_revenue descending.</p>
""",
        "schema": """
CREATE TABLE sales (
    sale_id    INT PRIMARY KEY,
    category   VARCHAR(50) NOT NULL,
    revenue    DECIMAL(10,2) NOT NULL,
    sale_date  DATE NOT NULL
);
INSERT INTO sales VALUES
 (1,  'Electronics', 4200.00, '2025-01-05'),
 (2,  'Electronics', 3100.00, '2025-01-12'),
 (3,  'Clothing',    1800.00, '2025-01-08'),
 (4,  'Clothing',    2200.00, '2025-01-15'),
 (5,  'Home',        1500.00, '2025-01-10'),
 (6,  'Home',         900.00, '2025-01-18'),
 (7,  'Sports',      1100.00, '2025-01-07'),
 (8,  'Sports',       700.00, '2025-01-20'),
 (9,  'Beauty',       600.00, '2025-01-09'),
 (10, 'Beauty',       400.00, '2025-01-22');
""",
        "solution": """
SELECT category,
       SUM(revenue) AS category_revenue,
       ROUND(SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (), 2) AS pct_of_total
FROM sales
GROUP BY category
ORDER BY category_revenue DESC;
""",
        "explanation": """
<p><code>SUM(SUM(revenue)) OVER ()</code> is the window-function idiom for "grand total over
grouped results". The outer <code>SUM</code> is the window function; the inner <code>SUM(revenue)</code>
is the per-group aggregate already computed by GROUP BY. Without a window function, you'd need a
self-join or scalar subquery — both slower and harder to read.</p>
""",
        "hints": [
            "GROUP BY category first, then divide each group's SUM by the grand total.",
            "SUM(SUM(revenue)) OVER () gives the grand total across all groups in one pass.",
            "Multiply by 100.0 before dividing to force decimal arithmetic.",
        ],
        "order_matters": False,
    },
    {
        "id": "m29",
        "title": "Transaction Status Pivot",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["Stripe", "PayPal", "Adyen"],
        "tsql": True,
        "description": """
<p>The payments team at <strong>ClearPay</strong> wants a per-merchant summary showing how many
transactions ended in each status, plus the failure rate percentage.</p>
<p><strong>Return columns:</strong> <code>merchant_id</code>, <code>success_count</code>,
<code>failed_count</code>, <code>pending_count</code>, <code>failure_rate_pct</code>
(rounded to 2 dp) — ordered by failure_rate_pct descending.</p>
""",
        "schema": """
CREATE TABLE transactions (
    txn_id      INT PRIMARY KEY,
    merchant_id INT NOT NULL,
    status      VARCHAR(20) NOT NULL,  -- 'success', 'failed', 'pending'
    amount      DECIMAL(10,2) NOT NULL,
    txn_date    DATE NOT NULL
);
INSERT INTO transactions VALUES
 (1,  10, 'success', 120.00, '2025-01-03'),
 (2,  10, 'success',  85.00, '2025-01-04'),
 (3,  10, 'failed',   60.00, '2025-01-04'),
 (4,  10, 'pending',  45.00, '2025-01-05'),
 (5,  20, 'success', 200.00, '2025-01-03'),
 (6,  20, 'failed',  150.00, '2025-01-04'),
 (7,  20, 'failed',   90.00, '2025-01-05'),
 (8,  20, 'failed',   70.00, '2025-01-06'),
 (9,  30, 'success',  55.00, '2025-01-03'),
 (10, 30, 'success',  40.00, '2025-01-05'),
 (11, 30, 'pending',  35.00, '2025-01-06');
""",
        "solution": """
SELECT merchant_id,
       COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count,
       COUNT(CASE WHEN status = 'failed'  THEN 1 END) AS failed_count,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
       ROUND(COUNT(CASE WHEN status = 'failed' THEN 1 END) * 100.0 / COUNT(*), 2)
           AS failure_rate_pct
FROM transactions
GROUP BY merchant_id
ORDER BY failure_rate_pct DESC;
""",
        "explanation": """
<p>Conditional aggregation (<code>COUNT(CASE WHEN status = 'x' THEN 1 END)</code>) is the T-SQL
pivot pattern without the <code>PIVOT</code> operator. It's more readable and doesn't require
knowing distinct values in advance. <code>COUNT(*)</code> in the denominator counts all rows
(including pending), so the failure rate is failures divided by all transactions.</p>
""",
        "hints": [
            "COUNT(CASE WHEN status = 'failed' THEN 1 END) counts only failed rows.",
            "Divide by COUNT(*) for the total row count per merchant.",
            "Multiply the numerator by 100.0 before dividing to get a percentage.",
        ],
        "order_matters": False,
    },
    # ── Date & Time Logic ───────────────────────────────────────────────────
    {
        "id": "m30",
        "title": "Week-over-Week Order Volume",
        "difficulty": "Medium",
        "category": "Date/Time",
        "companies": ["Amazon", "Instacart", "Shipt"],
        "tsql": True,
        "description": """
<p>The ops team at <strong>QuickBasket</strong> monitors weekly order trends. For each ISO week in
the data, show order count, the previous week's count, and the change.</p>
<p><strong>Return columns:</strong> <code>yr</code>, <code>wk</code>,
<code>orders_this_week</code>, <code>orders_last_week</code>, <code>wow_change</code>
— ordered by yr, wk ascending. Exclude the first week (no prior week to compare).</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INT PRIMARY KEY,
    order_date DATE NOT NULL,
    amount     DECIMAL(10,2) NOT NULL
);
INSERT INTO orders VALUES
 (1,  '2025-01-06', 50.00), (2,  '2025-01-07', 80.00), (3,  '2025-01-08', 60.00),
 (4,  '2025-01-13', 90.00), (5,  '2025-01-14', 40.00), (6,  '2025-01-15', 70.00), (7, '2025-01-16', 55.00),
 (8,  '2025-01-20', 110.00),(9,  '2025-01-21', 85.00), (10, '2025-01-22', 95.00),
 (11, '2025-01-27', 45.00), (12, '2025-01-28', 60.00), (13, '2025-01-29', 75.00), (14, '2025-01-30', 88.00), (15, '2025-01-31', 50.00);
""",
        "solution": """
WITH weekly AS (
    SELECT DATEPART(year, order_date) AS yr,
           DATEPART(week, order_date) AS wk,
           COUNT(*) AS orders_this_week
    FROM orders
    GROUP BY DATEPART(year, order_date), DATEPART(week, order_date)
),
with_lag AS (
    SELECT yr, wk, orders_this_week,
           LAG(orders_this_week) OVER (ORDER BY yr, wk) AS orders_last_week
    FROM weekly
)
SELECT yr, wk, orders_this_week, orders_last_week,
       orders_this_week - orders_last_week AS wow_change
FROM with_lag
WHERE orders_last_week IS NOT NULL
ORDER BY yr, wk;
""",
        "explanation": """
<p>Aggregate by week first in a CTE, then apply <code>LAG()</code> in a second CTE to look back
one row. The <code>WHERE orders_last_week IS NOT NULL</code> drops the first week which has nothing
to compare against. This two-CTE pattern (aggregate then window) is cleaner than trying to nest
window functions inside aggregations.</p>
""",
        "hints": [
            "GROUP BY DATEPART(year, ...), DATEPART(week, ...) to get weekly buckets.",
            "LAG(orders_this_week) OVER (ORDER BY yr, wk) gives the previous week's count.",
            "Filter WHERE orders_last_week IS NOT NULL to exclude the first week.",
        ],
        "order_matters": True,
    },
    {
        "id": "m31",
        "title": "Days Between Consecutive Orders",
        "difficulty": "Medium",
        "category": "Date/Time",
        "companies": ["Shopify", "BigCommerce", "WooCommerce"],
        "tsql": True,
        "description": """
<p>The retention team at <strong>OrderFlow</strong> wants to understand customer purchase cadence.
For each order (excluding the first per customer), show how many days since that customer's
previous order.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>order_date</code>,
<code>prev_order_date</code>, <code>days_since_last_order</code> — ordered by customer_id,
order_date.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    amount      DECIMAL(10,2) NOT NULL
);
INSERT INTO orders VALUES
 (1,  1, '2025-01-05', 80.00),
 (2,  1, '2025-01-18', 120.00),
 (3,  1, '2025-02-10', 95.00),
 (4,  2, '2025-01-09', 45.00),
 (5,  2, '2025-01-22', 60.00),
 (6,  3, '2025-01-15', 200.00),
 (7,  3, '2025-02-02', 175.00),
 (8,  3, '2025-02-20', 310.00),
 (9,  4, '2025-01-28', 55.00);
""",
        "solution": """
WITH ordered AS (
    SELECT customer_id,
           order_date,
           LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_order_date
    FROM orders
)
SELECT customer_id,
       order_date,
       prev_order_date,
       DATEDIFF(day, prev_order_date, order_date) AS days_since_last_order
FROM ordered
WHERE prev_order_date IS NOT NULL
ORDER BY customer_id, order_date;
""",
        "explanation": """
<p><code>LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)</code> retrieves each
customer's previous order date. <code>DATEDIFF(day, prev, curr)</code> then gives the gap in days.
Filtering <code>WHERE prev_order_date IS NOT NULL</code> drops each customer's first order since
there is nothing to compare it against.</p>
""",
        "hints": [
            "LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) gives the previous order date.",
            "DATEDIFF(day, prev_order_date, order_date) computes the gap.",
            "Filter out NULLs — each customer's first order has no previous order.",
        ],
        "order_matters": False,
    },
    {
        "id": "m32",
        "title": "Orders Placed in the Last 30 Days",
        "difficulty": "Medium",
        "category": "Date/Time",
        "companies": ["DoorDash", "Uber Eats", "Postmates"],
        "tsql": True,
        "description": """
<p>The growth team at <strong>NomNom</strong> wants to see all orders placed within the last 30
days relative to <code>2025-03-01</code> (today in this scenario), along with customer names.</p>
<p><strong>Return columns:</strong> <code>order_id</code>, <code>customer_name</code>,
<code>order_date</code>, <code>amount</code> — ordered by order_date descending.</p>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL
);
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    amount      DECIMAL(10,2) NOT NULL
);
INSERT INTO customers VALUES (1,'Rosa Linden'),(2,'Max Okada'),(3,'Ines Farah'),(4,'Coby Mitchell');
INSERT INTO orders VALUES
 (1, 1, '2025-01-15',  89.00),
 (2, 2, '2025-01-28', 134.00),
 (3, 1, '2025-02-03',  55.00),
 (4, 3, '2025-02-10', 210.00),
 (5, 4, '2025-02-14',  77.00),
 (6, 2, '2025-02-18',  92.00),
 (7, 1, '2025-02-22', 145.00),
 (8, 3, '2025-02-27',  38.00),
 (9, 4, '2025-03-01',  60.00);
""",
        "solution": """
SELECT o.order_id,
       c.name AS customer_name,
       o.order_date,
       o.amount
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.order_date >= DATEADD(day, -30, CAST('2025-03-01' AS DATE))
ORDER BY o.order_date DESC;
""",
        "explanation": """
<p><code>DATEADD(day, -30, CAST('2025-03-01' AS DATE))</code> computes 30 days before the
reference date. In production you would use <code>GETDATE()</code> or <code>GETUTCDATE()</code>
instead of a hard-coded date. Using <code>&gt;=</code> rather than <code>&gt;</code> includes
orders placed exactly 30 days ago — whether to include the boundary is a real product question
to clarify with the interviewer.</p>
""",
        "hints": [
            "DATEADD(day, -30, '2025-03-01') gives the cutoff date.",
            "Use >= to include orders placed exactly 30 days before the reference date.",
            "In production replace the hard-coded date with GETDATE().",
        ],
        "order_matters": False,
    },
    {
        "id": "m33",
        "title": "Customer Age at First Purchase",
        "difficulty": "Medium",
        "category": "Date/Time",
        "companies": ["Spotify", "Netflix", "Hulu"],
        "tsql": True,
        "description": """
<p>The data science team at <strong>Streamly</strong> wants to build an age-at-acquisition
feature. For each customer who has placed at least one order, return their age (in years) at
the date of their first purchase.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>birth_date</code>,
<code>first_purchase_date</code>, <code>age_at_first_purchase</code> — ordered by
age_at_first_purchase ascending.</p>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    birth_date  DATE NOT NULL
);
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL
);
INSERT INTO customers VALUES
 (1, 'Liam Torres',    '1998-06-14'),
 (2, 'Ava Okafor',     '1985-11-30'),
 (3, 'Noah Williams',  '2000-03-22'),
 (4, 'Emma Suzuki',    '1992-08-05'),
 (5, 'Oliver Reyes',   '1978-01-17');
INSERT INTO orders VALUES
 (1, 1, '2024-07-10'),
 (2, 1, '2024-09-15'),
 (3, 2, '2024-01-05'),
 (4, 3, '2024-04-20'),
 (5, 4, '2024-03-01'),
 (6, 4, '2024-11-11'),
 (7, 5, '2024-06-30');
""",
        "solution": """
SELECT c.name,
       c.birth_date,
       MIN(o.order_date) AS first_purchase_date,
       DATEDIFF(year, c.birth_date, MIN(o.order_date)) AS age_at_first_purchase
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_id, c.name, c.birth_date
ORDER BY age_at_first_purchase;
""",
        "explanation": """
<p><code>MIN(o.order_date)</code> inside the aggregate gives the first purchase date per customer.
<code>DATEDIFF(year, birth_date, first_purchase_date)</code> computes whole years elapsed — note
this counts year-boundary crossings, not whether the birthday has occurred yet in that year.
For precise age use <code>DATEDIFF(year, ...)</code> minus a correction for whether the birthday
has passed.</p>
""",
        "hints": [
            "MIN(order_date) per customer gives the first purchase date.",
            "DATEDIFF(year, birth_date, first_purchase_date) gives approximate age in years.",
            "You must GROUP BY all non-aggregated customer columns.",
        ],
        "order_matters": False,
    },
    # ── Deduplication ───────────────────────────────────────────────────────
    {
        "id": "m34",
        "title": "Most Recent Order per Customer",
        "difficulty": "Medium",
        "category": "Deduplication",
        "companies": ["Amazon", "Walmart", "Target"],
        "tsql": True,
        "description": """
<p>Customer success at <strong>CartCo</strong> wants the most recent order for each customer —
one row per customer, keeping the order with the latest <code>order_date</code>. If two orders
share the same date, keep the one with the higher <code>order_id</code>.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>order_id</code>,
<code>order_date</code>, <code>amount</code> — ordered by order_date descending.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    amount      DECIMAL(10,2) NOT NULL
);
INSERT INTO orders VALUES
 (1,  1, '2025-01-10', 120.00),
 (2,  1, '2025-02-14',  88.50),
 (3,  1, '2025-02-14', 200.00),
 (4,  2, '2025-01-22',  45.00),
 (5,  2, '2025-02-05',  60.00),
 (6,  3, '2025-01-30', 310.00),
 (7,  4, '2025-02-18',  75.00),
 (8,  4, '2025-01-05',  90.00);
""",
        "solution": """
WITH ranked AS (
    SELECT customer_id, order_id, order_date, amount,
           ROW_NUMBER() OVER (
               PARTITION BY customer_id
               ORDER BY order_date DESC, order_id DESC
           ) AS rn
    FROM orders
)
SELECT customer_id, order_id, order_date, amount
FROM ranked
WHERE rn = 1
ORDER BY order_date DESC;
""",
        "explanation": """
<p><code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC)</code>
assigns rank 1 to the most recent order per customer, breaking ties by the higher order_id.
Filtering <code>WHERE rn = 1</code> keeps exactly one row per customer. This is the canonical
"latest record per entity" pattern in DE work — memorise it.</p>
""",
        "hints": [
            "PARTITION BY customer_id restarts the numbering per customer.",
            "ORDER BY order_date DESC, order_id DESC puts the latest (and highest ID on ties) first.",
            "WHERE rn = 1 keeps exactly one row per customer.",
        ],
        "order_matters": False,
    },
    {
        "id": "m35",
        "title": "Deduplicate Users by Email",
        "difficulty": "Medium",
        "category": "Deduplication",
        "companies": ["HubSpot", "Salesforce", "Mailchimp"],
        "tsql": True,
        "description": """
<p>A data import at <strong>LeadGen Co</strong> created duplicate user accounts sharing the same
email address. Keep the earliest-created account per email and return only those canonical records.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>email</code>,
<code>created_at</code> — ordered by email ascending.</p>
""",
        "schema": """
CREATE TABLE users (
    user_id    INT PRIMARY KEY,
    email      VARCHAR(100) NOT NULL,
    name       VARCHAR(100) NOT NULL,
    created_at DATE NOT NULL
);
INSERT INTO users VALUES
 (1,  'alice@acme.com',  'Alice A', '2024-01-10'),
 (2,  'bob@acme.com',    'Bob B',   '2024-02-05'),
 (3,  'alice@acme.com',  'Alice Z', '2024-03-15'),
 (4,  'carol@acme.com',  'Carol C', '2024-01-22'),
 (5,  'bob@acme.com',    'Bob Q',   '2024-04-01'),
 (6,  'dave@acme.com',   'Dave D',  '2024-02-28'),
 (7,  'alice@acme.com',  'Alice M', '2024-05-09');
""",
        "solution": """
WITH ranked AS (
    SELECT user_id, email, created_at,
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at, user_id) AS rn
    FROM users
)
SELECT user_id, email, created_at
FROM ranked
WHERE rn = 1
ORDER BY email;
""",
        "explanation": """
<p><code>PARTITION BY email ORDER BY created_at, user_id</code> numbers accounts within each
email group, earliest first (using user_id as tiebreaker). <code>WHERE rn = 1</code> keeps only
the canonical account. The tiebreaker on <code>user_id</code> makes the deduplication
deterministic when two accounts share the same <code>created_at</code>.</p>
""",
        "hints": [
            "PARTITION BY email groups accounts by email address.",
            "ORDER BY created_at ASC (oldest first) so rn=1 is the earliest account.",
            "Add user_id as a tiebreaker so the result is deterministic.",
        ],
        "order_matters": False,
    },
    {
        "id": "m36",
        "title": "Current SCD Type 2 Record",
        "difficulty": "Medium",
        "category": "Deduplication",
        "companies": ["Snowflake", "Databricks", "dbt"],
        "tsql": True,
        "description": """
<p><strong>DataVault Co</strong> stores customer plan history using Slowly Changing Dimension
Type 2 — each change creates a new row with a <code>valid_from</code> date, while the current
record has <code>valid_to = NULL</code>.</p>
<p>Return each customer's current active record.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>name</code>,
<code>plan_tier</code>, <code>valid_from</code> — ordered by customer_id.</p>
""",
        "schema": """
CREATE TABLE customer_history (
    history_id  INT PRIMARY KEY,
    customer_id INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    plan_tier   VARCHAR(50) NOT NULL,
    valid_from  DATE NOT NULL,
    valid_to    DATE
);
INSERT INTO customer_history VALUES
 (1, 1, 'Alice',  'free',       '2024-01-01', '2024-06-01'),
 (2, 1, 'Alice',  'standard',   '2024-06-01', '2024-11-01'),
 (3, 1, 'Alice',  'premium',    '2024-11-01', NULL),
 (4, 2, 'Bob',    'free',       '2024-03-01', '2024-09-01'),
 (5, 2, 'Bob',    'standard',   '2024-09-01', NULL),
 (6, 3, 'Carol',  'premium',    '2024-02-01', NULL);
""",
        "solution": """
SELECT customer_id, name, plan_tier, valid_from
FROM customer_history
WHERE valid_to IS NULL
ORDER BY customer_id;
""",
        "explanation": """
<p>In a well-formed SCD2 table, exactly one row per entity has <code>valid_to IS NULL</code> —
the currently active record. This simple filter is O(n) and index-friendly. An alternative is
<code>ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY valid_from DESC) = 1</code>, which
handles tables where <code>valid_to</code> may never be NULL but is useful when the SCD2 is
"closed" (all rows have end dates) and you want the last one.</p>
""",
        "hints": [
            "In SCD2, the current record is the one with valid_to IS NULL.",
            "This is a simple WHERE filter — no window function needed if the table is well-formed.",
            "Alternative: ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY valid_from DESC) = 1.",
        ],
        "order_matters": False,
    },
    # ── Gaps & Islands ──────────────────────────────────────────────────────
    {
        "id": "m37",
        "title": "Current Login Streak per User",
        "difficulty": "Medium",
        "category": "Gaps & Islands",
        "companies": ["Duolingo", "Strava", "Headspace"],
        "tsql": True,
        "description": """
<p><strong>LearnLoop</strong> awards streak badges. For each user, compute their <em>current</em>
login streak — the number of consecutive calendar days ending on their most recent login date.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>streak_start</code>,
<code>streak_end</code>, <code>current_streak</code> — ordered by current_streak descending.</p>
""",
        "schema": """
CREATE TABLE logins (
    login_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    login_date DATE NOT NULL
);
INSERT INTO logins VALUES
 (1,  1, '2025-01-10'), (2,  1, '2025-01-11'), (3,  1, '2025-01-12'),
 (4,  1, '2025-01-13'), (5,  1, '2025-01-14'),
 (6,  2, '2025-01-08'), (7,  2, '2025-01-09'),
 (8,  2, '2025-01-12'), (9,  2, '2025-01-13'), (10, 2, '2025-01-14'),
 (11, 3, '2025-01-01'), (12, 3, '2025-01-02'), (13, 3, '2025-01-14');
""",
        "solution": """
WITH daily AS (
    SELECT DISTINCT user_id, login_date FROM logins
),
anchored AS (
    SELECT user_id, login_date,
           DATEDIFF(day, '2000-01-01', login_date)
               - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS grp
    FROM daily
),
islands AS (
    SELECT user_id, grp,
           MIN(login_date) AS streak_start,
           MAX(login_date) AS streak_end,
           COUNT(*)        AS streak_len
    FROM anchored
    GROUP BY user_id, grp
),
last_login AS (
    SELECT user_id, MAX(login_date) AS last_date FROM daily GROUP BY user_id
)
SELECT i.user_id, i.streak_start, i.streak_end, i.streak_len AS current_streak
FROM islands i
JOIN last_login l ON l.user_id = i.user_id AND l.last_date = i.streak_end
ORDER BY current_streak DESC;
""",
        "explanation": """
<p>The gaps-and-islands trick: subtracting a sequential row number from the date (as a day count)
gives the same constant for every date in a consecutive run — that constant becomes the group key.
Only the island whose <code>streak_end</code> equals the user's most recent login date is the
<em>current</em> streak. User 3 has two islands; only the second one (ending 2025-01-14) is
returned.</p>
""",
        "hints": [
            "Deduplicate logins to one row per user per date first.",
            "date_as_number - ROW_NUMBER() is constant for consecutive dates — use it as a group key.",
            "Join back to last login date to keep only the island touching today.",
        ],
        "order_matters": False,
    },
    {
        "id": "m38",
        "title": "Missing Sales Dates",
        "difficulty": "Medium",
        "category": "Gaps & Islands",
        "companies": ["Walmart", "Target", "Kroger"],
        "tsql": True,
        "description": """
<p>The data quality team at <strong>RetailCore</strong> needs to find every calendar date between
the first and last sale date that has <em>no</em> sales record — these are gaps in the pipeline
that need investigation.</p>
<p><strong>Return column:</strong> <code>missing_date</code> — ordered ascending.</p>
""",
        "schema": """
CREATE TABLE daily_sales (
    sale_date DATE PRIMARY KEY,
    revenue   DECIMAL(10,2) NOT NULL
);
INSERT INTO daily_sales VALUES
 ('2025-01-01', 1200.00),
 ('2025-01-02',  980.00),
 ('2025-01-04', 1500.00),
 ('2025-01-05', 1100.00),
 ('2025-01-08',  870.00),
 ('2025-01-09', 2100.00),
 ('2025-01-10',  960.00);
""",
        "solution": """
WITH bounds AS (
    SELECT MIN(sale_date) AS start_date, MAX(sale_date) AS end_date FROM daily_sales
),
spine AS (
    SELECT DATEADD(day, n.number, b.start_date) AS dt
    FROM bounds b
    CROSS JOIN (
        SELECT TOP 1000 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS number
        FROM sys.all_objects
    ) n
    WHERE DATEADD(day, n.number, b.start_date) <= b.end_date
)
SELECT spine.dt AS missing_date
FROM spine
LEFT JOIN daily_sales ds ON ds.sale_date = spine.dt
WHERE ds.sale_date IS NULL
ORDER BY missing_date;
""",
        "explanation": """
<p>Generate a complete date spine between the first and last sale date using a tally-table trick:
<code>ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1</code> creates sequential integers 0, 1, 2 …,
and <code>DATEADD(day, n, start)</code> converts each integer to a date. LEFT JOIN to the actual
sales table and filter <code>WHERE sales.date IS NULL</code> to surface the missing dates.</p>
""",
        "hints": [
            "Generate a date spine using ROW_NUMBER() + DATEADD to cover every calendar day.",
            "LEFT JOIN the spine to actual sales; WHERE sale_date IS NULL reveals the gaps.",
            "sys.all_objects typically has thousands of rows — enough for any reasonable date range.",
        ],
        "order_matters": True,
    },
    # ── Retention & Cohorts ─────────────────────────────────────────────────
    {
        "id": "m39",
        "title": "7-Day Retention Rate by Signup Date",
        "difficulty": "Medium",
        "category": "Retention & Cohorts",
        "companies": ["Meta", "TikTok", "Snap"],
        "tsql": True,
        "description": """
<p>Product at <strong>Chirper</strong> tracks Day-7 retention: the fraction of users who return
to the app within 7 days of signing up (days 1–7 inclusive).</p>
<p>For each signup date, return the cohort size and the Day-7 retention rate.</p>
<p><strong>Return columns:</strong> <code>signup_date</code>, <code>cohort_size</code>,
<code>retained_d7</code>, <code>retention_pct</code> (rounded to 2 dp) — ordered by signup_date.</p>
""",
        "schema": """
CREATE TABLE users (
    user_id    INT PRIMARY KEY,
    signup_date DATE NOT NULL
);
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    event_date DATE NOT NULL
);
INSERT INTO users VALUES
 (1,'2025-01-01'),(2,'2025-01-01'),(3,'2025-01-01'),(4,'2025-01-01'),
 (5,'2025-01-02'),(6,'2025-01-02'),(7,'2025-01-02'),
 (8,'2025-01-03'),(9,'2025-01-03'),(10,'2025-01-03');
INSERT INTO events VALUES
 (1,1,'2025-01-04'),(2,2,'2025-01-07'),(3,4,'2025-01-06'),
 (4,5,'2025-01-05'),(5,6,'2025-01-09'),
 (6,8,'2025-01-05'),(7,9,'2025-01-10'),(8,10,'2025-01-03');
""",
        "solution": """
WITH cohort AS (
    SELECT u.user_id, u.signup_date,
           MAX(CASE WHEN DATEDIFF(day, u.signup_date, e.event_date) BETWEEN 1 AND 7 THEN 1 ELSE 0 END)
               AS retained_d7
    FROM users u
    LEFT JOIN events e ON e.user_id = u.user_id
    GROUP BY u.user_id, u.signup_date
)
SELECT signup_date,
       COUNT(*) AS cohort_size,
       SUM(retained_d7) AS retained_d7,
       ROUND(SUM(retained_d7) * 100.0 / COUNT(*), 2) AS retention_pct
FROM cohort
GROUP BY signup_date
ORDER BY signup_date;
""",
        "explanation": """
<p>The inner CTE computes a per-user binary flag: did this user return on days 1–7 after signup?
<code>MAX(CASE WHEN ...)</code> collapses multiple events per user to a single 1 or 0.
LEFT JOIN is critical — users who never returned must still appear in the cohort (with a 0),
otherwise they would be silently excluded and the rate would be artificially inflated.</p>
""",
        "hints": [
            "LEFT JOIN events to keep users who never returned.",
            "DATEDIFF(day, signup_date, event_date) BETWEEN 1 AND 7 identifies Day-7 returners.",
            "MAX(CASE WHEN ...) collapses multiple events per user to a 0/1 flag.",
        ],
        "order_matters": False,
    },
    {
        "id": "m40",
        "title": "Weekly Active Users",
        "difficulty": "Medium",
        "category": "Retention & Cohorts",
        "companies": ["Meta", "Twitter", "LinkedIn"],
        "tsql": True,
        "description": """
<p>Product Analytics at <strong>Pulse</strong> tracks Weekly Active Users (WAU) — the number of
distinct users with at least one event in each calendar week.</p>
<p><strong>Return columns:</strong> <code>yr</code>, <code>wk</code>, <code>wau</code> — ordered
by yr, wk ascending.</p>
""",
        "schema": """
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    event_date DATE NOT NULL
);
INSERT INTO events VALUES
 (1,101,'2025-01-06'),(2,102,'2025-01-07'),(3,101,'2025-01-08'),(4,103,'2025-01-09'),
 (5,101,'2025-01-13'),(6,104,'2025-01-14'),(7,102,'2025-01-15'),(8,103,'2025-01-16'),(9,105,'2025-01-16'),
 (10,101,'2025-01-20'),(11,106,'2025-01-21'),(12,104,'2025-01-22'),
 (13,102,'2025-01-27'),(14,101,'2025-01-28'),(15,107,'2025-01-29'),(16,105,'2025-01-30');
""",
        "solution": """
SELECT DATEPART(year, event_date) AS yr,
       DATEPART(week, event_date) AS wk,
       COUNT(DISTINCT user_id)    AS wau
FROM events
GROUP BY DATEPART(year, event_date), DATEPART(week, event_date)
ORDER BY yr, wk;
""",
        "explanation": """
<p><code>COUNT(DISTINCT user_id)</code> counts unique users per week regardless of how many events
they triggered. <code>DATEPART(week, date)</code> extracts the ISO-like week number from the date.
This is the foundational WAU query — in production it is often extended with a rolling 7-day window
using window functions to avoid week-boundary artefacts.</p>
""",
        "hints": [
            "DATEPART(week, event_date) extracts the week number.",
            "COUNT(DISTINCT user_id) counts each user once per week.",
            "GROUP BY both year and week to handle multi-year data correctly.",
        ],
        "order_matters": True,
    },
    # ── Filtering & NULL ────────────────────────────────────────────────────
    {
        "id": "m41",
        "title": "Employees Without a Manager",
        "difficulty": "Medium",
        "category": "Filtering & NULL",
        "companies": ["Oracle", "SAP", "Workday"],
        "tsql": True,
        "description": """
<p>The HR system at <strong>Pinnacle Corp</strong> stores <code>manager_id = NULL</code> for
employees at the top of the hierarchy. Return all employees who report to no one.</p>
<p><strong>Return columns:</strong> <code>emp_id</code>, <code>name</code>,
<code>department</code>, <code>hire_date</code> — ordered by name.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    manager_id INT,
    hire_date  DATE NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Sarah Lin',    'Executive',   NULL, '2018-03-01'),
 (2, 'Tom Reyes',    'Engineering', 1,    '2019-07-15'),
 (3, 'Nadia Patel',  'Engineering', 2,    '2020-01-10'),
 (4, 'Chloe Ortega', 'Sales',       1,    '2019-11-20'),
 (5, 'Marcus Webb',  'Sales',       4,    '2021-05-03'),
 (6, 'Jin Park',     'Finance',     NULL, '2018-09-01'),
 (7, 'Rosa Lima',    'Finance',     6,    '2022-02-14');
""",
        "solution": """
SELECT emp_id, name, department, hire_date
FROM employees
WHERE manager_id IS NULL
ORDER BY name;
""",
        "explanation": """
<p><code>IS NULL</code> is the correct predicate — <code>= NULL</code> always evaluates to
UNKNOWN in SQL and returns no rows. Two employees have no manager here: Sarah Lin (CEO) and Jin
Park (CFO). In interviews, always say "IS NULL" explicitly and explain why <code>= NULL</code>
never works.</p>
""",
        "hints": [
            "Use IS NULL — not = NULL. = NULL is always UNKNOWN in SQL.",
            "NULL represents the absence of a value, not the value NULL itself.",
        ],
        "order_matters": False,
    },
    {
        "id": "m42",
        "title": "First Non-NULL Contact Method",
        "difficulty": "Medium",
        "category": "Filtering & NULL",
        "companies": ["Salesforce", "HubSpot", "Zendesk"],
        "tsql": True,
        "description": """
<p>The CRM at <strong>ConnectCo</strong> stores multiple contact fields per customer. Return each
customer's preferred contact method — the first non-NULL value across mobile, home phone, work
phone, then email — and label which field was used.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>name</code>,
<code>preferred_contact</code>, <code>contact_type</code> — ordered by name.</p>
""",
        "schema": """
CREATE TABLE customers (
    customer_id  INT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    mobile_phone VARCHAR(20),
    home_phone   VARCHAR(20),
    work_phone   VARCHAR(20),
    email        VARCHAR(100)
);
INSERT INTO customers VALUES
 (1, 'Alice Brown',  '555-0101', NULL,       NULL,       'alice@co.com'),
 (2, 'Bob Chen',     NULL,       '555-0202', NULL,       'bob@co.com'),
 (3, 'Clara Davis',  NULL,       NULL,       '555-0303', 'clara@co.com'),
 (4, 'Daniel Evans', NULL,       NULL,       NULL,       'daniel@co.com'),
 (5, 'Elena Flores', '555-0505', '555-0506', '555-0507', 'elena@co.com');
""",
        "solution": """
SELECT customer_id, name,
       COALESCE(mobile_phone, home_phone, work_phone, email) AS preferred_contact,
       CASE
           WHEN mobile_phone IS NOT NULL THEN 'mobile'
           WHEN home_phone   IS NOT NULL THEN 'home'
           WHEN work_phone   IS NOT NULL THEN 'work'
           ELSE 'email'
       END AS contact_type
FROM customers
ORDER BY name;
""",
        "explanation": """
<p><code>COALESCE(a, b, c, d)</code> returns the first non-NULL argument — it short-circuits,
so it is also efficient. The parallel <code>CASE</code> expression labels which source was used.
You cannot use <code>COALESCE</code> alone to get the label because it only returns the value,
not which branch fired. This pattern (COALESCE for the value + CASE for the label) is common in
data cleaning pipelines.</p>
""",
        "hints": [
            "COALESCE(a, b, c, d) returns the first non-NULL — ordered by priority.",
            "Use a parallel CASE expression to label which field was chosen.",
        ],
        "order_matters": False,
    },
    {
        "id": "m43",
        "title": "Orders With Incomplete Shipping Address",
        "difficulty": "Medium",
        "category": "Filtering & NULL",
        "companies": ["FedEx", "UPS", "USPS"],
        "tsql": True,
        "description": """
<p>The fulfilment team at <strong>SwiftShip</strong> cannot process orders that are missing one or
more address fields. Find all such orders and show the missing fields replaced by
<code>'(missing)'</code> so the ops team can see exactly what is absent.</p>
<p><strong>Return columns:</strong> <code>order_id</code>, <code>customer_id</code>,
<code>street</code>, <code>city</code>, <code>zip_code</code> — ordered by order_id.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date  DATE NOT NULL,
    street      VARCHAR(200),
    city        VARCHAR(100),
    zip_code    VARCHAR(10)
);
INSERT INTO orders VALUES
 (1, 1, '2025-01-05', '123 Main St',  'Austin',   '78701'),
 (2, 2, '2025-01-07', NULL,           'Denver',   '80201'),
 (3, 3, '2025-01-09', '456 Oak Ave',  NULL,       '90210'),
 (4, 4, '2025-01-10', '789 Pine Rd',  'Seattle',  NULL),
 (5, 5, '2025-01-12', NULL,           NULL,       '10001'),
 (6, 6, '2025-01-14', '321 Elm St',   'Chicago',  '60601');
""",
        "solution": """
SELECT order_id,
       customer_id,
       ISNULL(street,   '(missing)') AS street,
       ISNULL(city,     '(missing)') AS city,
       ISNULL(zip_code, '(missing)') AS zip_code
FROM orders
WHERE street IS NULL OR city IS NULL OR zip_code IS NULL
ORDER BY order_id;
""",
        "explanation": """
<p><code>WHERE street IS NULL OR city IS NULL OR zip_code IS NULL</code> catches rows where
<em>any</em> address field is missing. <code>ISNULL(col, '(missing)')</code> replaces NULLs with
a readable placeholder in the output — useful for operational dashboards where data-entry staff
need to see what is blank. In T-SQL, <code>ISNULL</code> takes exactly 2 arguments;
<code>COALESCE</code> accepts any number.</p>
""",
        "hints": [
            "Filter WHERE any address field IS NULL.",
            "ISNULL(col, '(missing)') replaces NULL with a label in the output.",
        ],
        "order_matters": False,
    },
    # ── Data Quality ────────────────────────────────────────────────────────
    {
        "id": "m44",
        "title": "Orphaned Order Items",
        "difficulty": "Medium",
        "category": "Data Quality",
        "companies": ["Amazon", "Shopify", "Etsy"],
        "tsql": True,
        "description": """
<p>A truncated load at <strong>CartCo</strong> left <code>order_items</code> rows referencing
orders that no longer exist in the <code>orders</code> table. Find all orphaned items.</p>
<p><strong>Return columns:</strong> <code>item_id</code>, <code>order_id</code>,
<code>product_id</code>, <code>quantity</code> — ordered by item_id.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INT PRIMARY KEY,
    order_date DATE NOT NULL
);
CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL
);
INSERT INTO orders VALUES (1001,'2025-01-05'),(1002,'2025-01-06'),(1003,'2025-01-07');
INSERT INTO order_items VALUES
 (1, 1001, 101, 2),
 (2, 1001, 102, 1),
 (3, 1002, 103, 3),
 (4, 1004, 104, 1),
 (5, 1005, 101, 2),
 (6, 1003, 102, 1);
""",
        "solution": """
SELECT oi.item_id, oi.order_id, oi.product_id, oi.quantity
FROM order_items oi
LEFT JOIN orders o ON o.order_id = oi.order_id
WHERE o.order_id IS NULL
ORDER BY oi.item_id;
""",
        "explanation": """
<p>A LEFT JOIN from <code>order_items</code> to <code>orders</code> keeps every item row; when
no matching order exists, all order columns are NULL. <code>WHERE o.order_id IS NULL</code>
isolates the orphans. This data quality check should run after every load that truncates the
orders table.</p>
""",
        "hints": [
            "LEFT JOIN order_items → orders; NULL on the order side means the reference is broken.",
            "Alternatively use NOT EXISTS — both are equivalent for anti-join checks.",
        ],
        "order_matters": False,
    },
    {
        "id": "m45",
        "title": "Accounts Sharing a Phone Number",
        "difficulty": "Medium",
        "category": "Data Quality",
        "companies": ["Twilio", "Vonage", "Bandwidth"],
        "tsql": True,
        "description": """
<p>The fraud team at <strong>SafeWallet</strong> wants to flag phone numbers linked to more than
one account — a common signal for account farming.</p>
<p><strong>Return columns:</strong> <code>phone_number</code>, <code>account_count</code>,
<code>account_ids</code> (comma-separated list) — ordered by account_count descending.</p>
""",
        "schema": """
CREATE TABLE accounts (
    account_id   INT PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20)
);
INSERT INTO accounts VALUES
 (1,  'Alice A',  '555-0101'),
 (2,  'Bob B',    '555-0202'),
 (3,  'Carol C',  '555-0101'),
 (4,  'Dave D',   '555-0303'),
 (5,  'Eve E',    '555-0202'),
 (6,  'Frank F',  '555-0101'),
 (7,  'Grace G',  '555-0404'),
 (8,  'Hank H',   NULL);
""",
        "solution": """
SELECT phone_number,
       COUNT(*)  AS account_count,
       STRING_AGG(CAST(account_id AS VARCHAR), ', ')
           WITHIN GROUP (ORDER BY account_id) AS account_ids
FROM accounts
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY account_count DESC;
""",
        "explanation": """
<p><code>STRING_AGG(value, separator) WITHIN GROUP (ORDER BY ...)</code> is the T-SQL aggregate
that concatenates values into a delimited string. The <code>WHERE phone_number IS NOT NULL</code>
guard is essential — NULL phone numbers must not be grouped together as if they represent the same
number. <code>HAVING COUNT(*) &gt; 1</code> keeps only multi-account phone numbers.</p>
""",
        "hints": [
            "GROUP BY phone_number, HAVING COUNT(*) > 1 finds shared numbers.",
            "STRING_AGG(CAST(account_id AS VARCHAR), ', ') WITHIN GROUP (ORDER BY account_id) builds the list.",
            "Filter WHERE phone_number IS NOT NULL before grouping.",
        ],
        "order_matters": False,
    },
]

EXPANSION_HARD = [
    # ── Window Functions ────────────────────────────────────────────────────
    {
        "id": "h15",
        "title": "Year-over-Year Revenue by Category",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Amazon", "Microsoft", "Google"],
        "tsql": True,
        "description": """
<p>Finance at <strong>RetailCore</strong> tracks yearly revenue by product category and wants to
see how each category grew (or shrank) versus the prior year.</p>
<p>Return one row per category per year (only for years that have a prior year to compare),
showing the revenue, prior-year revenue, and the YoY growth percentage.</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>yr</code>,
<code>annual_revenue</code>, <code>prev_year_revenue</code>, <code>yoy_growth_pct</code>
(rounded to 2 dp) — ordered by category, yr.</p>
""",
        "schema": """
CREATE TABLE product_sales (
    sale_id   INT PRIMARY KEY,
    category  VARCHAR(50) NOT NULL,
    revenue   DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL
);
INSERT INTO product_sales VALUES
 (1,'Electronics',4200.00,'2023-03-15'),(2,'Electronics',3800.00,'2023-09-20'),
 (3,'Electronics',5100.00,'2024-02-10'),(4,'Electronics',4600.00,'2024-11-05'),
 (5,'Clothing',1800.00,'2023-04-12'),(6,'Clothing',2200.00,'2023-10-08'),
 (7,'Clothing',2600.00,'2024-03-22'),(8,'Clothing',3100.00,'2024-08-17'),
 (9,'Home',1200.00,'2023-05-01'),(10,'Home',1400.00,'2023-12-15'),
 (11,'Home',1100.00,'2024-04-09'),(12,'Home',1900.00,'2024-09-30');
""",
        "solution": """
WITH yearly AS (
    SELECT category,
           YEAR(sale_date)  AS yr,
           SUM(revenue)     AS annual_revenue
    FROM product_sales
    GROUP BY category, YEAR(sale_date)
),
with_lag AS (
    SELECT category, yr, annual_revenue,
           LAG(annual_revenue) OVER (PARTITION BY category ORDER BY yr) AS prev_year_revenue
    FROM yearly
)
SELECT category, yr, annual_revenue, prev_year_revenue,
       ROUND((annual_revenue - prev_year_revenue) * 100.0
             / NULLIF(prev_year_revenue, 0), 2) AS yoy_growth_pct
FROM with_lag
WHERE prev_year_revenue IS NOT NULL
ORDER BY category, yr;
""",
        "explanation": """
<p><code>LAG() OVER (PARTITION BY category ORDER BY yr)</code> pulls the previous year's revenue
for each category independently. <code>NULLIF(prev_year_revenue, 0)</code> prevents
division-by-zero when a category had zero revenue in the prior year. The outer
<code>WHERE prev_year_revenue IS NOT NULL</code> drops the first year per category since there
is nothing to compare it to.</p>
""",
        "hints": [
            "Aggregate by category and year first, then apply LAG in a second CTE.",
            "PARTITION BY category ensures LAG looks back within the same category.",
            "NULLIF(prev, 0) prevents division-by-zero if prior revenue was zero.",
        ],
        "order_matters": False,
    },
    {
        "id": "h16",
        "title": "Top vs Bottom Spender Deciles",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Stripe", "PayPal", "Square"],
        "tsql": True,
        "description": """
<p>The revenue team at <strong>ClearPay</strong> wants to quantify how much more the top-spending
customers spend versus the bottom tier.</p>
<p>Using <code>NTILE(10)</code>, bucket customers by total spend. Return a single row with:
the average spend of the top decile (decile 10), the average spend of the bottom decile (decile 1),
and the ratio (top ÷ bottom), rounded to 2 decimal places.</p>
<p><strong>Return columns:</strong> <code>avg_top_decile</code>, <code>avg_bottom_decile</code>,
<code>ratio</code>.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INT PRIMARY KEY,
    customer_id INT NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    order_date  DATE NOT NULL
);
INSERT INTO orders VALUES
 (1,101,50.00,'2025-01-01'),(2,101,80.00,'2025-01-05'),
 (3,102,200.00,'2025-01-02'),(4,102,150.00,'2025-01-08'),
 (5,103,30.00,'2025-01-03'),
 (6,104,500.00,'2025-01-04'),(7,104,450.00,'2025-01-09'),(8,104,380.00,'2025-01-12'),
 (9,105,25.00,'2025-01-05'),
 (10,106,90.00,'2025-01-06'),
 (11,107,310.00,'2025-01-07'),
 (12,108,15.00,'2025-01-08'),
 (13,109,700.00,'2025-01-09'),(14,109,620.00,'2025-01-14'),
 (15,110,40.00,'2025-01-10'),
 (16,111,180.00,'2025-01-11'),
 (17,112,22.00,'2025-01-12'),
 (18,113,850.00,'2025-01-13'),(19,113,920.00,'2025-01-16'),
 (20,114,60.00,'2025-01-14');
""",
        "solution": """
WITH customer_spend AS (
    SELECT customer_id, SUM(amount) AS total_spent
    FROM orders
    GROUP BY customer_id
),
deciled AS (
    SELECT customer_id, total_spent,
           NTILE(10) OVER (ORDER BY total_spent) AS decile
    FROM customer_spend
)
SELECT ROUND(AVG(CASE WHEN decile = 10 THEN total_spent END), 2) AS avg_top_decile,
       ROUND(AVG(CASE WHEN decile =  1 THEN total_spent END), 2) AS avg_bottom_decile,
       ROUND(AVG(CASE WHEN decile = 10 THEN total_spent END)
             / NULLIF(AVG(CASE WHEN decile = 1 THEN total_spent END), 0), 2) AS ratio
FROM deciled;
""",
        "explanation": """
<p>NTILE(10) partitions customers into 10 equal buckets ordered by total spend. Decile 1 = lowest
spenders, decile 10 = highest. Conditional aggregation with AVG(CASE ...) extracts the averages
for each extreme. The ratio tells you the spend multiplier between the top and bottom of your
customer base.</p>
""",
        "hints": [
            "Aggregate total spend per customer first, then apply NTILE(10).",
            "NTILE(10) with no PARTITION BY ranks across all customers.",
            "AVG(CASE WHEN decile = 10 THEN total_spent END) averages only decile-10 customers.",
        ],
        "order_matters": False,
    },
    {
        "id": "h17",
        "title": "First and Last Event per User",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Amplitude", "Mixpanel", "Segment"],
        "tsql": True,
        "description": """
<p>The analytics team at <strong>EventFlow</strong> wants a one-row summary per user showing their
very first event type, last event type, first event timestamp, last event timestamp, and how many
days they were active between first and last event.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>first_event</code>,
<code>first_event_time</code>, <code>last_event</code>, <code>last_event_time</code>,
<code>active_days</code> — ordered by active_days descending.</p>
""",
        "schema": """
CREATE TABLE user_events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_time VARCHAR(19) NOT NULL
);
INSERT INTO user_events VALUES
 (1, 1,'signup',   '2025-01-01 09:00:00'),
 (2, 1,'purchase', '2025-01-05 14:30:00'),
 (3, 1,'review',   '2025-01-20 11:00:00'),
 (4, 2,'signup',   '2025-01-03 08:00:00'),
 (5, 2,'purchase', '2025-01-03 18:00:00'),
 (6, 3,'signup',   '2025-01-10 10:00:00'),
 (7, 3,'view',     '2025-01-12 15:00:00'),
 (8, 3,'purchase', '2025-01-25 09:30:00'),
 (9, 3,'refund',   '2025-02-01 12:00:00');
""",
        "solution": """
WITH bounds AS (
    SELECT DISTINCT
           user_id,
           FIRST_VALUE(event_type) OVER (PARTITION BY user_id ORDER BY event_time)
               AS first_event,
           FIRST_VALUE(event_time) OVER (PARTITION BY user_id ORDER BY event_time)
               AS first_event_time,
           FIRST_VALUE(event_type) OVER (PARTITION BY user_id ORDER BY event_time DESC)
               AS last_event,
           FIRST_VALUE(event_time) OVER (PARTITION BY user_id ORDER BY event_time DESC)
               AS last_event_time
    FROM user_events
)
SELECT user_id, first_event, first_event_time, last_event, last_event_time,
       DATEDIFF(day, CAST(first_event_time AS DATE), CAST(last_event_time AS DATE))
           AS active_days
FROM bounds
ORDER BY active_days DESC;
""",
        "explanation": """
<p>The double-FIRST_VALUE trick: run <code>FIRST_VALUE</code> once with ascending order (gives
the earliest event) and once with descending order (gives the latest). <code>DISTINCT</code>
collapses the per-row repetition down to one row per user. Avoid <code>LAST_VALUE</code> —
its default frame (<code>RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW</code>) stops at the
current row, not the partition end, so it never returns the actual last value unless you add
<code>ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING</code>.</p>
""",
        "hints": [
            "Use FIRST_VALUE twice: once ORDER BY event_time ASC, once ORDER BY event_time DESC.",
            "DISTINCT collapses the repeated window values to one row per user.",
            "Avoid LAST_VALUE — its default frame stops at the current row.",
        ],
        "order_matters": False,
    },
    # ── Joins ───────────────────────────────────────────────────────────────
    {
        "id": "h18",
        "title": "Friend-of-a-Friend Connections",
        "difficulty": "Hard",
        "category": "Joins",
        "companies": ["LinkedIn", "Meta", "Twitter"],
        "tsql": True,
        "description": """
<p><strong>ConnectSphere</strong> wants to surface 2nd-degree connections — users you are not
directly friends with but share a mutual friend.</p>
<p>For each user, return every 2nd-degree connection (not already a direct friend and not the
user themselves), and the minimum degree of connection.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>connection_id</code>,
<code>degree</code> — ordered by user_id, degree, connection_id.</p>
""",
        "schema": """
CREATE TABLE friendships (
    user_id   INT NOT NULL,
    friend_id INT NOT NULL,
    PRIMARY KEY (user_id, friend_id)
);
INSERT INTO friendships VALUES
 (1,2),(2,1),(1,3),(3,1),(2,4),(4,2),(3,5),(5,3),(4,5),(5,4),(5,6),(6,5);
""",
        "solution": """
WITH direct AS (
    SELECT user_id, friend_id, 1 AS degree FROM friendships
),
second AS (
    SELECT d1.user_id, d2.friend_id AS connection_id, 2 AS degree
    FROM direct d1
    JOIN direct d2 ON d2.user_id = d1.friend_id
    WHERE d2.friend_id <> d1.user_id
      AND NOT EXISTS (
          SELECT 1 FROM direct df
          WHERE df.user_id = d1.user_id AND df.friend_id = d2.friend_id
      )
)
SELECT user_id, connection_id, MIN(degree) AS degree
FROM second
GROUP BY user_id, connection_id
ORDER BY user_id, degree, connection_id;
""",
        "explanation": """
<p>Join the friendships table to itself: for each friend-of-a-friend path (user → friend → stranger),
exclude direct connections (NOT EXISTS) and self-loops (<code>d2.friend_id &lt;&gt; d1.user_id</code>).
<code>MIN(degree)</code> handles the case where two paths of the same degree reach the same
connection. Recursive CTEs can generalise this to N degrees, but a two-level join is cleaner for
exactly 2nd-degree.</p>
""",
        "hints": [
            "Self-join friendships twice: user→friend, then friend→stranger.",
            "Exclude direct connections with NOT EXISTS.",
            "Exclude self (d2.friend_id != d1.user_id).",
        ],
        "order_matters": False,
    },
    {
        "id": "h19",
        "title": "Bill of Materials Explosion",
        "difficulty": "Hard",
        "category": "Joins",
        "companies": ["Boeing", "Siemens", "Caterpillar"],
        "tsql": True,
        "description": """
<p><strong>ManufactureX</strong> stores its product bill of materials recursively: each component
can itself be made of sub-components. Expand the full hierarchy for all components, showing the
depth and the path from root to leaf.</p>
<p><strong>Return columns:</strong> <code>component_id</code>, <code>component_name</code>,
<code>parent_id</code>, <code>level</code>, <code>path</code> — ordered by path.</p>
""",
        "schema": """
CREATE TABLE components (
    component_id   INT PRIMARY KEY,
    component_name VARCHAR(100) NOT NULL,
    parent_id      INT
);
INSERT INTO components VALUES
 (1, 'Bicycle',      NULL),
 (2, 'Frame',        1),
 (3, 'Wheels',       1),
 (4, 'Drivetrain',   1),
 (5, 'Fork',         2),
 (6, 'Seat Stay',    2),
 (7, 'Front Wheel',  3),
 (8, 'Rear Wheel',   3),
 (9, 'Chain',        4),
 (10,'Cassette',     4);
""",
        "solution": """
WITH bom AS (
    SELECT component_id, component_name, parent_id,
           1 AS level,
           CAST(component_name AS VARCHAR(500)) AS path
    FROM components
    WHERE parent_id IS NULL
    UNION ALL
    SELECT c.component_id, c.component_name, c.parent_id,
           b.level + 1,
           CAST(b.path + ' > ' + c.component_name AS VARCHAR(500))
    FROM components c
    JOIN bom b ON b.component_id = c.parent_id
)
SELECT component_id, component_name, parent_id, level, path
FROM bom
ORDER BY path;
""",
        "explanation": """
<p>A recursive CTE in T-SQL does not need the <code>RECURSIVE</code> keyword (unlike PostgreSQL).
The anchor member selects root components (<code>parent_id IS NULL</code>); the recursive member
joins each child to its already-expanded parent. The string concatenation builds the path.
<code>CAST(...AS VARCHAR(500))</code> is required because recursive CTEs in SQL Server need
deterministic column types — the result of string concatenation must be explicitly typed.</p>
""",
        "hints": [
            "T-SQL recursive CTEs don't need the RECURSIVE keyword — just WITH ... UNION ALL.",
            "Anchor: WHERE parent_id IS NULL. Recursive: JOIN components ON parent_id = b.component_id.",
            "Cast the path column to a fixed-length type (VARCHAR(500)) for SQL Server compatibility.",
        ],
        "order_matters": False,
    },
    {
        "id": "h20",
        "title": "Detect Many-to-Many Join Fan-out",
        "difficulty": "Hard",
        "category": "Joins",
        "companies": ["dbt", "Fivetran", "Airbyte"],
        "tsql": True,
        "description": """
<p>A common data pipeline bug: joining through a bridge table multiplies rows unexpectedly.
At <strong>DataVault Co</strong>, each order can have multiple tags. Find customers whose
order count is inflated when tags are joined — i.e. where the naive join count differs from
the true order count.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>name</code>,
<code>order_count_inflated</code>, <code>order_count_true</code>, <code>inflation_factor</code>
— ordered by inflation_factor descending.</p>
""",
        "schema": """
CREATE TABLE customers (customer_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
CREATE TABLE orders (order_id INT PRIMARY KEY, customer_id INT NOT NULL);
CREATE TABLE order_tags (tag_id INT PRIMARY KEY, order_id INT NOT NULL, tag VARCHAR(50) NOT NULL);
INSERT INTO customers VALUES (1,'Alice'),(2,'Bob'),(3,'Carol');
INSERT INTO orders VALUES (101,1),(102,1),(103,2),(104,3);
INSERT INTO order_tags VALUES
 (1,101,'urgent'),(2,101,'gift'),(3,101,'fragile'),
 (4,102,'urgent'),
 (5,103,'gift'),(6,103,'fragile');
""",
        "solution": """
SELECT c.customer_id,
       c.name,
       COUNT(o.order_id)          AS order_count_inflated,
       COUNT(DISTINCT o.order_id) AS order_count_true,
       CAST(COUNT(o.order_id) AS FLOAT)
           / NULLIF(COUNT(DISTINCT o.order_id), 0) AS inflation_factor
FROM customers c
JOIN orders o     ON o.customer_id  = c.customer_id
JOIN order_tags t ON t.order_id     = o.order_id
GROUP BY c.customer_id, c.name
HAVING COUNT(o.order_id) <> COUNT(DISTINCT o.order_id)
ORDER BY inflation_factor DESC;
""",
        "explanation": """
<p>Joining through <code>order_tags</code> multiplies each order row by the number of tags it has.
<code>COUNT(order_id)</code> counts every multiplied row; <code>COUNT(DISTINCT order_id)</code>
counts unique orders. When they differ, you have fan-out. The ratio shows how many times each
"true" order is over-counted. In production, always use COUNT DISTINCT or pre-aggregate the
bridge table before joining.</p>
""",
        "hints": [
            "COUNT(col) vs COUNT(DISTINCT col) reveals the fan-out.",
            "HAVING COUNT(o.order_id) <> COUNT(DISTINCT o.order_id) filters only affected customers.",
            "The ratio COUNT(col) / COUNT(DISTINCT col) is the inflation factor.",
        ],
        "order_matters": False,
    },
    # ── Aggregation ─────────────────────────────────────────────────────────
    {
        "id": "h21",
        "title": "30-Day Conversion Rate by Signup Channel",
        "difficulty": "Hard",
        "category": "Aggregation",
        "companies": ["HubSpot", "Salesforce", "Marketo"],
        "tsql": True,
        "description": """
<p>Marketing at <strong>GrowthBase</strong> acquires users through several channels. Compute the
30-day purchase conversion rate per channel — the percentage of users from each channel who made
at least one purchase within 30 days of signing up.</p>
<p><strong>Return columns:</strong> <code>channel</code>, <code>total_signups</code>,
<code>conversions</code>, <code>conversion_rate_pct</code> (rounded to 2 dp) — ordered by
conversion_rate_pct descending.</p>
""",
        "schema": """
CREATE TABLE users (
    user_id    INT PRIMARY KEY,
    channel    VARCHAR(50) NOT NULL,
    signup_date DATE NOT NULL
);
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL
);
INSERT INTO users VALUES
 (1,'organic','2025-01-01'),(2,'organic','2025-01-01'),(3,'organic','2025-01-02'),
 (4,'paid_search','2025-01-01'),(5,'paid_search','2025-01-02'),(6,'paid_search','2025-01-03'),
 (7,'referral','2025-01-01'),(8,'referral','2025-01-02');
INSERT INTO events VALUES
 (1,1,'purchase','2025-01-15'),(2,2,'view','2025-01-10'),
 (3,3,'purchase','2025-01-20'),
 (4,4,'purchase','2025-01-05'),(5,5,'purchase','2025-01-18'),(6,6,'view','2025-01-12'),
 (7,7,'purchase','2025-01-08'),(8,8,'purchase','2025-01-22');
""",
        "solution": """
WITH cohort AS (
    SELECT u.user_id, u.channel,
           MAX(CASE WHEN e.event_type = 'purchase'
                     AND DATEDIFF(day, u.signup_date, e.event_date) BETWEEN 1 AND 30
                    THEN 1 ELSE 0 END) AS converted
    FROM users u
    LEFT JOIN events e ON e.user_id = u.user_id
    GROUP BY u.user_id, u.channel
)
SELECT channel,
       COUNT(*) AS total_signups,
       SUM(converted) AS conversions,
       ROUND(SUM(converted) * 100.0 / COUNT(*), 2) AS conversion_rate_pct
FROM cohort
GROUP BY channel
ORDER BY conversion_rate_pct DESC;
""",
        "explanation": """
<p>The inner CTE produces one row per user with a 0/1 converted flag. LEFT JOIN is required —
users who never purchased must appear with converted = 0, not be excluded. The outer aggregation
groups by channel. <code>DATEDIFF(day, signup, event) BETWEEN 1 AND 30</code> restricts the
window to the first 30 days; day 0 (the signup day itself) is excluded by starting at 1.</p>
""",
        "hints": [
            "LEFT JOIN events to keep users who never converted.",
            "MAX(CASE WHEN purchase AND within 30 days THEN 1 ELSE 0 END) gives a per-user conversion flag.",
            "DATEDIFF(day, signup_date, event_date) BETWEEN 1 AND 30 defines the window.",
        ],
        "order_matters": False,
    },
    {
        "id": "h22",
        "title": "Accessory Attachment Rate",
        "difficulty": "Hard",
        "category": "Aggregation",
        "companies": ["Apple", "Sony", "Bose"],
        "tsql": True,
        "description": """
<p>The product team at <strong>GadgetHub</strong> wants to know what fraction of customers who
bought a <code>Camera</code> also bought at least one <code>Accessory</code> in any order
(not necessarily the same order). This is the accessory attachment rate.</p>
<p><strong>Return columns:</strong> <code>camera_buyers</code>,
<code>also_bought_accessory</code>, <code>attachment_rate_pct</code> (rounded to 2 dp).</p>
""",
        "schema": """
CREATE TABLE orders (order_id INT PRIMARY KEY, customer_id INT NOT NULL);
CREATE TABLE order_items (item_id INT PRIMARY KEY, order_id INT NOT NULL, product_id INT NOT NULL);
CREATE TABLE products (product_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL, category VARCHAR(50) NOT NULL);
INSERT INTO products VALUES
 (1,'Canon EOS','Camera'),(2,'Sony Alpha','Camera'),
 (3,'Camera Bag','Accessory'),(4,'Memory Card','Accessory'),(5,'Tripod','Accessory'),
 (6,'Laptop','Electronics');
INSERT INTO orders VALUES (101,1),(102,1),(103,2),(104,3),(105,4),(106,5);
INSERT INTO order_items VALUES
 (1,101,1),(2,102,3),(3,102,4),
 (4,103,2),
 (5,104,1),(6,104,5),
 (7,105,2),
 (8,106,6);
""",
        "solution": """
WITH buyers AS (
    SELECT o.customer_id,
           MAX(CASE WHEN p.category = 'Camera'    THEN 1 ELSE 0 END) AS bought_camera,
           MAX(CASE WHEN p.category = 'Accessory' THEN 1 ELSE 0 END) AS bought_accessory
    FROM orders o
    JOIN order_items oi ON oi.order_id    = o.order_id
    JOIN products    p  ON p.product_id   = oi.product_id
    GROUP BY o.customer_id
)
SELECT SUM(bought_camera) AS camera_buyers,
       SUM(CASE WHEN bought_camera = 1 AND bought_accessory = 1 THEN 1 END) AS also_bought_accessory,
       ROUND(SUM(CASE WHEN bought_camera = 1 AND bought_accessory = 1 THEN 1 END) * 100.0
             / NULLIF(SUM(bought_camera), 0), 2) AS attachment_rate_pct
FROM buyers;
""",
        "explanation": """
<p>The inner CTE computes two binary flags per customer: did they ever buy a Camera, and did they
ever buy an Accessory. The outer query then counts how many camera buyers also bought an accessory.
NULLIF prevents division-by-zero if no one bought a camera. The attachment rate is a standard
retail KPI — "of customers who bought X, what fraction also bought Y?"</p>
""",
        "hints": [
            "Compute bought_camera and bought_accessory as MAX(CASE WHEN) flags per customer.",
            "Outer query: SUM(bought_camera) = camera buyers; SUM(both = 1) = converters.",
            "NULLIF(SUM(bought_camera), 0) prevents division-by-zero.",
        ],
        "order_matters": False,
    },
    {
        "id": "h23",
        "title": "Month-over-Month Category Revenue Change",
        "difficulty": "Hard",
        "category": "Aggregation",
        "companies": ["Walmart", "Amazon", "Shopify"],
        "tsql": True,
        "description": """
<p>Finance at <strong>RetailCore</strong> monitors monthly revenue momentum. For each category,
show each month's revenue, the prior month's revenue, the absolute change, and the percentage
change — excluding the first month per category (no prior month to compare).</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>month</code>,
<code>monthly_revenue</code>, <code>prev_month_revenue</code>, <code>change</code>,
<code>pct_change</code> (rounded to 2 dp) — ordered by category, month.</p>
""",
        "schema": """
CREATE TABLE product_sales (
    sale_id   INT PRIMARY KEY,
    category  VARCHAR(50) NOT NULL,
    revenue   DECIMAL(10,2) NOT NULL,
    sale_date DATE NOT NULL
);
INSERT INTO product_sales VALUES
 (1,'Electronics',4200.00,'2025-01-10'),(2,'Electronics',3100.00,'2025-01-25'),
 (3,'Electronics',5800.00,'2025-02-12'),(4,'Electronics',4400.00,'2025-02-28'),
 (5,'Electronics',6100.00,'2025-03-15'),
 (6,'Clothing',1800.00,'2025-01-08'),(7,'Clothing',2500.00,'2025-02-14'),
 (8,'Clothing',2100.00,'2025-03-22');
""",
        "solution": """
WITH monthly AS (
    SELECT category,
           FORMAT(sale_date, 'yyyy-MM') AS month,
           SUM(revenue) AS monthly_revenue
    FROM product_sales
    GROUP BY category, FORMAT(sale_date, 'yyyy-MM')
),
with_prev AS (
    SELECT category, month, monthly_revenue,
           LAG(monthly_revenue) OVER (PARTITION BY category ORDER BY month) AS prev_month_revenue
    FROM monthly
)
SELECT category, month, monthly_revenue, prev_month_revenue,
       monthly_revenue - prev_month_revenue AS change,
       ROUND((monthly_revenue - prev_month_revenue) * 100.0
             / NULLIF(prev_month_revenue, 0), 2) AS pct_change
FROM with_prev
WHERE prev_month_revenue IS NOT NULL
ORDER BY category, month;
""",
        "explanation": """
<p>Two CTEs: first aggregate to monthly totals per category; then apply LAG partitioned by
category to get the prior month. FORMAT('yyyy-MM') sorts lexicographically, so the LAG ordering
is correct. NULLIF on the denominator handles categories with zero revenue in a prior month.
The WHERE clause removes the first month per category (no comparison available).</p>
""",
        "hints": [
            "FORMAT(sale_date, 'yyyy-MM') groups by month and sorts lexicographically.",
            "LAG(monthly_revenue) OVER (PARTITION BY category ORDER BY month) gives the prior month.",
            "Filter WHERE prev_month_revenue IS NOT NULL to exclude the first month per category.",
        ],
        "order_matters": False,
    },
    # ── Date & Time Logic ───────────────────────────────────────────────────
    {
        "id": "h24",
        "title": "Business Days to Ship",
        "difficulty": "Hard",
        "category": "Date/Time",
        "companies": ["FedEx", "UPS", "Amazon"],
        "tsql": True,
        "description": """
<p>The SLA team at <strong>SwiftShip</strong> measures fulfilment speed in business days
(Monday–Friday only). For each shipped order, compute the number of business days between the
order date and the ship date.</p>
<p><strong>Return columns:</strong> <code>order_id</code>, <code>order_date</code>,
<code>ship_date</code>, <code>business_days</code> — ordered by business_days descending.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INT PRIMARY KEY,
    order_date DATE NOT NULL,
    ship_date  DATE
);
INSERT INTO orders VALUES
 (1, '2025-01-06', '2025-01-08'),
 (2, '2025-01-06', '2025-01-10'),
 (3, '2025-01-07', '2025-01-13'),
 (4, '2025-01-09', '2025-01-14'),
 (5, '2025-01-10', '2025-01-16'),
 (6, '2025-01-13', NULL);
""",
        "solution": """
WITH tally AS (
    SELECT TOP 30 ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS n
    FROM sys.all_objects
),
shipped AS (
    SELECT order_id, order_date, ship_date,
           DATEDIFF(day, order_date, ship_date) AS total_days
    FROM orders
    WHERE ship_date IS NOT NULL
)
SELECT s.order_id, s.order_date, s.ship_date,
       (
           SELECT COUNT(*)
           FROM tally t
           WHERE t.n <= s.total_days
             AND DATEPART(weekday, DATEADD(day, t.n, s.order_date)) NOT IN (1, 7)
       ) AS business_days
FROM shipped s
ORDER BY business_days DESC;
""",
        "explanation": """
<p>A tally CTE generates integers 1 through 30 (enough for any reasonable ship window). For each
order, count how many of those offsets land on a weekday. <code>DATEPART(weekday, ...)</code>
returns 1 for Sunday and 7 for Saturday in SQL Server's default setting, so filtering
<code>NOT IN (1, 7)</code> keeps only Monday–Friday. Counting matching offsets ≤ total_days
gives the business-day gap.</p>
""",
        "hints": [
            "Generate a tally table of integers 1..N using TOP + ROW_NUMBER() from sys.all_objects.",
            "For each offset n, compute DATEADD(day, n, order_date) and check DATEPART(weekday).",
            "In SQL Server, weekday 1 = Sunday, 7 = Saturday — filter NOT IN (1, 7).",
        ],
        "order_matters": False,
    },
    {
        "id": "h25",
        "title": "User Activity Segments",
        "difficulty": "Hard",
        "category": "Date/Time",
        "companies": ["Intercom", "Braze", "Customer.io"],
        "tsql": True,
        "description": """
<p>The lifecycle team at <strong>EngageIQ</strong> classifies users by how recently they were
last active relative to <code>2025-03-01</code>:</p>
<ul>
<li><strong>Active</strong>: last seen ≤ 7 days ago</li>
<li><strong>At Risk</strong>: 8–30 days ago</li>
<li><strong>Churning</strong>: 31–90 days ago</li>
<li><strong>Churned</strong>: &gt; 90 days ago</li>
</ul>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>name</code>,
<code>last_login_date</code>, <code>days_inactive</code>, <code>segment</code>
— ordered by days_inactive ascending.</p>
""",
        "schema": """
CREATE TABLE users (user_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
CREATE TABLE user_logins (login_id INT PRIMARY KEY, user_id INT NOT NULL, login_date DATE NOT NULL);
INSERT INTO users VALUES (1,'Alice'),(2,'Bob'),(3,'Carol'),(4,'Dave'),(5,'Eve');
INSERT INTO user_logins VALUES
 (1,1,'2025-02-27'),(2,1,'2025-02-28'),
 (3,2,'2025-02-10'),
 (4,3,'2025-01-20'),
 (5,4,'2024-11-15'),
 (6,5,'2025-02-22'),(7,5,'2025-02-25');
""",
        "solution": """
WITH last_login AS (
    SELECT user_id, MAX(login_date) AS last_login_date
    FROM user_logins
    GROUP BY user_id
)
SELECT u.user_id, u.name, ll.last_login_date,
       DATEDIFF(day, ll.last_login_date, '2025-03-01') AS days_inactive,
       CASE
           WHEN DATEDIFF(day, ll.last_login_date, '2025-03-01') <= 7  THEN 'Active'
           WHEN DATEDIFF(day, ll.last_login_date, '2025-03-01') <= 30 THEN 'At Risk'
           WHEN DATEDIFF(day, ll.last_login_date, '2025-03-01') <= 90 THEN 'Churning'
           ELSE 'Churned'
       END AS segment
FROM users u
JOIN last_login ll ON ll.user_id = u.user_id
ORDER BY days_inactive ASC;
""",
        "explanation": """
<p>MAX(login_date) per user in a CTE gives the most recent login. DATEDIFF(day, last, reference)
computes inactivity in days. The CASE statement uses cascading thresholds — each condition is
evaluated in order, so there is no need for range predicates like BETWEEN; once a condition
matches, the rest are skipped. In production, replace the hard-coded date with GETDATE().</p>
""",
        "hints": [
            "MAX(login_date) per user gives the most recent login.",
            "DATEDIFF(day, last_login_date, '2025-03-01') gives days inactive.",
            "Cascading CASE WHEN with <= thresholds is cleaner than BETWEEN for ordered buckets.",
        ],
        "order_matters": False,
    },
    {
        "id": "h26",
        "title": "Peak Hour by Day of Week",
        "difficulty": "Hard",
        "category": "Date/Time",
        "companies": ["Uber", "Lyft", "DoorDash"],
        "tsql": True,
        "description": """
<p>Operations at <strong>SpeedRide</strong> wants to know, for each day of the week, which hour
of the day sees the most ride requests — to align driver incentives.</p>
<p><strong>Return columns:</strong> <code>day_of_week</code>, <code>hour_of_day</code>,
<code>peak_requests</code> — ordered by the calendar day number (1 = Sunday).</p>
""",
        "schema": """
CREATE TABLE rides (
    ride_id      INT PRIMARY KEY,
    request_time VARCHAR(19) NOT NULL
);
INSERT INTO rides VALUES
 (1,'2025-01-06 08:15:00'),(2,'2025-01-06 08:42:00'),(3,'2025-01-06 12:10:00'),
 (4,'2025-01-07 07:55:00'),(5,'2025-01-07 08:05:00'),(6,'2025-01-07 08:30:00'),(7,'2025-01-07 18:20:00'),
 (8,'2025-01-08 09:00:00'),(9,'2025-01-08 17:45:00'),(10,'2025-01-08 17:58:00'),(11,'2025-01-08 18:10:00'),
 (12,'2025-01-09 08:00:00'),(13,'2025-01-09 08:20:00'),
 (14,'2025-01-10 07:50:00'),(15,'2025-01-10 08:10:00'),(16,'2025-01-10 08:25:00'),(17,'2025-01-10 12:30:00'),
 (18,'2025-01-11 10:00:00'),(19,'2025-01-11 14:00:00'),
 (20,'2025-01-12 11:00:00'),(21,'2025-01-12 15:00:00'),(22,'2025-01-12 15:30:00');
""",
        "solution": """
WITH hourly AS (
    SELECT DATENAME(weekday, CAST(request_time AS DATETIME))  AS day_of_week,
           DATEPART(weekday,  CAST(request_time AS DATETIME)) AS day_num,
           DATEPART(hour,     CAST(request_time AS DATETIME)) AS hour_of_day,
           COUNT(*) AS request_count
    FROM rides
    GROUP BY DATENAME(weekday, CAST(request_time AS DATETIME)),
             DATEPART(weekday,  CAST(request_time AS DATETIME)),
             DATEPART(hour,     CAST(request_time AS DATETIME))
),
ranked AS (
    SELECT day_of_week, day_num, hour_of_day, request_count,
           ROW_NUMBER() OVER (PARTITION BY day_of_week ORDER BY request_count DESC) AS rn
    FROM hourly
)
SELECT day_of_week, hour_of_day, request_count AS peak_requests
FROM ranked
WHERE rn = 1
ORDER BY day_num;
""",
        "explanation": """
<p>Two steps: first aggregate to (day, hour) buckets; then rank hours within each day by request
count. ROW_NUMBER() = 1 picks the single peak hour per day. Including <code>day_num</code> in the
GROUP BY alongside <code>day_of_week</code> ensures the ORDER BY can sort by calendar position
rather than alphabetically.</p>
""",
        "hints": [
            "GROUP BY day-of-week AND hour-of-day to get hourly buckets per day.",
            "ROW_NUMBER() OVER (PARTITION BY day_of_week ORDER BY count DESC) = 1 picks the peak hour.",
            "Include DATEPART(weekday) in GROUP BY so you can ORDER BY it for calendar order.",
        ],
        "order_matters": False,
    },
    # ── Deduplication ───────────────────────────────────────────────────────
    {
        "id": "h27",
        "title": "Latest Event per User-Device Pair",
        "difficulty": "Hard",
        "category": "Deduplication",
        "companies": ["Apple", "Google", "Samsung"],
        "tsql": True,
        "description": """
<p>The device team at <strong>PulseApp</strong> wants the most recent event for every
(user, device) combination — this represents the current state of each device in the fleet.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>device_id</code>,
<code>event_type</code>, <code>event_time</code> — ordered by user_id, device_id.</p>
""",
        "schema": """
CREATE TABLE device_events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    device_id  VARCHAR(20) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_time VARCHAR(19) NOT NULL
);
INSERT INTO device_events VALUES
 (1, 1,'DEV-001','login',  '2025-01-10 08:00:00'),
 (2, 1,'DEV-001','action', '2025-01-10 09:15:00'),
 (3, 1,'DEV-001','logout', '2025-01-10 17:30:00'),
 (4, 1,'DEV-002','login',  '2025-01-11 10:00:00'),
 (5, 1,'DEV-002','action', '2025-01-11 11:45:00'),
 (6, 2,'DEV-003','login',  '2025-01-12 14:00:00'),
 (7, 2,'DEV-003','logout', '2025-01-12 15:30:00'),
 (8, 2,'DEV-003','login',  '2025-01-13 09:00:00');
""",
        "solution": """
WITH ranked AS (
    SELECT user_id, device_id, event_type, event_time,
           ROW_NUMBER() OVER (
               PARTITION BY user_id, device_id
               ORDER BY event_time DESC
           ) AS rn
    FROM device_events
)
SELECT user_id, device_id, event_type, event_time
FROM ranked
WHERE rn = 1
ORDER BY user_id, device_id;
""",
        "explanation": """
<p>Partitioning by <em>both</em> user_id and device_id restarts the row number for each
user-device pair independently. ORDER BY event_time DESC puts the most recent event first.
WHERE rn = 1 keeps exactly one row per pair. This two-level partition is common in IoT pipelines
where the deduplication key is a composite of entity and sub-entity.</p>
""",
        "hints": [
            "PARTITION BY user_id, device_id creates one group per user-device pair.",
            "ORDER BY event_time DESC puts the latest event first in each group.",
            "WHERE rn = 1 keeps one row per pair.",
        ],
        "order_matters": False,
    },
    {
        "id": "h28",
        "title": "Deduplicate by Source Priority",
        "difficulty": "Hard",
        "category": "Deduplication",
        "companies": ["Salesforce", "HubSpot", "Fivetran"],
        "tsql": True,
        "description": """
<p>Customer records at <strong>DataVault Co</strong> arrive from three sources:
<code>crm</code> (most trusted), <code>web</code>, and <code>import</code> (least trusted).
When the same customer appears in multiple sources, keep the record from the most trusted source.
</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>name</code>,
<code>email</code>, <code>source</code> — ordered by customer_id.</p>
""",
        "schema": """
CREATE TABLE customer_records (
    record_id   INT PRIMARY KEY,
    customer_id INT NOT NULL,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    source      VARCHAR(20) NOT NULL
);
INSERT INTO customer_records VALUES
 (1, 1,'Alice A','alice@co.com','import'),
 (2, 1,'Alice A','alice@co.com','crm'),
 (3, 2,'Bob B',  'bob@co.com',  'web'),
 (4, 2,'Bob B',  'bob@co.com',  'crm'),
 (5, 3,'Carol C','carol@co.com','import'),
 (6, 3,'Carol C','carol@co.com','web'),
 (7, 4,'Dave D', 'dave@co.com', 'crm');
""",
        "solution": """
WITH ranked AS (
    SELECT customer_id, name, email, source,
           ROW_NUMBER() OVER (
               PARTITION BY customer_id
               ORDER BY CASE source
                   WHEN 'crm'    THEN 1
                   WHEN 'web'    THEN 2
                   WHEN 'import' THEN 3
                   ELSE 4
               END
           ) AS rn
    FROM customer_records
)
SELECT customer_id, name, email, source
FROM ranked
WHERE rn = 1
ORDER BY customer_id;
""",
        "explanation": """
<p>Embedding a CASE expression inside the ORDER BY of ROW_NUMBER() controls the deduplication
priority without a separate lookup table. The CASE assigns a sort position: crm=1 (best) sorts
first, so rn=1 is always the most trusted source. This pattern is the foundation of "master
data management" deduplication in production pipelines.</p>
""",
        "hints": [
            "PARTITION BY customer_id groups duplicates; ORDER BY priority assigns rank 1 to the best source.",
            "Use CASE inside ORDER BY to translate source names to priority numbers.",
            "WHERE rn = 1 keeps only the most trusted record per customer.",
        ],
        "order_matters": False,
    },
    # ── Gaps & Islands ──────────────────────────────────────────────────────
    {
        "id": "h29",
        "title": "Overlapping Session Detection",
        "difficulty": "Hard",
        "category": "Gaps & Islands",
        "companies": ["Zoom", "Teams", "Webex"],
        "tsql": True,
        "description": """
<p>The capacity team at <strong>MeetUp</strong> needs to find all pairs of sessions for the same
user that overlap in time — evidence of a double-booking bug.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>session_a</code>,
<code>session_b</code>, <code>a_start</code>, <code>a_end</code>, <code>b_start</code>,
<code>b_end</code> — ordered by user_id, a_start.</p>
""",
        "schema": """
CREATE TABLE sessions (
    session_id INT PRIMARY KEY,
    user_id    INT NOT NULL,
    start_time VARCHAR(19) NOT NULL,
    end_time   VARCHAR(19) NOT NULL
);
INSERT INTO sessions VALUES
 (1, 1,'2025-01-10 09:00:00','2025-01-10 10:00:00'),
 (2, 1,'2025-01-10 09:30:00','2025-01-10 11:00:00'),
 (3, 1,'2025-01-10 11:30:00','2025-01-10 12:30:00'),
 (4, 2,'2025-01-10 14:00:00','2025-01-10 15:00:00'),
 (5, 2,'2025-01-10 14:45:00','2025-01-10 16:00:00'),
 (6, 3,'2025-01-10 10:00:00','2025-01-10 11:00:00'),
 (7, 3,'2025-01-10 11:00:00','2025-01-10 12:00:00');
""",
        "solution": """
SELECT a.user_id,
       a.session_id AS session_a, b.session_id AS session_b,
       a.start_time AS a_start,  a.end_time   AS a_end,
       b.start_time AS b_start,  b.end_time   AS b_end
FROM sessions a
JOIN sessions b
    ON  b.user_id    = a.user_id
    AND b.session_id > a.session_id
    AND b.start_time < a.end_time
    AND b.end_time   > a.start_time
ORDER BY a.user_id, a.start_time;
""",
        "explanation": """
<p>Two sessions overlap when one starts before the other ends AND ends after the other starts.
The standard interval overlap test is: <code>A.start &lt; B.end AND A.end &gt; B.start</code>.
<code>b.session_id &gt; a.session_id</code> ensures each pair appears once (avoids (A,B) and
(B,A)). Note session 6 and 7 touch at exactly 11:00 — touching boundaries are not overlapping
here because of the strict inequalities.</p>
""",
        "hints": [
            "Two intervals [A.start, A.end) and [B.start, B.end) overlap when A.start < B.end AND A.end > B.start.",
            "b.session_id > a.session_id prevents duplicating each pair.",
            "Strict < and > means touching boundaries are NOT considered overlapping.",
        ],
        "order_matters": False,
    },
    {
        "id": "h30",
        "title": "Longest Consecutive Sales Streak",
        "difficulty": "Hard",
        "category": "Gaps & Islands",
        "companies": ["Walmart", "Target", "Kroger"],
        "tsql": True,
        "description": """
<p>The ops team at <strong>RetailCore</strong> wants to find the longest unbroken streak of
consecutive calendar days on which at least one sale was recorded.</p>
<p><strong>Return columns:</strong> <code>streak_start</code>, <code>streak_end</code>,
<code>streak_length</code>.</p>
""",
        "schema": """
CREATE TABLE sales (
    sale_id   INT PRIMARY KEY,
    sale_date DATE NOT NULL,
    amount    DECIMAL(10,2) NOT NULL
);
INSERT INTO sales VALUES
 (1,'2025-01-01',100.00),(2,'2025-01-02',200.00),(3,'2025-01-02',150.00),
 (4,'2025-01-03',300.00),(5,'2025-01-05',180.00),(6,'2025-01-06',220.00),
 (7,'2025-01-07',410.00),(8,'2025-01-08',90.00),(9,'2025-01-08',130.00),
 (10,'2025-01-10',270.00);
""",
        "solution": """
WITH daily AS (
    SELECT DISTINCT sale_date FROM sales
),
anchored AS (
    SELECT sale_date,
           DATEDIFF(day, '2000-01-01', sale_date)
               - ROW_NUMBER() OVER (ORDER BY sale_date) AS grp
    FROM daily
),
islands AS (
    SELECT MIN(sale_date) AS streak_start,
           MAX(sale_date) AS streak_end,
           COUNT(*)       AS streak_length
    FROM anchored
    GROUP BY grp
)
SELECT TOP 1 streak_start, streak_end, streak_length
FROM islands
ORDER BY streak_length DESC;
""",
        "explanation": """
<p>Deduplicate to one row per day with DISTINCT. Subtract a sequential row number from the day
count (days since a fixed anchor date) — consecutive dates produce the same constant, forming
the island group key. Aggregate each island for start, end, and length. TOP 1 ORDER BY length
DESC returns the longest streak.</p>
""",
        "hints": [
            "DISTINCT first to collapse multiple sales on the same day to one row.",
            "DATEDIFF(day, anchor, sale_date) - ROW_NUMBER() is constant for consecutive dates.",
            "GROUP BY that constant, then pick the island with MAX COUNT(*).",
        ],
        "order_matters": False,
    },
    {
        "id": "h31",
        "title": "Merge Overlapping Date Ranges",
        "difficulty": "Hard",
        "category": "Gaps & Islands",
        "companies": ["Snowflake", "Databricks", "dbt"],
        "tsql": True,
        "description": """
<p>A subscription history table at <strong>DataVault Co</strong> may contain overlapping active
periods for the same customer (a known data quality issue). Merge all overlapping or adjacent
ranges per customer into a single continuous period.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>merged_start</code>,
<code>merged_end</code> — ordered by customer_id, merged_start.</p>
""",
        "schema": """
CREATE TABLE subscriptions (
    sub_id      INT PRIMARY KEY,
    customer_id INT NOT NULL,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL
);
INSERT INTO subscriptions VALUES
 (1, 1,'2025-01-01','2025-01-15'),
 (2, 1,'2025-01-10','2025-01-20'),
 (3, 1,'2025-01-22','2025-01-31'),
 (4, 2,'2025-01-05','2025-01-12'),
 (5, 2,'2025-01-12','2025-01-18'),
 (6, 2,'2025-01-25','2025-02-05'),
 (7, 3,'2025-01-01','2025-01-31');
""",
        "solution": """
WITH ordered AS (
    SELECT customer_id, start_date, end_date,
           MAX(end_date) OVER (
               PARTITION BY customer_id
               ORDER BY start_date
               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
           ) AS prev_max_end
    FROM subscriptions
),
island_start AS (
    SELECT customer_id, start_date, end_date,
           CASE WHEN start_date <= ISNULL(prev_max_end, start_date)
                THEN 0 ELSE 1 END AS is_new_island
    FROM ordered
),
islands AS (
    SELECT customer_id, start_date, end_date,
           SUM(is_new_island) OVER (PARTITION BY customer_id ORDER BY start_date) AS island_id
    FROM island_start
)
SELECT customer_id,
       MIN(start_date) AS merged_start,
       MAX(end_date)   AS merged_end
FROM islands
GROUP BY customer_id, island_id
ORDER BY customer_id, merged_start;
""",
        "explanation": """
<p>The key insight: a new island starts when the current range's start_date is greater than the
running maximum end_date of all preceding ranges. Step 1: compute the running MAX of end_date
using a window with ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING. Step 2: flag each row
where start_date exceeds that running max. Step 3: SUM the flag as a running counter — all rows
in the same island share the same counter value. Step 4: GROUP BY island_id and take MIN/MAX.</p>
""",
        "hints": [
            "A new island begins when start_date > running MAX(end_date) of all previous ranges.",
            "Compute running MAX with ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING.",
            "SUM(is_new_island) OVER (ORDER BY start_date) creates an island ID.",
        ],
        "order_matters": False,
    },
    # ── Retention & Cohorts ─────────────────────────────────────────────────
    {
        "id": "h32",
        "title": "D7 and D30 Retention by Signup Week",
        "difficulty": "Hard",
        "category": "Retention & Cohorts",
        "companies": ["Meta", "Snap", "Discord"],
        "tsql": True,
        "description": """
<p>The product team at <strong>Chirper</strong> tracks both Day-7 and Day-30 retention for each
weekly signup cohort. Return one row per signup week showing cohort size, D7 retention rate,
and D30 retention rate.</p>
<p><strong>Return columns:</strong> <code>signup_yr</code>, <code>signup_wk</code>,
<code>cohort_size</code>, <code>d7_retention_pct</code>, <code>d30_retention_pct</code>
— ordered by signup_yr, signup_wk.</p>
""",
        "schema": """
CREATE TABLE users (user_id INT PRIMARY KEY, signup_date DATE NOT NULL);
CREATE TABLE events (event_id INT PRIMARY KEY, user_id INT NOT NULL, event_date DATE NOT NULL);
INSERT INTO users VALUES
 (1,'2025-01-06'),(2,'2025-01-06'),(3,'2025-01-06'),(4,'2025-01-06'),
 (5,'2025-01-13'),(6,'2025-01-13'),(7,'2025-01-13');
INSERT INTO events VALUES
 (1,1,'2025-01-10'),(2,2,'2025-01-13'),(3,3,'2025-02-05'),
 (4,1,'2025-02-07'),(5,4,'2025-01-08'),
 (6,5,'2025-01-18'),(7,6,'2025-02-12'),(8,7,'2025-01-20');
""",
        "solution": """
WITH cohort AS (
    SELECT u.user_id,
           DATEPART(year, u.signup_date) AS signup_yr,
           DATEPART(week, u.signup_date) AS signup_wk,
           u.signup_date,
           MAX(CASE WHEN DATEDIFF(day, u.signup_date, e.event_date) BETWEEN 1 AND 7
                    THEN 1 ELSE 0 END) AS d7,
           MAX(CASE WHEN DATEDIFF(day, u.signup_date, e.event_date) BETWEEN 1 AND 30
                    THEN 1 ELSE 0 END) AS d30
    FROM users u
    LEFT JOIN events e ON e.user_id = u.user_id
    GROUP BY u.user_id, DATEPART(year, u.signup_date),
             DATEPART(week, u.signup_date), u.signup_date
)
SELECT signup_yr, signup_wk,
       COUNT(*) AS cohort_size,
       ROUND(SUM(d7)  * 100.0 / COUNT(*), 2) AS d7_retention_pct,
       ROUND(SUM(d30) * 100.0 / COUNT(*), 2) AS d30_retention_pct
FROM cohort
GROUP BY signup_yr, signup_wk
ORDER BY signup_yr, signup_wk;
""",
        "explanation": """
<p>The inner CTE computes two binary flags per user using MAX(CASE WHEN ...) — one for D7 return
and one for D30 return. LEFT JOIN keeps all users including those who never returned. A user can
satisfy D30 without satisfying D7 if they returned between days 8 and 30. The outer GROUP BY
rolls up by week cohort.</p>
""",
        "hints": [
            "Two MAX(CASE WHEN) flags per user: D7 = return within 7 days, D30 = return within 30 days.",
            "LEFT JOIN events — users with no return must count as 0, not be excluded.",
            "Group outer query by signup week; SUM the flags for retention counts.",
        ],
        "order_matters": False,
    },
    {
        "id": "h33",
        "title": "Reactivated Users",
        "difficulty": "Hard",
        "category": "Retention & Cohorts",
        "companies": ["Netflix", "Spotify", "Duolingo"],
        "tsql": True,
        "description": """
<p>The growth team at <strong>StreamOn</strong> defines a reactivated user as someone who had a
gap of 30 or more consecutive inactive days and then returned. For each reactivation event, show
who came back, when, and how long the gap was.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>name</code>,
<code>reactivation_date</code>, <code>gap_days</code> — ordered by gap_days descending.</p>
""",
        "schema": """
CREATE TABLE users (user_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
CREATE TABLE events (event_id INT PRIMARY KEY, user_id INT NOT NULL, event_date DATE NOT NULL);
INSERT INTO users VALUES (1,'Alice'),(2,'Bob'),(3,'Carol'),(4,'Dave');
INSERT INTO events VALUES
 (1,1,'2025-01-05'),(2,1,'2025-01-10'),(3,1,'2025-02-20'),
 (4,2,'2025-01-03'),(5,2,'2025-01-08'),(6,2,'2025-01-12'),
 (7,3,'2025-01-01'),(8,3,'2025-02-15'),(9,3,'2025-03-01'),
 (10,4,'2025-01-20'),(11,4,'2025-03-10');
""",
        "solution": """
WITH daily AS (
    SELECT DISTINCT user_id, event_date FROM events
),
with_prev AS (
    SELECT user_id, event_date,
           LAG(event_date) OVER (PARTITION BY user_id ORDER BY event_date) AS prev_date
    FROM daily
)
SELECT w.user_id, u.name,
       w.event_date AS reactivation_date,
       DATEDIFF(day, w.prev_date, w.event_date) AS gap_days
FROM with_prev w
JOIN users u ON u.user_id = w.user_id
WHERE DATEDIFF(day, w.prev_date, w.event_date) >= 30
ORDER BY gap_days DESC;
""",
        "explanation": """
<p>Deduplicate to one row per user per day, then LAG to get the previous activity date per user.
DATEDIFF(day, prev, curr) &gt;= 30 identifies gaps of a month or more — those are reactivation
events. Alice's gap from Jan 10 to Feb 20 is 41 days (reactivated); Dave's gap from Jan 20 to
Mar 10 is 49 days. Bob has no 30+ day gap.</p>
""",
        "hints": [
            "DISTINCT events first to get one row per user per day.",
            "LAG(event_date) OVER (PARTITION BY user_id ORDER BY event_date) gives the previous activity date.",
            "WHERE DATEDIFF(day, prev_date, event_date) >= 30 identifies reactivations.",
        ],
        "order_matters": False,
    },
    {
        "id": "h34",
        "title": "Churn Risk Feature Table",
        "difficulty": "Hard",
        "category": "Retention & Cohorts",
        "companies": ["Braze", "Intercom", "Customer.io"],
        "tsql": True,
        "description": """
<p>The ML team at <strong>EngageIQ</strong> needs a feature table for a churn prediction model.
For each user, compute: days since last event (as of <code>2025-03-01</code>), total events,
number of distinct active days, purchase count, average order value, and a churn risk label.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>name</code>,
<code>days_inactive</code>, <code>total_events</code>, <code>active_days</code>,
<code>purchase_count</code>, <code>avg_order_value</code>, <code>churn_risk</code>
— ordered by days_inactive descending.</p>
""",
        "schema": """
CREATE TABLE users (user_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
CREATE TABLE events (
    event_id   INT PRIMARY KEY,
    user_id    INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_date DATE NOT NULL,
    amount     DECIMAL(10,2)
);
INSERT INTO users VALUES (1,'Alice'),(2,'Bob'),(3,'Carol'),(4,'Dave');
INSERT INTO events VALUES
 (1,1,'view',     '2025-02-28',NULL),
 (2,1,'purchase', '2025-02-25',89.00),
 (3,1,'purchase', '2025-02-20',120.00),
 (4,2,'view',     '2025-01-15',NULL),
 (5,2,'purchase', '2025-01-10',45.00),
 (6,3,'view',     '2024-11-01',NULL),
 (7,4,'purchase', '2025-02-10',200.00),
 (8,4,'view',     '2025-02-14',NULL),
 (9,4,'purchase', '2025-02-20',150.00);
""",
        "solution": """
WITH features AS (
    SELECT u.user_id, u.name,
           DATEDIFF(day, MAX(e.event_date), '2025-03-01') AS days_inactive,
           COUNT(e.event_id) AS total_events,
           COUNT(DISTINCT e.event_date) AS active_days,
           SUM(CASE WHEN e.event_type = 'purchase' THEN 1 ELSE 0 END) AS purchase_count,
           AVG(CASE WHEN e.event_type = 'purchase' THEN e.amount END) AS avg_order_value
    FROM users u
    LEFT JOIN events e ON e.user_id = u.user_id
    GROUP BY u.user_id, u.name
)
SELECT user_id, name, days_inactive, total_events, active_days, purchase_count,
       ISNULL(avg_order_value, 0) AS avg_order_value,
       CASE
           WHEN days_inactive > 60 OR days_inactive IS NULL THEN 'High'
           WHEN days_inactive > 30                          THEN 'Medium'
           ELSE 'Low'
       END AS churn_risk
FROM features
ORDER BY days_inactive DESC;
""",
        "explanation": """
<p>This is a feature engineering query — a common take-home challenge. Each metric is computed
with a single pass over the events table using conditional aggregation. ISNULL converts NULL
avg_order_value (users with no purchases) to 0 so the ML model receives a numeric value.
LEFT JOIN is required so users with no events appear with NULL feature values (to be handled
downstream).</p>
""",
        "hints": [
            "One pass: use multiple conditional aggregations (SUM(CASE WHEN ...), AVG(CASE WHEN ...)).",
            "DATEDIFF(day, MAX(event_date), '2025-03-01') gives days since last activity.",
            "ISNULL(avg_order_value, 0) replaces NULL for users with no purchases.",
        ],
        "order_matters": False,
    },
    # ── Filtering & NULL ────────────────────────────────────────────────────
    {
        "id": "h35",
        "title": "Fill Missing Prices from Category Average",
        "difficulty": "Hard",
        "category": "Filtering & NULL",
        "companies": ["Amazon", "Walmart", "Shopify"],
        "tsql": True,
        "description": """
<p>Some products at <strong>CatalogCo</strong> are missing prices due to a bad import. For the
analytics dashboard, replace NULL prices with the average price of that product's category
(computed from non-NULL rows only).</p>
<p><strong>Return columns:</strong> <code>product_id</code>, <code>name</code>,
<code>category</code>, <code>original_price</code>, <code>effective_price</code>
(rounded to 2 dp) — ordered by category, name.</p>
""",
        "schema": """
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    category   VARCHAR(50) NOT NULL,
    price      DECIMAL(10,2)
);
INSERT INTO products VALUES
 (1,'Laptop Pro',    'Electronics', 1299.99),
 (2,'Wireless Mouse','Electronics', 49.99),
 (3,'Keyboard',      'Electronics', NULL),
 (4,'Monitor',       'Electronics', 399.99),
 (5,'Running Shoes', 'Sports',      89.99),
 (6,'Yoga Mat',      'Sports',      NULL),
 (7,'Water Bottle',  'Sports',      24.99),
 (8,'Coffee Maker',  'Kitchen',     NULL),
 (9,'Blender',       'Kitchen',     79.99),
 (10,'Toaster',      'Kitchen',     39.99);
""",
        "solution": """
WITH cat_avg AS (
    SELECT category,
           AVG(CAST(price AS FLOAT)) AS avg_price
    FROM products
    WHERE price IS NOT NULL
    GROUP BY category
)
SELECT p.product_id, p.name, p.category,
       p.price AS original_price,
       ROUND(ISNULL(p.price, CAST(a.avg_price AS DECIMAL(10,2))), 2) AS effective_price
FROM products p
LEFT JOIN cat_avg a ON a.category = p.category
ORDER BY p.category, p.name;
""",
        "explanation": """
<p>Compute category averages excluding NULLs in a CTE (AVG ignores NULLs automatically). LEFT
JOIN back to the product table so products whose entire category has no prices (edge case) still
appear. ISNULL(price, category_avg) replaces NULL prices. This is a standard data-cleaning
pattern in staging layers.</p>
""",
        "hints": [
            "AVG ignores NULL values automatically — no WHERE needed inside the aggregate.",
            "LEFT JOIN cat_avg so products in a category with no valid prices still appear.",
            "ISNULL(price, avg_price) fills the gap.",
        ],
        "order_matters": False,
    },
    {
        "id": "h36",
        "title": "The NOT IN NULL Trap",
        "difficulty": "Hard",
        "category": "Filtering & NULL",
        "companies": ["dbt", "Fivetran", "Airbyte"],
        "tsql": True,
        "description": """
<p>The data team at <strong>DataVault Co</strong> wants customers who have <em>never</em> placed
an international order (ship_country &lt;&gt; 'US'). One column in <code>orders.ship_country</code>
is NULL for some rows.</p>
<p>Write the correct query using <code>NOT EXISTS</code>. Also demonstrate why
<code>NOT IN</code> would return 0 rows in this case by using it in a comment.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>name</code>
— ordered by name.</p>
""",
        "schema": """
CREATE TABLE customers (customer_id INT PRIMARY KEY, name VARCHAR(100) NOT NULL);
CREATE TABLE orders (
    order_id     INT PRIMARY KEY,
    customer_id  INT NOT NULL,
    ship_country VARCHAR(10)
);
INSERT INTO customers VALUES (1,'Alice'),(2,'Bob'),(3,'Carol'),(4,'Dave');
INSERT INTO orders VALUES
 (101,1,'US'),(102,1,'US'),(103,1,'CA'),
 (104,2,'US'),(105,2,'US'),
 (106,3,'US'),(107,3,NULL),
 (108,4,'US');
""",
        "solution": """
-- Correct: NOT EXISTS is NULL-safe
SELECT c.customer_id, c.name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.customer_id
      AND o.ship_country <> 'US'
)
ORDER BY c.name;
-- Note: NOT IN (SELECT ship_country FROM orders WHERE ship_country <> 'US')
-- would return 0 rows because ship_country has a NULL, and
-- x NOT IN (..., NULL) evaluates to UNKNOWN, not TRUE.
""",
        "explanation": """
<p>When <code>NOT IN</code>'s subquery returns any NULL, every row in the outer query evaluates
to UNKNOWN (not TRUE or FALSE) — so no rows are returned. This is the most dangerous NULL trap
in SQL. NOT EXISTS avoids it because it tests for the existence of a row, not equality. Bob and
Dave have only US orders. Carol has one NULL ship_country order, but no confirmed non-US order,
so she qualifies. Only Alice, who has a CA order, is excluded.</p>
""",
        "hints": [
            "NOT IN fails silently when the subquery contains any NULL.",
            "NOT EXISTS is NULL-safe — use it for anti-joins when the lookup column can be NULL.",
            "The condition inside NOT EXISTS is o.ship_country <> 'US', which skips NULLs naturally.",
        ],
        "order_matters": False,
    },
    # ── Data Quality ────────────────────────────────────────────────────────
    {
        "id": "h37",
        "title": "Pipeline Health Check",
        "difficulty": "Hard",
        "category": "Data Quality",
        "companies": ["dbt", "Fivetran", "Databricks"],
        "tsql": True,
        "description": """
<p>The data engineering team at <strong>DataVault Co</strong> runs a suite of data quality checks
after each pipeline load. Write a single query that returns one row per check with the check name
and the number of violations found:</p>
<ol>
<li><strong>orphaned_order_items</strong>: items whose order_id has no matching order</li>
<li><strong>orders_without_items</strong>: orders with no line items</li>
<li><strong>items_with_zero_quantity</strong>: line items where quantity &lt;= 0</li>
</ol>
<p><strong>Return columns:</strong> <code>check_name</code>, <code>violation_count</code>
— ordered by check_name.</p>
""",
        "schema": """
CREATE TABLE orders (order_id INT PRIMARY KEY, customer_id INT NOT NULL, order_date DATE NOT NULL);
CREATE TABLE order_items (
    item_id    INT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL
);
INSERT INTO orders VALUES
 (1001,1,'2025-01-05'),(1002,2,'2025-01-06'),(1003,3,'2025-01-07'),(1004,4,'2025-01-08');
INSERT INTO order_items VALUES
 (1,1001,101,2),(2,1001,102,1),
 (3,1002,103,3),
 (4,1005,104,1),
 (5,1006,101,0),
 (6,1003,102,-1);
""",
        "solution": """
SELECT 'items_with_zero_quantity' AS check_name,
       COUNT(*) AS violation_count
FROM order_items
WHERE quantity <= 0
UNION ALL
SELECT 'orders_without_items',
       COUNT(*)
FROM orders o
WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.order_id)
UNION ALL
SELECT 'orphaned_order_items',
       COUNT(*)
FROM order_items oi
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.order_id = oi.order_id)
ORDER BY check_name;
""",
        "explanation": """
<p>UNION ALL stitches multiple independent checks into a single result set — a common pattern
for data quality dashboards. Each branch targets one specific invariant. NOT EXISTS is used for
referential integrity checks (safer than LEFT JOIN IS NULL when dealing with NULLable keys).
In production, this query runs as a dbt test or a post-load assertion job.</p>
""",
        "hints": [
            "UNION ALL three separate checks into one result set.",
            "Use NOT EXISTS for referential integrity checks — it's NULL-safe.",
            "WHERE quantity <= 0 catches both zero and negative quantities.",
        ],
        "order_matters": False,
    },
]


