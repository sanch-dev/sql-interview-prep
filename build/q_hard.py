# Hard questions — original content, interview-style.

HARD = [
    {
        "id": "h01",
        "title": "Longest Login Streak",
        "difficulty": "Hard",
        "category": "Gaps & Islands",
        "companies": ["Duolingo", "Meta", "LinkedIn"],
        "description": """
<p><strong>Linguini</strong>, a language-learning app, gamifies daily practice with streaks. For each
user, find the length of their <em>longest run of consecutive calendar days</em> with at least one login.
A user may log in multiple times on the same day — that still counts as one day.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>longest_streak</code> — ordered by
<code>user_id</code> ascending.</p>
""",
        "schema": """
CREATE TABLE logins (
    login_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    login_date TEXT NOT NULL
);
INSERT INTO logins VALUES
 (1,  1, '2025-04-01'),
 (2,  1, '2025-04-02'),
 (3,  1, '2025-04-02'),   -- duplicate day
 (4,  1, '2025-04-03'),
 (5,  1, '2025-04-07'),
 (6,  1, '2025-04-08'),
 (7,  2, '2025-04-01'),
 (8,  2, '2025-04-03'),
 (9,  2, '2025-04-05'),
 (10, 3, '2025-04-10'),
 (11, 3, '2025-04-11'),
 (12, 3, '2025-04-12'),
 (13, 3, '2025-04-13'),
 (14, 3, '2025-04-13'),   -- duplicate day
 (15, 3, '2025-04-14');
""",
        "solution": """
WITH days AS (
    SELECT DISTINCT user_id, login_date
    FROM logins
),
anchored AS (
    SELECT user_id,
           login_date,
           date(login_date,
                '-' || ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) || ' day'
           ) AS anchor
    FROM days
),
streaks AS (
    SELECT user_id, anchor, COUNT(*) AS streak_len
    FROM anchored
    GROUP BY user_id, anchor
)
SELECT user_id, MAX(streak_len) AS longest_streak
FROM streaks
GROUP BY user_id
ORDER BY user_id;
""",
        "explanation": """
<p>The classic <em>gaps and islands</em> trick. For consecutive dates, <code>date - row_number</code> is
constant: 04-01−1, 04-02−2, 04-03−3 all land on the same anchor date. The moment a day is skipped, the
anchor jumps — so grouping by (user, anchor) groups exactly the consecutive runs, and
<code>COUNT(*)</code> is each run's length.</p>
<p>Two traps are planted in the data: duplicate same-day logins (the <code>DISTINCT</code> CTE is
mandatory, otherwise row numbers shift and streaks shatter) — and user 2, who never has two consecutive
days (answer: 1). Expected: user 1 → 3, user 2 → 1, user 3 → 5.</p>
""",
        "hints": [
            "Deduplicate to one row per user per day first — duplicates break everything that follows.",
            "For consecutive dates, date minus row_number (in days) is a constant. Group on it.",
            "In SQLite: date(login_date, '-' || rn || ' day'). Then COUNT per group, MAX per user.",
        ],
        "order_matters": True,
    },
    {
        "id": "h02",
        "title": "Month-over-Month Revenue Growth",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Stripe", "Snowflake", "Datadog"],
        "description": """
<p>The CFO of <strong>Cloudloom</strong>, a B2B SaaS company, wants the standard board-deck table:
revenue per month and percentage growth vs the previous month. The first month has no prior month —
its growth must be <code>NULL</code>, not 0.</p>
<p><strong>Return columns:</strong> <code>month</code> (<code>YYYY-MM</code>), <code>revenue</code>,
<code>growth_pct</code> (1 decimal, NULL for the first month) — ordered by <code>month</code> ascending.</p>
""",
        "schema": """
CREATE TABLE payments (
    payment_id INTEGER PRIMARY KEY,
    paid_at    TEXT NOT NULL,
    amount     REAL NOT NULL
);
INSERT INTO payments VALUES
 (1,  '2025-01-08', 4200.00),
 (2,  '2025-01-19', 3100.00),
 (3,  '2025-01-27', 1850.00),
 (4,  '2025-02-04', 5300.00),
 (5,  '2025-02-15', 2750.00),
 (6,  '2025-02-22', 4925.00),
 (7,  '2025-03-03', 3600.00),
 (8,  '2025-03-11', 2240.00),
 (9,  '2025-03-29', 3110.00),
 (10, '2025-04-06', 6480.00),
 (11, '2025-04-17', 5275.00),
 (12, '2025-04-25', 3945.00);
""",
        "solution": """
WITH monthly AS (
    SELECT strftime('%Y-%m', paid_at) AS month,
           SUM(amount) AS revenue
    FROM payments
    GROUP BY month
)
SELECT month,
       revenue,
       ROUND(
         100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
               / LAG(revenue) OVER (ORDER BY month),
         1
       ) AS growth_pct
FROM monthly
ORDER BY month;
""",
        "explanation": """
<p>Aggregate to monthly grain first, <em>then</em> apply <code>LAG()</code> — window functions can't see
rows that grouping hasn't produced yet, so the CTE ordering matters. <code>LAG(revenue)</code> fetches
the previous month's value; the growth formula is <code>(current − previous) / previous</code>.</p>
<p>For January, <code>LAG</code> returns <code>NULL</code> and NULL propagates through the arithmetic —
exactly the required output, for free. Growth: Feb +41.8%, Mar −31.0%, Apr +75.4%. Knowing that MoM/WoW
growth is just "GROUP BY then LAG" makes a whole family of interview questions mechanical.</p>
""",
        "hints": [
            "Two stages: aggregate to monthly revenue, then compare each row to the previous one.",
            "LAG(revenue) OVER (ORDER BY month) reads the prior month's value.",
            "Don't special-case the first month — NULL arithmetic handles it.",
        ],
        "order_matters": True,
    },
    {
        "id": "h03",
        "title": "Median Salary per Company",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Google", "Bloomberg", "Two Sigma"],
        "description": """
<p><strong>Salarywise</strong>, a compensation benchmarking site, needs the median salary at each company.
There is no <code>MEDIAN()</code> function in most SQL engines — you must build it.</p>
<p>For a company with an odd number of employees the median is the middle value; for an even number it's
the average of the two middle values.</p>
<p><strong>Return columns:</strong> <code>company</code>, <code>median_salary</code> — ordered by
<code>company</code> ascending.</p>
""",
        "schema": """
CREATE TABLE salaries (
    record_id INTEGER PRIMARY KEY,
    company   TEXT NOT NULL,
    salary    INTEGER NOT NULL
);
INSERT INTO salaries VALUES
 (1,  'Acme',    60000),
 (2,  'Acme',    72000),
 (3,  'Acme',    85000),
 (4,  'Acme',    91000),
 (5,  'Acme',   130000),
 (6,  'Bolt',    54000),
 (7,  'Bolt',    66000),
 (8,  'Bolt',    78000),
 (9,  'Bolt',    98000),
 (10, 'Corex',   88000),
 (11, 'Corex',   92000),
 (12, 'Corex',  104000),
 (13, 'Corex',  115000),
 (14, 'Corex',  150000),
 (15, 'Corex',  162000);
""",
        "solution": """
WITH ranked AS (
    SELECT company,
           salary,
           ROW_NUMBER() OVER (PARTITION BY company ORDER BY salary) AS rn,
           COUNT(*)     OVER (PARTITION BY company) AS cnt
    FROM salaries
)
SELECT company,
       AVG(salary) AS median_salary
FROM ranked
WHERE rn IN ((cnt + 1) / 2, (cnt + 2) / 2)
GROUP BY company
ORDER BY company;
""",
        "explanation": """
<p>Rank salaries within each company and also attach the company's row count via
<code>COUNT(*) OVER</code>. With integer division, <code>(cnt+1)/2</code> and <code>(cnt+2)/2</code>
elegantly cover both parities: for cnt=5 both give 3 (the single middle row); for cnt=4 they give 2 and 3
(the two middle rows). <code>AVG</code> over one row is that row; over two rows it's their midpoint.</p>
<p>Acme (5 rows) → 85000; Bolt (4 rows) → (66000+78000)/2 = 72000; Corex (6 rows) →
(104000+115000)/2 = 109500. An alternative phrasing uses <code>ABS(rn - (cnt+1)/2.0) &lt; 1</code> or
<code>rn BETWEEN cnt/2.0 AND cnt/2.0 + 1</code> — any correct middle-row selection is accepted.</p>
""",
        "hints": [
            "Number the rows per company in salary order, and grab each company's total count in the same pass (COUNT(*) OVER).",
            "The median rows are the middle one (odd count) or middle two (even count).",
            "With integer division, (cnt+1)/2 and (cnt+2)/2 select exactly those rows. AVG them.",
        ],
        "order_matters": True,
    },
    {
        "id": "h04",
        "title": "Counting Browsing Sessions",
        "difficulty": "Hard",
        "category": "Sessionization",
        "companies": ["Amazon", "Airbnb", "Pinterest"],
        "description": """
<p><strong>Wanderlust</strong>, a travel booking site, has a raw clickstream of page views. Analytics
defines a <em>session</em> the standard way: a user's pageview starts a new session if it occurs more
than <strong>30 minutes</strong> after their previous pageview (or if it's their first pageview ever).</p>
<p>Count the number of sessions for each user.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>sessions</code> — ordered by
<code>user_id</code> ascending.</p>
""",
        "schema": """
CREATE TABLE pageviews (
    view_id   INTEGER PRIMARY KEY,
    user_id   INTEGER NOT NULL,
    view_time TEXT NOT NULL    -- 'YYYY-MM-DD HH:MM:SS'
);
INSERT INTO pageviews VALUES
 (1,  1, '2025-05-01 09:00:00'),
 (2,  1, '2025-05-01 09:05:00'),
 (3,  1, '2025-05-01 09:20:00'),
 (4,  1, '2025-05-01 11:00:00'),
 (5,  1, '2025-05-01 11:10:00'),
 (6,  1, '2025-05-02 15:30:00'),
 (7,  2, '2025-05-01 10:00:00'),
 (8,  2, '2025-05-01 10:29:00'),
 (9,  2, '2025-05-01 10:58:00'),
 (10, 2, '2025-05-01 12:45:00'),
 (11, 3, '2025-05-03 08:15:00');
""",
        "solution": """
WITH gaps AS (
    SELECT user_id,
           view_time,
           (julianday(view_time) -
            julianday(LAG(view_time) OVER (PARTITION BY user_id ORDER BY view_time))
           ) * 24 * 60 AS gap_minutes
    FROM pageviews
)
SELECT user_id,
       SUM(CASE WHEN gap_minutes IS NULL OR gap_minutes > 30 THEN 1 ELSE 0 END) AS sessions
FROM gaps
GROUP BY user_id
ORDER BY user_id;
""",
        "explanation": """
<p>Sessionization in two moves: (1) <code>LAG</code> computes each pageview's gap from the user's previous
view; (2) a pageview is a <em>session start</em> when that gap is NULL (first view ever) or exceeds 30
minutes. Counting session starts counts sessions.</p>
<p>User 2 is the subtle case: views at 10:00, 10:29, 10:58 form <em>one</em> session — each consecutive
gap is 29 minutes even though the first and last views are 58 minutes apart. The gap rule chains. Then
12:45 starts a second session. Expected: user 1 → 3, user 2 → 2, user 3 → 1. The same flag, cumulatively
summed, yields session <em>ids</em> — the standard warehouse pattern for building session tables from
raw events.</p>
""",
        "hints": [
            "Compute each view's gap from the user's previous view with LAG.",
            "A session starts where the gap is NULL or > 30 minutes. Count session starts.",
            "Minutes between timestamps in SQLite: (julianday(a) - julianday(b)) * 24 * 60.",
        ],
        "order_matters": True,
    },
    {
        "id": "h05",
        "title": "Day-1 Retention by Signup Date",
        "difficulty": "Hard",
        "category": "Retention",
        "companies": ["Meta", "TikTok", "Duolingo"],
        "description": """
<p><strong>Loopine</strong>, a short-video app, tracks Day-1 retention: of the users who signed up on a
given date, what percentage came back (any activity) <em>exactly the next day</em>?</p>
<p>For each signup date, return the number of signups and the Day-1 retention percentage. A user with
several activity events on the next day must count only once.</p>
<p><strong>Return columns:</strong> <code>signup_date</code>, <code>signups</code>,
<code>d1_retention_pct</code> (1 decimal) — ordered by <code>signup_date</code> ascending.</p>
""",
        "schema": """
CREATE TABLE users (
    user_id     INTEGER PRIMARY KEY,
    signup_date TEXT NOT NULL
);
CREATE TABLE activity (
    activity_id   INTEGER PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    activity_date TEXT NOT NULL
);
INSERT INTO users VALUES
 (1, '2025-06-01'),
 (2, '2025-06-01'),
 (3, '2025-06-01'),
 (4, '2025-06-02'),
 (5, '2025-06-02'),
 (6, '2025-06-03'),
 (7, '2025-06-03'),
 (8, '2025-06-03'),
 (9, '2025-06-03');
INSERT INTO activity VALUES
 (1,  1, '2025-06-01'),
 (2,  1, '2025-06-02'),
 (3,  1, '2025-06-02'),   -- same user, same day: must count once
 (4,  2, '2025-06-02'),
 (5,  3, '2025-06-04'),   -- came back, but not on day 1
 (6,  4, '2025-06-03'),
 (7,  5, '2025-06-05'),
 (8,  6, '2025-06-04'),
 (9,  7, '2025-06-04'),
 (10, 7, '2025-06-04'),   -- duplicate again
 (11, 8, '2025-06-06'),
 (12, 9, '2025-06-04');
""",
        "solution": """
WITH day1 AS (
    SELECT DISTINCT user_id, activity_date
    FROM activity
)
SELECT u.signup_date,
       COUNT(*) AS signups,
       ROUND(
         100.0 * SUM(CASE WHEN d.user_id IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*),
         1
       ) AS d1_retention_pct
FROM users u
LEFT JOIN day1 d
  ON d.user_id = u.user_id
 AND d.activity_date = date(u.signup_date, '+1 day')
GROUP BY u.signup_date
ORDER BY u.signup_date;
""",
        "explanation": """
<p>The join condition carries the retention logic: match a user's activity only when it lands exactly one
day after their signup. The <code>LEFT JOIN</code> keeps non-returning users in the denominator, and
deduplicating activity first (the <code>day1</code> CTE) prevents user 1's two next-day events from
counting twice — without it, June 1 would report a retention above 100%.</p>
<p>Expected: 06-01 → 3 signups, 66.7% (users 1, 2 returned; user 3 came back too late); 06-02 → 2
signups, 50.0%; 06-03 → 4 signups, 75.0%. Generalizing the join offset gives D7/D30 retention, and
grouping by signup week/month gives cohort curves — this one query shape powers entire growth dashboards.</p>
""",
        "hints": [
            "Put the 'exactly next day' condition in the JOIN, not the WHERE — you need a LEFT JOIN that keeps everyone.",
            "Deduplicate activity to (user, day) before joining, or one user can count twice.",
            "date(signup_date, '+1 day') computes the target date.",
        ],
        "order_matters": True,
    },
    {
        "id": "h06",
        "title": "Top 3 Products per Category (Keep Ties)",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Amazon", "Walmart", "Alibaba"],
        "description": """
<p><strong>Casacart</strong>, a home goods marketplace, prints a quarterly report: the top 3 products by
revenue <em>within each category</em>. If products tie at a qualifying rank, all of them appear (so a
category can show more than 3 rows).</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>product_name</code>,
<code>revenue</code> — ordered by <code>category</code> ascending, <code>revenue</code> descending,
<code>product_name</code> ascending.</p>
""",
        "schema": """
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL
);
CREATE TABLE sales (
    sale_id    INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    amount     REAL NOT NULL
);
INSERT INTO products VALUES
 (1, 'Cloud Sofa',      'Furniture'),
 (2, 'Birch Side Table','Furniture'),
 (3, 'Loft Bed Frame',  'Furniture'),
 (4, 'Pine Wardrobe',   'Furniture'),
 (5, 'Halo Floor Lamp', 'Lighting'),
 (6, 'Dot Desk Lamp',   'Lighting'),
 (7, 'Ray Pendant',     'Lighting'),
 (8, 'Glow Sconce',     'Lighting'),
 (9, 'Nest Wool Rug',   'Lighting');
INSERT INTO sales VALUES
 (1,  1, 3200.00),
 (2,  1, 2800.00),
 (3,  2,  450.00),
 (4,  2,  450.00),
 (5,  3, 1900.00),
 (6,  4,  900.00),   -- Furniture rank 4: ties with nothing, must be excluded
 (7,  5,  780.00),
 (8,  6,  340.00),
 (9,  7,  560.00),
 (10, 8,  340.00),   -- Glow Sconce ties Dot Desk Lamp at rank 3: both stay
 (11, 9,  120.00);
""",
        "solution": """
WITH revenue AS (
    SELECT p.category,
           p.name AS product_name,
           SUM(s.amount) AS revenue
    FROM products p
    JOIN sales s ON s.product_id = p.product_id
    GROUP BY p.product_id, p.category, p.name
),
ranked AS (
    SELECT category,
           product_name,
           revenue,
           DENSE_RANK() OVER (
               PARTITION BY category
               ORDER BY revenue DESC
           ) AS rnk
    FROM revenue
)
SELECT category, product_name, revenue
FROM ranked
WHERE rnk <= 3
ORDER BY category, revenue DESC, product_name;
""",
        "explanation": """
<p>Three stages stacked in CTEs: aggregate sales to product revenue, rank within category, filter. The
"keep ties" requirement selects <code>DENSE_RANK</code> over <code>ROW_NUMBER</code> (which would
arbitrarily drop one of the tied lamps) and over <code>RANK</code> (which works here but can skip rank 3
entirely after a tie at 2 — worth being able to explain the difference).</p>
<p>In Lighting, Dot Desk Lamp and Glow Sconce tie at 340 for rank 3, so the category returns 4 rows.
In Furniture, Pine Wardrobe at rank 4 is excluded. Top-N-per-group is probably the single most-asked
window function pattern in data engineering interviews.</p>
""",
        "hints": [
            "Aggregate to per-product revenue first, then rank within each category.",
            "Ties must survive: which ranking function assigns equal ranks without gaps?",
            "Filter rank <= 3 in an outer query — window results can't go in WHERE directly.",
        ],
        "order_matters": True,
    },
    {
        "id": "h07",
        "title": "Cumulative Distinct Users",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Snowflake", "Databricks", "Netflix"],
        "description": """
<p><strong>Festwire</strong>, an event ticketing platform, wants a "total unique customers ever" line for
its growth chart: for each date with activity, the count of distinct users seen <em>on or before</em>
that date.</p>
<p>Hard part: <code>COUNT(DISTINCT ...)</code> is not allowed inside a window in SQLite (or BigQuery, or
most engines). You need another way.</p>
<p><strong>Return columns:</strong> <code>event_date</code>, <code>cumulative_users</code> — ordered by
<code>event_date</code> ascending.</p>
""",
        "schema": """
CREATE TABLE events (
    event_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    event_date TEXT NOT NULL
);
INSERT INTO events VALUES
 (1,  101, '2025-02-01'),
 (2,  102, '2025-02-01'),
 (3,  101, '2025-02-03'),
 (4,  103, '2025-02-03'),
 (5,  102, '2025-02-05'),
 (6,  104, '2025-02-05'),
 (7,  105, '2025-02-05'),
 (8,  101, '2025-02-08'),
 (9,  103, '2025-02-08'),
 (10, 106, '2025-02-09'),
 (11, 104, '2025-02-09'),
 (12, 101, '2025-02-12');
""",
        "solution": """
WITH first_seen AS (
    SELECT user_id, MIN(event_date) AS first_date
    FROM events
    GROUP BY user_id
),
new_per_day AS (
    SELECT first_date AS d, COUNT(*) AS new_users
    FROM first_seen
    GROUP BY first_date
),
all_dates AS (
    SELECT DISTINCT event_date AS d
    FROM events
)
SELECT a.d AS event_date,
       SUM(COALESCE(n.new_users, 0)) OVER (ORDER BY a.d) AS cumulative_users
FROM all_dates a
LEFT JOIN new_per_day n ON n.d = a.d
ORDER BY a.d;
""",
        "explanation": """
<p>The reframe that unlocks it: a user contributes to the cumulative distinct count only on their
<em>first</em> day. So compute each user's first-seen date, count new users per day, and take a running
sum of that — an ordinary windowed <code>SUM</code>, no distinct needed.</p>
<p>The <code>all_dates</code> CTE matters: 2025-02-08 and 2025-02-12 have activity but zero <em>new</em>
users, yet must still appear (with the running total flat at 5 and 6). Expected: 2, 3, 5, 5, 6, 6.
This first-seen trick is how production pipelines compute cumulative uniques at scale, where
re-scanning all history per day would be prohibitive.</p>
""",
        "hints": [
            "A user only increments the cumulative distinct count once — on which day?",
            "MIN(event_date) per user → count of first-appearances per day → running SUM.",
            "Don't lose dates where no NEW user appeared; they still need an output row.",
        ],
        "order_matters": True,
    },
    {
        "id": "h08",
        "title": "7-Day Rolling Average Sales",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["Netflix", "Spotify", "Robinhood"],
        "description": """
<p><strong>Plateful</strong>, a meal-kit company, smooths its noisy daily sales with a trailing 7-day
average (today plus the 6 previous days). Only output dates that have a <em>full</em> 7-day window — the
first 6 days don't have enough history and would distort the chart.</p>
<p>The table has one row per day with no gaps.</p>
<p><strong>Return columns:</strong> <code>sale_date</code>, <code>rolling_avg_7d</code> (2 decimals) —
ordered by <code>sale_date</code> ascending.</p>
""",
        "schema": """
CREATE TABLE daily_sales (
    sale_date TEXT PRIMARY KEY,
    revenue   REAL NOT NULL
);
INSERT INTO daily_sales VALUES
 ('2025-03-01', 1850.00),
 ('2025-03-02', 2100.00),
 ('2025-03-03', 1740.00),
 ('2025-03-04', 1995.00),
 ('2025-03-05', 2300.00),
 ('2025-03-06', 2650.00),
 ('2025-03-07', 2480.00),
 ('2025-03-08', 1900.00),
 ('2025-03-09', 2050.00),
 ('2025-03-10', 2210.00),
 ('2025-03-11', 1875.00),
 ('2025-03-12', 2425.00),
 ('2025-03-13', 2760.00),
 ('2025-03-14', 2590.00);
""",
        "solution": """
WITH windowed AS (
    SELECT sale_date,
           AVG(revenue) OVER (
               ORDER BY sale_date
               ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
           ) AS avg7,
           ROW_NUMBER() OVER (ORDER BY sale_date) AS rn
    FROM daily_sales
)
SELECT sale_date,
       ROUND(avg7, 2) AS rolling_avg_7d
FROM windowed
WHERE rn >= 7
ORDER BY sale_date;
""",
        "explanation": """
<p>An explicit window frame — <code>ROWS BETWEEN 6 PRECEDING AND CURRENT ROW</code> — defines the
trailing 7-row window. Because the data is guaranteed gap-free, 7 rows = 7 days; with gaps you'd need a
date-based frame (<code>RANGE</code>/date spine), a great point to raise in an interview.</p>
<p>The second window function (<code>ROW_NUMBER</code>) handles the "full window only" requirement:
rows 1–6 average over fewer than 7 days, so they're cut. Output runs 03-07 through 03-14, starting at
2159.29. Knowing frame clauses (<code>ROWS</code> vs <code>RANGE</code>, <code>PRECEDING</code> /
<code>FOLLOWING</code>) separates people who really know window functions from those who've only used
defaults.</p>
""",
        "hints": [
            "AVG over a window frame: ROWS BETWEEN 6 PRECEDING AND CURRENT ROW.",
            "The first 6 rows have incomplete windows — they must be excluded.",
            "ROW_NUMBER in the same CTE gives you a clean way to skip them (rn >= 7).",
        ],
        "order_matters": True,
    },
    {
        "id": "h09",
        "title": "Customer Value Quartiles",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["American Express", "Capital One", "Klarna"],
        "description": """
<p>The CRM team at <strong>Vaultpay</strong>, a payments company, segments customers into four equal-sized
value tiers by lifetime spend. Quartile 1 is the <em>highest</em>-spending group.</p>
<p>For each quartile, report how many customers it contains and their average lifetime spend.</p>
<p><strong>Return columns:</strong> <code>quartile</code>, <code>customers</code>,
<code>avg_spend</code> (2 decimals) — ordered by <code>quartile</code> ascending.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    amount      REAL NOT NULL
);
INSERT INTO orders VALUES
 (1,  1, 250.00), (2,  1, 130.00),
 (3,  2, 90.00),
 (4,  3, 480.00), (5,  3, 220.00), (6,  3, 310.00),
 (7,  4, 45.00),  (8,  4, 30.00),
 (9,  5, 660.00),
 (10, 6, 150.00), (11, 6, 95.00),
 (12, 7, 520.00), (13, 7, 410.00),
 (14, 8, 75.00),
 (15, 9, 320.00), (16, 9, 185.00),
 (17, 10, 28.00), (18, 10, 19.00),
 (19, 11, 740.00), (20, 11, 380.00),
 (21, 12, 210.00);
""",
        "solution": """
WITH totals AS (
    SELECT customer_id, SUM(amount) AS total_spend
    FROM orders
    GROUP BY customer_id
),
tiled AS (
    SELECT total_spend,
           NTILE(4) OVER (ORDER BY total_spend DESC) AS quartile
    FROM totals
)
SELECT quartile,
       COUNT(*) AS customers,
       ROUND(AVG(total_spend), 2) AS avg_spend
FROM tiled
GROUP BY quartile
ORDER BY quartile;
""",
        "explanation": """
<p><code>NTILE(4)</code> deals rows into 4 buckets as evenly as possible — with 12 customers, exactly 3
per quartile. Ordering <em>descending</em> makes quartile 1 the top spenders, as specified. Then a
regular <code>GROUP BY</code> over the bucket label summarizes each tier.</p>
<p>Per-customer totals (desc): 1120, 1010, 930, 660, 505, 380, 245, 210, 90, 75, 75, 47. Quartile
averages: 1020.00, 515.00, 181.67, 65.67. Worth knowing: when rows don't divide evenly, NTILE makes the
first buckets one row larger — and for value-based (rather than equal-count) tiers you'd reach for
PERCENT_RANK or CUME_DIST instead. Interviewers love that distinction.</p>
""",
        "hints": [
            "First collapse orders to lifetime spend per customer.",
            "NTILE(4) OVER (ORDER BY total DESC) deals customers into 4 equal buckets.",
            "Then GROUP BY the bucket number and aggregate.",
        ],
        "order_matters": True,
    },
    {
        "id": "h10",
        "title": "True Watch Time (Merge Overlapping Intervals)",
        "difficulty": "Hard",
        "category": "Gaps & Islands",
        "companies": ["Netflix", "YouTube", "Twitch"],
        "description": """
<p><strong>Streamio</strong> (the streaming service again) logs viewing sessions as intervals of minutes:
<code>start_min</code> to <code>end_min</code>. Sessions can <em>overlap</em> — a user might watch on two
devices, or a crashed player can double-log. Total watch time must count overlapping minutes
<strong>once</strong>.</p>
<p>Compute each user's true total watch time in minutes. Back-to-back intervals (one ends exactly when
the next starts) count as continuous. Simply summing the durations will overcount.</p>
<p><strong>Return columns:</strong> <code>user_id</code>, <code>total_minutes</code> — ordered by
<code>user_id</code> ascending.</p>
""",
        "schema": """
CREATE TABLE view_sessions (
    session_id INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    start_min  INTEGER NOT NULL,
    end_min    INTEGER NOT NULL
);
INSERT INTO view_sessions VALUES
 (1, 1, 10,  50),
 (2, 1, 40,  90),    -- overlaps previous
 (3, 1, 90,  120),   -- back-to-back: continuous
 (4, 1, 200, 230),
 (5, 2, 0,   60),
 (6, 2, 10,  30),    -- fully contained
 (7, 2, 100, 140),
 (8, 3, 15,  45),
 (9, 3, 50,  70),
 (10,3, 60,  65);    -- contained in previous
""",
        "solution": """
WITH ordered AS (
    SELECT user_id,
           start_min,
           end_min,
           MAX(end_min) OVER (
               PARTITION BY user_id
               ORDER BY start_min, end_min
               ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
           ) AS prev_max_end
    FROM view_sessions
),
flagged AS (
    SELECT user_id,
           start_min,
           end_min,
           CASE WHEN prev_max_end IS NULL OR start_min > prev_max_end
                THEN 1 ELSE 0 END AS is_new_island
    FROM ordered
),
islands AS (
    SELECT user_id,
           start_min,
           end_min,
           SUM(is_new_island) OVER (
               PARTITION BY user_id
               ORDER BY start_min, end_min
           ) AS island_id
    FROM flagged
)
SELECT user_id,
       SUM(island_end - island_start) AS total_minutes
FROM (
    SELECT user_id,
           island_id,
           MIN(start_min) AS island_start,
           MAX(end_min)   AS island_end
    FROM islands
    GROUP BY user_id, island_id
)
GROUP BY user_id
ORDER BY user_id;
""",
        "explanation": """
<p>Interval merging, the hardest common flavor of gaps-and-islands. The crucial subtlety: you must compare
each interval's start against the <em>running maximum</em> end of all earlier intervals
(<code>MAX(end_min) OVER ... 1 PRECEDING</code>), not just the previous row's end — a long interval can
swallow several later ones (user 2's 0–60 contains 10–30). A new island starts when
<code>start &gt; prev_max_end</code>; strict inequality makes back-to-back intervals merge, as specified.</p>
<p>Cumulative-summing the island flags assigns island ids; each island contributes
<code>MAX(end) − MIN(start)</code>. Expected: user 1 → 110 + 30 = 140; user 2 → 60 + 40 = 100;
user 3 → 30 + 20 = 50. This exact computation appears in real pipelines for ad exposure time, device
uptime, and billable compute merging.</p>
""",
        "hints": [
            "Sort each user's intervals by start; an interval merges into the current block unless it starts after everything so far has ended.",
            "'Everything so far has ended' = running MAX(end_min) over preceding rows — not LAG(end_min). Contained intervals break LAG.",
            "Flag new blocks, cumulative-sum the flags to get block ids, then sum MAX(end) - MIN(start) per block.",
        ],
        "order_matters": True,
    },
]
