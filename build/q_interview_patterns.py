# Original questions based on real SQL interview patterns.
# Each question is inspired by common patterns from LeetCode/HackerRank/CodeSignal
# but written as original content (new schemas, companies, narratives).

INTERVIEW_PATTERNS = [
    {
        "id": "ip01",
        "title": "Customer Retention Cohort",
        "difficulty": "Hard",
        "category": "Window Functions & Cohorts",
        "companies": ["Stripe", "Shopify", "Square"],
        "source": "Original (inspired by LeetCode #1158)",
        "description": """
<p>At <strong>PayFlow</strong>, a payments processor, you need to analyze customer retention over time.
A cohort is defined by the month customers first appeared. For each cohort, calculate what percentage 
of customers returned in each subsequent month.</p>
<p>Example: If 100 customers first appeared in Jan, and 45 of them made a transaction in Feb, 
the retention rate for Jan cohort in Feb is 45%.</p>
<p><strong>Return columns:</strong> <code>cohort_month</code>, <code>months_active</code> (0=first month, 1=second, etc.), 
<code>cohort_size</code>, <code>returning_customers</code>, <code>retention_rate</code> (as %)</p>
""",
        "schema": """
CREATE TABLE transactions (
    txn_id      INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    txn_date    TEXT NOT NULL,  -- YYYY-MM-DD
    amount      DECIMAL NOT NULL
);
INSERT INTO transactions VALUES
 (1, 101, '2024-01-15', 50.00),
 (2, 102, '2024-01-20', 75.50),
 (3, 103, '2024-01-25', 100.00),
 (4, 101, '2024-02-10', 60.00),
 (5, 102, '2024-02-18', 80.00),
 (6, 104, '2024-02-05', 45.00),
 (7, 101, '2024-03-12', 55.00),
 (8, 105, '2024-03-08', 90.00),
 (9, 102, '2024-03-20', 70.00),
 (10, 104, '2024-03-15', 50.00);
""",
        "solution": """
WITH cohorts AS (
    SELECT customer_id,
           STRFTIME('%Y-%m', MIN(txn_date)) AS cohort_month,
           STRFTIME('%Y-%m', txn_date) AS txn_month
    FROM transactions
    GROUP BY customer_id, txn_month
)
SELECT cohort_month,
       (JULIANDAY(txn_month) - JULIANDAY(cohort_month)) / 30.5 AS months_active,
       COUNT(DISTINCT CASE WHEN txn_month = cohort_month THEN customer_id END) AS cohort_size,
       COUNT(DISTINCT customer_id) AS returning_customers,
       ROUND(100.0 * COUNT(DISTINCT customer_id) / 
             COUNT(DISTINCT CASE WHEN txn_month = cohort_month THEN customer_id END), 1) AS retention_rate
FROM cohorts
WHERE txn_month >= cohort_month
GROUP BY cohort_month, months_active
ORDER BY cohort_month, months_active;
""",
        "explanation": """
<p>This is a classic cohort analysis pattern. The key insight is to:</p>
<ol>
<li>Identify each customer's <code>cohort_month</code> (first appearance month)</li>
<li>For each transaction month, calculate how many months have passed</li>
<li>At each "age" of the cohort, count how many original members are still active</li>
</ol>
<p>The interviewer checks: (1) CTE usage, (2) window function thinking, (3) date arithmetic, 
(4) aggregation with conditions.</p>
""",
        "hints": [
            "Use a CTE to define each customer's first month (cohort_month).",
            "Calculate month offset from the cohort month to the transaction month.",
            "Count distinct customers at each cohort age to measure retention.",
        ],
        "order_matters": False,
    },
    {
        "id": "ip02",
        "title": "Median Salary by Department",
        "difficulty": "Medium",
        "category": "Statistical Functions",
        "companies": ["Google", "Facebook", "LinkedIn"],
        "source": "Original (inspired by LeetCode #618)",
        "description": """
<p><strong>TalentHub</strong> HR wants the median salary in each department. Unlike average, median 
is resistant to outliers and gives a better sense of typical compensation.</p>
<p><strong>Return columns:</strong> <code>department</code>, <code>median_salary</code>. 
Order by department name.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     INTEGER NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Alice', 'Engineering', 95000),
 (2, 'Bob', 'Engineering', 105000),
 (3, 'Charlie', 'Engineering', 115000),
 (4, 'Dana', 'Sales', 60000),
 (5, 'Eve', 'Sales', 70000),
 (6, 'Frank', 'Sales', 80000),
 (7, 'Grace', 'Sales', 250000),
 (8, 'Henry', 'Marketing', 50000),
 (9, 'Iris', 'Marketing', 55000);
""",
        "solution": """
WITH ranked AS (
    SELECT department,
           salary,
           COUNT(*) OVER (PARTITION BY department) AS dept_count,
           ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary) AS row_num
    FROM employees
)
SELECT department,
       AVG(salary) AS median_salary
FROM ranked
WHERE row_num IN (CEIL(dept_count / 2.0), FLOOR(dept_count / 2.0) + 1)
GROUP BY department
ORDER BY department;
""",
        "explanation": """
<p>SQLite doesn't have a built-in MEDIAN function, so we use window functions to find the middle value(s).
For odd-length groups, there's one middle; for even-length, we average the two middles (or the interviewer 
may accept just one).</p>
<p>The interviewer checks: (1) window function mastery, (2) understanding of median math, (3) edge cases 
(even vs. odd count).</p>
""",
        "hints": [
            "Use ROW_NUMBER to rank salaries within each department.",
            "The median is the middle row (for odd count) or average of two middle rows (even count).",
            "Filter rows that match the middle position(s).",
        ],
        "order_matters": False,
    },
    {
        "id": "ip03",
        "title": "Active User Streaks",
        "difficulty": "Hard",
        "category": "Gap & Island Detection",
        "companies": ["Netflix", "Discord", "Duolingo"],
        "source": "Original (inspired by LeetCode #1354)",
        "description": """
<p>At <strong>LearnerPlus</strong>, an online learning platform, you want to find users with 
<em>consecutive active days</em> (a streak). Calculate the longest streak for each user and 
when it started.</p>
<p>A user is "active" on a day if they accessed the platform.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>streak_start_date</code>, <code>streak_length</code>.
Order by user_id, then by streak_start_date.</p>
""",
        "schema": """
CREATE TABLE user_activity (
    user_id INTEGER NOT NULL,
    activity_date TEXT NOT NULL,  -- YYYY-MM-DD
    PRIMARY KEY (user_id, activity_date)
);
INSERT INTO user_activity VALUES
 (1, '2024-01-01'), (1, '2024-01-02'), (1, '2024-01-03'), (1, '2024-01-05'),
 (2, '2024-01-01'), (2, '2024-01-02'), (2, '2024-01-04'), (2, '2024-01-05'), (2, '2024-01-06'),
 (3, '2024-01-02'), (3, '2024-01-04'), (3, '2024-01-05');
""",
        "solution": """
WITH gaps AS (
    SELECT user_id,
           activity_date,
           JULIANDAY(activity_date) - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY activity_date) AS gap
    FROM user_activity
),
streaks AS (
    SELECT user_id,
           MIN(activity_date) AS streak_start_date,
           COUNT(*) AS streak_length,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY COUNT(*) DESC) AS rank_by_length
    FROM gaps
    GROUP BY user_id, gap
)
SELECT user_id, streak_start_date, streak_length
FROM streaks
WHERE rank_by_length = 1
ORDER BY user_id, streak_start_date;
""",
        "explanation": """
<p>This is the classic "gap and island" pattern. The trick:</p>
<ol>
<li>When consecutive dates exist, the difference (JULIANDAY - ROW_NUMBER) is constant.</li>
<li>Non-consecutive dates create a different gap value — a new "island".</li>
<li>Group by this gap to find each streak.</li>
<li>Filter for the longest streak per user.</li>
</ol>
<p>Interviewers test: (1) creative date math, (2) window functions, (3) gap detection logic.</p>
""",
        "hints": [
            "Compute JULIANDAY(date) - ROW_NUMBER() — consecutive dates have the same result.",
            "Group by this gap value to find islands of consecutive days.",
            "Use a window function to rank streaks by length and take the longest.",
        ],
        "order_matters": False,
    },
    {
        "id": "ip04",
        "title": "Top-N Per Group with Tie-Handling",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Uber", "Airbnb", "DoorDash"],
        "source": "Original (inspired by LeetCode #176)",
        "description": """
<p><strong>RideShare+</strong> wants the top 2 most-rated drivers in each city. If drivers tie 
for 2nd place (or higher), include all of them.</p>
<p><strong>Return columns:</strong> <code>city</code>, <code>driver_id</code>, <code>rating</code>.
Order by city, then rating (descending).</p>
""",
        "schema": """
CREATE TABLE drivers (
    driver_id INTEGER PRIMARY KEY,
    city      TEXT NOT NULL,
    rating    DECIMAL NOT NULL
);
INSERT INTO drivers VALUES
 (1, 'NYC', 4.9), (2, 'NYC', 4.8), (3, 'NYC', 4.8), (4, 'NYC', 4.7),
 (5, 'LA', 4.95), (6, 'LA', 4.9), (7, 'LA', 4.85), (8, 'LA', 4.85);
""",
        "solution": """
WITH ranked AS (
    SELECT city,
           driver_id,
           rating,
           DENSE_RANK() OVER (PARTITION BY city ORDER BY rating DESC) AS rnk
    FROM drivers
)
SELECT city, driver_id, rating
FROM ranked
WHERE rnk <= 2
ORDER BY city, rating DESC;
""",
        "explanation": """
<p>Use <code>DENSE_RANK()</code> instead of <code>RANK()</code> to handle ties correctly. 
DENSE_RANK gives the same rank to tied values and doesn't skip numbers, so if two drivers 
tie for 2nd, they both get rank 2, and we correctly include both.</p>
<p>If you used RANK(), the second tie would be rank 3, causing the third place to be skipped.</p>
""",
        "hints": [
            "Use DENSE_RANK to handle ties — it doesn't skip rank numbers.",
            "RANK() would skip a number after a tie; DENSE_RANK() doesn't.",
            "Filter WHERE rnk <= 2 to get top 2 per city.",
        ],
        "order_matters": False,
    },
    {
        "id": "ip05",
        "title": "Product Sales Over Time with Running Total",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Amazon", "Shopify", "eBay"],
        "source": "Original (inspired by LeetCode #1398)",
        "description": """
<p><strong>Merchandise Co.</strong> wants to track cumulative sales by product over time. 
For each product-month combination, show the month, revenue, and running total revenue since the product launched.</p>
<p><strong>Return columns:</strong> <code>product_id</code>, <code>month</code>, <code>revenue</code>, 
<code>cumulative_revenue</code>. Order by product_id, then month.</p>
""",
        "schema": """
CREATE TABLE sales (
    product_id INTEGER NOT NULL,
    sale_month TEXT NOT NULL,  -- YYYY-MM
    revenue INTEGER NOT NULL,
    PRIMARY KEY (product_id, sale_month)
);
INSERT INTO sales VALUES
 (1, '2024-01', 5000), (1, '2024-02', 4500), (1, '2024-03', 6000),
 (2, '2024-02', 8000), (2, '2024-03', 7500), (2, '2024-04', 9000);
""",
        "solution": """
SELECT product_id,
       sale_month AS month,
       revenue,
       SUM(revenue) OVER (PARTITION BY product_id ORDER BY sale_month) AS cumulative_revenue
FROM sales
ORDER BY product_id, sale_month;
""",
        "explanation": """
<p>A straightforward window function: <code>SUM() OVER (PARTITION BY ... ORDER BY ...)</code> 
computes a running total within each product. The ORDER BY is crucial — it defines the window's 
range (all rows from the start up to the current row).</p>
<p>Interviewers test: (1) understanding of window frames, (2) ORDER BY in window functions, 
(3) practical data analysis.</p>
""",
        "hints": [
            "Use SUM() OVER to compute a running total.",
            "PARTITION BY product_id to compute separately for each product.",
            "ORDER BY month to define the cumulative range.",
        ],
        "order_matters": False,
    },
]
