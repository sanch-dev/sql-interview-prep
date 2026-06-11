# Medium questions — original content, interview-style.

MEDIUM = [
    {
        "id": "m01",
        "title": "Top Earner in Each Department",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Amazon", "Microsoft", "Apple"],
        "description": """
<p>HR at <strong>Vantage Systems</strong> wants the highest-paid employee in every department for a comp
review. If two people tie for the top salary in a department, return <em>both</em>.</p>
<p><strong>Return columns:</strong> <code>dept_name</code>, <code>employee</code>, <code>salary</code> —
any order.</p>
""",
        "schema": """
CREATE TABLE departments (
    dept_id   INTEGER PRIMARY KEY,
    dept_name TEXT NOT NULL
);
CREATE TABLE employees (
    emp_id  INTEGER PRIMARY KEY,
    name    TEXT NOT NULL,
    salary  INTEGER NOT NULL,
    dept_id INTEGER NOT NULL
);
INSERT INTO departments VALUES
 (1, 'Engineering'), (2, 'Sales'), (3, 'Design');
INSERT INTO employees VALUES
 (1, 'Ira Glass',     142000, 1),
 (2, 'Mona Diaz',     155000, 1),
 (3, 'Kyle Renner',   155000, 1),
 (4, 'Suki Ito',      121000, 1),
 (5, 'Pat Boyle',      98000, 2),
 (6, 'Gail Strand',   104000, 2),
 (7, 'Ravi Kapoor',    87000, 2),
 (8, 'Fern Ellis',    112000, 3),
 (9, 'Drew Holt',     109000, 3);
""",
        "solution": """
WITH ranked AS (
    SELECT d.dept_name,
           e.name AS employee,
           e.salary,
           RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
    FROM employees e
    JOIN departments d ON d.dept_id = e.dept_id
)
SELECT dept_name, employee, salary
FROM ranked
WHERE rnk = 1;
""",
        "explanation": """
<p><code>RANK() OVER (PARTITION BY dept ORDER BY salary DESC)</code> restarts the ranking inside each
department. <code>RANK</code> (not <code>ROW_NUMBER</code>) is the right tool because it assigns the same
rank to ties — Mona and Kyle both rank 1 in Engineering and both must be returned.</p>
<p>A correlated-subquery version (<code>WHERE salary = (SELECT MAX(salary) ... same dept)</code>) is also
accepted in interviews; mention the window-function form, since it scans the table once instead of once
per row.</p>
""",
        "hints": [
            "You need a per-group maximum that keeps ties.",
            "PARTITION BY department in a window function restarts the calculation per department.",
            "RANK() keeps ties at 1; ROW_NUMBER() would arbitrarily drop one of them.",
        ],
        "order_matters": False,
    },
    {
        "id": "m02",
        "title": "Monthly Active Users",
        "difficulty": "Medium",
        "category": "Date/Time",
        "companies": ["Meta", "Snap", "TikTok"],
        "description": """
<p><strong>Chirper</strong>, a social network, defines Monthly Active Users (MAU) as the number of
<em>distinct</em> users who triggered at least one event in a calendar month.</p>
<p>Compute MAU for every month present in the events table.</p>
<p><strong>Return columns:</strong> <code>month</code> (format <code>YYYY-MM</code>), <code>mau</code> —
ordered by <code>month</code> ascending.</p>
""",
        "schema": """
CREATE TABLE events (
    event_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    event_time TEXT NOT NULL     -- 'YYYY-MM-DD HH:MM:SS'
);
INSERT INTO events VALUES
 (1,  101, 'post',  '2025-01-03 09:12:00'),
 (2,  102, 'like',  '2025-01-05 14:30:00'),
 (3,  101, 'like',  '2025-01-18 11:02:00'),
 (4,  103, 'post',  '2025-01-22 19:45:00'),
 (5,  101, 'post',  '2025-02-01 08:00:00'),
 (6,  104, 'like',  '2025-02-09 16:20:00'),
 (7,  104, 'post',  '2025-02-09 16:25:00'),
 (8,  102, 'post',  '2025-02-14 10:10:00'),
 (9,  105, 'like',  '2025-02-27 21:05:00'),
 (10, 103, 'like',  '2025-03-02 12:00:00'),
 (11, 103, 'post',  '2025-03-15 13:30:00'),
 (12, 106, 'post',  '2025-03-20 18:40:00'),
 (13, 101, 'like',  '2025-03-28 07:55:00');
""",
        "solution": """
SELECT strftime('%Y-%m', event_time) AS month,
       COUNT(DISTINCT user_id) AS mau
FROM events
GROUP BY month
ORDER BY month;
""",
        "explanation": """
<p>Two ideas combine here: truncating a timestamp to its month (<code>strftime('%Y-%m', ...)</code> in
SQLite; <code>DATE_TRUNC</code> in Postgres/Snowflake) and counting <em>distinct</em> users rather than
events. User 104 fires two events in February but counts once — <code>COUNT(*)</code> would inflate MAU,
a bug that has shipped to real dashboards more than once.</p>
<p>January MAU is 3, February 4, March 3.</p>
""",
        "hints": [
            "Truncate the timestamp to a month bucket — strftime('%Y-%m', event_time).",
            "A user with five events in a month still counts once.",
            "COUNT(DISTINCT user_id), grouped by the month expression.",
        ],
        "order_matters": True,
    },
    {
        "id": "m03",
        "title": "Leaderboard with Dense Ranking",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Activision", "Roblox", "Google"],
        "description": """
<p><strong>Blockfall</strong>, a mobile game, shows a global leaderboard. Players with equal points share
the same rank, and ranks must have <em>no gaps</em> (if two players tie at rank 2, the next player is
rank 3, not 4).</p>
<p><strong>Return columns:</strong> <code>player</code>, <code>points</code>, <code>player_rank</code> —
ordered by <code>player_rank</code> ascending, then <code>player</code> ascending.</p>
""",
        "schema": """
CREATE TABLE scores (
    score_id INTEGER PRIMARY KEY,
    player   TEXT NOT NULL,
    points   INTEGER NOT NULL
);
INSERT INTO scores VALUES
 (1, 'frostbyte',   2840),
 (2, 'lunarmoth',   3120),
 (3, 'pixelpunk',   2840),
 (4, 'quasar_kid',  1990),
 (5, 'renegade7',   3120),
 (6, 'softcrash',   2210),
 (7, 'tetra',       1990),
 (8, 'voidwalker',  2750);
""",
        "solution": """
SELECT player,
       points,
       DENSE_RANK() OVER (ORDER BY points DESC) AS player_rank
FROM scores
ORDER BY player_rank, player;
""",
        "explanation": """
<p>The "no gaps" requirement is the tell for <code>DENSE_RANK()</code>. The three ranking functions differ
only in how they treat ties: <code>ROW_NUMBER</code> breaks ties arbitrarily (1,2,3,4),
<code>RANK</code> leaves gaps (1,1,3), <code>DENSE_RANK</code> doesn't (1,1,2).</p>
<p>Here lunarmoth and renegade7 tie at 3120 → rank 1, voidwalker (2750) → rank 3 with <code>RANK</code>
but rank 2 with <code>DENSE_RANK</code> — the data is built so the wrong function produces a visibly
wrong answer.</p>
""",
        "hints": [
            "Three ranking functions exist: ROW_NUMBER, RANK, DENSE_RANK. They differ on ties.",
            "'No gaps after ties' picks one of them specifically.",
            "Remember the final ORDER BY — output order is part of the spec here.",
        ],
        "order_matters": True,
    },
    {
        "id": "m04",
        "title": "Warmer Than the Day Before",
        "difficulty": "Medium",
        "category": "Self-Joins",
        "companies": ["Google", "Palantir"],
        "description": """
<p>A weather station logs one temperature reading per day — but the sensor sometimes fails, so some days
are <em>missing</em>. Find every date whose temperature was strictly higher than the reading on the
<em>previous calendar day</em>. If the previous calendar day is missing, the date doesn't qualify.</p>
<p>⚠️ A plain <code>LAG()</code> over the ordered rows compares against the <em>previous row</em>, which
may be several days earlier — the data contains a gap to catch exactly that mistake.</p>
<p><strong>Return column:</strong> <code>reading_date</code> — any order.</p>
""",
        "schema": """
CREATE TABLE readings (
    reading_date TEXT PRIMARY KEY,
    temp_c       REAL NOT NULL
);
INSERT INTO readings VALUES
 ('2025-03-01', 11.5),
 ('2025-03-02', 13.0),
 ('2025-03-03', 12.1),
 ('2025-03-04', 15.4),
 -- 2025-03-05 missing: sensor failure
 ('2025-03-06', 19.0),
 ('2025-03-07', 17.2),
 ('2025-03-08', 18.9);
""",
        "solution": """
SELECT today.reading_date
FROM readings today
JOIN readings yesterday
  ON yesterday.reading_date = date(today.reading_date, '-1 day')
WHERE today.temp_c > yesterday.temp_c;
""",
        "explanation": """
<p>The join condition does the date arithmetic explicitly: a row only qualifies if a reading exists for
exactly one calendar day earlier. 2025-03-06 (19.0°) is <em>not</em> returned even though it's warmer
than the last available reading, because 2025-03-05 is missing.</p>
<p>A <code>LAG()</code> solution is fine <em>if</em> you also check the lagged date:
<code>LAG(reading_date)</code> must equal <code>date(reading_date, '-1 day')</code>. Interviewers use the
gap to separate candidates who think about data quality from those who pattern-match.</p>
""",
        "hints": [
            "'Previous calendar day' is not the same as 'previous row' when days are missing.",
            "Self-join the table to itself, offsetting the date by one day in the join condition.",
            "SQLite: date(reading_date, '-1 day'). If you use LAG, also lag the date and verify it.",
        ],
        "order_matters": False,
    },
    {
        "id": "m05",
        "title": "Latest Status per Shipment",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["FedEx", "Flexport", "Amazon"],
        "description": """
<p><strong>Parcelry</strong>, a logistics platform, stores an append-only event log: every status change
of every shipment is a new row. The tracking page needs each shipment's <em>current</em> (most recent)
status.</p>
<p>This "latest record per entity" pattern is one of the most common real-world data engineering tasks —
event logs, CDC streams, and SCD tables all need it.</p>
<p><strong>Return columns:</strong> <code>shipment_id</code>, <code>status</code> — any order.</p>
""",
        "schema": """
CREATE TABLE shipment_events (
    event_id    INTEGER PRIMARY KEY,
    shipment_id INTEGER NOT NULL,
    status      TEXT NOT NULL,
    event_time  TEXT NOT NULL
);
INSERT INTO shipment_events VALUES
 (1,  501, 'label_created', '2025-05-01 08:00:00'),
 (2,  501, 'picked_up',     '2025-05-01 14:30:00'),
 (3,  501, 'in_transit',    '2025-05-02 06:15:00'),
 (4,  501, 'delivered',     '2025-05-04 11:42:00'),
 (5,  502, 'label_created', '2025-05-02 09:10:00'),
 (6,  502, 'picked_up',     '2025-05-03 10:05:00'),
 (7,  502, 'in_transit',    '2025-05-03 22:48:00'),
 (8,  503, 'label_created', '2025-05-04 16:20:00'),
 (9,  504, 'label_created', '2025-05-01 12:00:00'),
 (10, 504, 'picked_up',     '2025-05-02 09:30:00'),
 (11, 504, 'in_transit',    '2025-05-02 18:55:00'),
 (12, 504, 'out_for_delivery', '2025-05-05 07:25:00');
""",
        "solution": """
WITH numbered AS (
    SELECT shipment_id,
           status,
           ROW_NUMBER() OVER (
               PARTITION BY shipment_id
               ORDER BY event_time DESC
           ) AS rn
    FROM shipment_events
)
SELECT shipment_id, status
FROM numbered
WHERE rn = 1;
""",
        "explanation": """
<p><code>ROW_NUMBER()</code> partitioned by shipment and ordered by time <em>descending</em> stamps the
newest event of each shipment with 1; keep those rows. This is the canonical deduplication idiom in
warehouses (BigQuery's <code>QUALIFY rn = 1</code>, Snowflake's same).</p>
<p>The tempting shortcut <code>GROUP BY shipment_id</code> + <code>MAX(event_time)</code> needs a join
back to fetch the status — selecting <code>status</code> alongside <code>MAX(event_time)</code> without
that join is non-deterministic in most engines (SQLite happens to allow it as a documented quirk, but
don't rely on it in interviews).</p>
""",
        "hints": [
            "You want exactly one row per shipment — the newest one.",
            "ROW_NUMBER() OVER (PARTITION BY shipment_id ORDER BY event_time DESC).",
            "Wrap it in a CTE and keep rows where the row number is 1.",
        ],
        "order_matters": False,
    },
    {
        "id": "m06",
        "title": "Running Revenue Total",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Stripe", "Square", "PayPal"],
        "description": """
<p>Finance at <strong>Brewline</strong>, a coffee subscription company, wants a chart of cumulative
revenue through the month: for each day, the day's revenue plus everything before it.</p>
<p><strong>Return columns:</strong> <code>sale_date</code>, <code>revenue</code>,
<code>running_total</code> — ordered by <code>sale_date</code> ascending.</p>
""",
        "schema": """
CREATE TABLE daily_revenue (
    sale_date TEXT PRIMARY KEY,
    revenue   REAL NOT NULL
);
INSERT INTO daily_revenue VALUES
 ('2025-06-01', 1240.00),
 ('2025-06-02',  980.50),
 ('2025-06-03', 1530.25),
 ('2025-06-04',  640.00),
 ('2025-06-05', 2210.75),
 ('2025-06-06', 1875.00),
 ('2025-06-07',  990.40);
""",
        "solution": """
SELECT sale_date,
       revenue,
       SUM(revenue) OVER (ORDER BY sale_date) AS running_total
FROM daily_revenue
ORDER BY sale_date;
""",
        "explanation": """
<p>A windowed <code>SUM</code> with only an <code>ORDER BY</code> (no <code>PARTITION BY</code>) defaults
to the frame <em>unbounded preceding → current row</em>, which is exactly a running total. No self-join,
no correlated subquery needed.</p>
<p>The pre-window-function way — joining the table to itself on <code>b.sale_date &lt;=
a.sale_date</code> — still works and is worth knowing, but it's O(n²) and interviewers expect you to
reach for the window function first.</p>
""",
        "hints": [
            "This is an aggregate that doesn't collapse rows — that's a window function.",
            "SUM(...) OVER (ORDER BY sale_date).",
            "With ORDER BY in the window, the default frame is 'everything up to this row'.",
        ],
        "order_matters": True,
    },
    {
        "id": "m07",
        "title": "Repeat Customer Rate",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["DoorDash", "Instacart", "Uber Eats"],
        "description": """
<p><strong>Forkful</strong>, a food delivery app, tracks loyalty with one number: of all customers who
have ever ordered, what percentage ordered <em>more than once</em>?</p>
<p><strong>Return column:</strong> <code>repeat_rate</code> — a single value, as a percentage rounded to
1 decimal place (e.g. <code>57.1</code>).</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    order_date  TEXT NOT NULL,
    total       REAL NOT NULL
);
INSERT INTO orders VALUES
 (1,  11, '2025-03-01', 24.10),
 (2,  12, '2025-03-01', 31.75),
 (3,  11, '2025-03-04', 18.20),
 (4,  13, '2025-03-05', 42.00),
 (5,  14, '2025-03-06', 15.60),
 (6,  12, '2025-03-09', 27.35),
 (7,  15, '2025-03-10', 22.90),
 (8,  11, '2025-03-12', 19.99),
 (9,  16, '2025-03-15', 38.40),
 (10, 17, '2025-03-18', 11.25),
 (11, 13, '2025-03-21', 29.80),
 (12, 16, '2025-03-25', 17.10);
""",
        "solution": """
WITH per_customer AS (
    SELECT customer_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY customer_id
)
SELECT ROUND(100.0 * SUM(CASE WHEN order_count >= 2 THEN 1 ELSE 0 END) / COUNT(*), 1)
         AS repeat_rate
FROM per_customer;
""",
        "explanation": """
<p>Two layers of aggregation: first collapse orders to one row per customer with their order count, then
aggregate <em>that</em> to a single rate. 7 customers ordered; 4 of them (11, 12, 13, 16) ordered twice
or more → 57.1%.</p>
<p>The <code>100.0</code> (not <code>100</code>) matters: it forces floating-point division. With integer
operands many engines — SQLite included for <code>/</code> on two integers — would truncate to 0.
Conditional aggregation (<code>SUM(CASE WHEN ...)</code>) is a pattern you'll reuse constantly.</p>
""",
        "hints": [
            "First aggregate to one row per customer (their order count), then aggregate again.",
            "SUM(CASE WHEN cnt >= 2 THEN 1 ELSE 0 END) counts repeat customers.",
            "Multiply by 100.0 — integer division would give you 0.",
        ],
        "order_matters": False,
    },
    {
        "id": "m08",
        "title": "Frequently Bought Together",
        "difficulty": "Medium",
        "category": "Self-Joins",
        "companies": ["Amazon", "Instacart"],
        "description": """
<p><strong>Snackrack</strong>, an online grocer, wants "frequently bought together" suggestions. Two
products are a candidate pair if they appear in the same order at least <strong>2 distinct orders</strong>.</p>
<p>Return each qualifying pair once, with the products in alphabetical order within the pair
(<code>product_a &lt; product_b</code>), and the number of orders containing both.</p>
<p><strong>Return columns:</strong> <code>product_a</code>, <code>product_b</code>,
<code>orders_together</code> — any order.</p>
""",
        "schema": """
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL
);
CREATE TABLE order_items (
    order_id   INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    PRIMARY KEY (order_id, product_id)
);
INSERT INTO products VALUES
 (1, 'Almond Butter'),
 (2, 'Banana Chips'),
 (3, 'Cold Brew'),
 (4, 'Dark Chocolate'),
 (5, 'Granola');
INSERT INTO order_items VALUES
 (901, 1), (901, 2), (901, 5),
 (902, 1), (902, 5),
 (903, 3), (903, 4),
 (904, 1), (904, 2),
 (905, 3), (905, 4), (905, 5),
 (906, 2), (906, 5),
 (907, 1), (907, 5);
""",
        "solution": """
SELECT pa.name AS product_a,
       pb.name AS product_b,
       COUNT(DISTINCT i1.order_id) AS orders_together
FROM order_items i1
JOIN order_items i2
  ON i2.order_id = i1.order_id
JOIN products pa ON pa.product_id = i1.product_id
JOIN products pb ON pb.product_id = i2.product_id
WHERE pa.name < pb.name
GROUP BY pa.name, pb.name
HAVING COUNT(DISTINCT i1.order_id) >= 2;
""",
        "explanation": """
<p>Self-joining <code>order_items</code> on the order id produces every pairing of items within an order.
The filter <code>pa.name &lt; pb.name</code> kills two birds: it removes self-pairs (a product with
itself) and keeps exactly one of the two mirror orderings (A,B vs B,A).</p>
<p>Qualifying pairs: Almond Butter + Granola (3 orders), Almond Butter + Banana Chips (2),
Banana Chips + Granola (2), Cold Brew + Dark Chocolate (2). This is the same shape as co-occurrence /
market-basket queries on much bigger data, where you'd add frequency cutoffs before the join.</p>
""",
        "hints": [
            "Self-join order_items to itself on order_id to form pairs within an order.",
            "Use an inequality (a < b) to avoid self-pairs and mirrored duplicates.",
            "Count DISTINCT orders, and filter with HAVING >= 2.",
        ],
        "order_matters": False,
    },
    {
        "id": "m09",
        "title": "Each Customer's Second Order",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Airbnb", "Booking.com"],
        "description": """
<p>Growth at <strong>Stayfinder</strong>, a vacation rental marketplace, studies the "second booking" —
the moment a customer becomes a repeat user. For every customer who has made at least two bookings,
return their <em>second-earliest</em> booking.</p>
<p><strong>Return columns:</strong> <code>customer_id</code>, <code>booking_id</code>,
<code>booking_date</code> — any order.</p>
""",
        "schema": """
CREATE TABLE bookings (
    booking_id  INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL,
    nightly_rate REAL NOT NULL
);
INSERT INTO bookings VALUES
 (1, 71, '2024-11-02', 145.00),
 (2, 72, '2024-11-15', 210.00),
 (3, 71, '2025-01-10', 132.00),
 (4, 73, '2025-01-12', 95.00),
 (5, 72, '2025-02-03', 188.00),
 (6, 71, '2025-03-22', 176.00),
 (7, 74, '2025-04-01', 230.00),
 (8, 73, '2025-04-18', 110.00),
 (9, 72, '2025-05-09', 205.00);
""",
        "solution": """
WITH numbered AS (
    SELECT booking_id,
           customer_id,
           booking_date,
           ROW_NUMBER() OVER (
               PARTITION BY customer_id
               ORDER BY booking_date
           ) AS rn
    FROM bookings
)
SELECT customer_id, booking_id, booking_date
FROM numbered
WHERE rn = 2;
""",
        "explanation": """
<p>The mirror image of "latest record per group": number each customer's bookings chronologically
(ascending this time) and keep row 2. Customer 74 has only one booking and drops out naturally — no
special-casing needed.</p>
<p>This generalizes to "nth event per entity," which shows up in activation analysis (second session,
third purchase) all the time. <code>ROW_NUMBER</code> is correct here rather than <code>RANK</code>
because each customer's dates are unique; if same-day bookings were possible you'd add a tiebreaker
column to the window's ORDER BY.</p>
""",
        "hints": [
            "Number each customer's bookings in date order.",
            "PARTITION BY customer_id, ORDER BY booking_date ascending.",
            "Keep the rows numbered 2 — customers with one booking never get a 2.",
        ],
        "order_matters": False,
    },
    {
        "id": "m10",
        "title": "Signup Funnel by Channel",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["HubSpot", "Dropbox", "Canva"],
        "description": """
<p><strong>Briefly</strong>, a SaaS note-taking app, runs ads on several channels. For each channel,
marketing wants: total visits, how many of those visits converted to a signup, and the conversion rate.</p>
<p>Every signup links back to the visit it came from. Channels with zero signups must still appear.</p>
<p><strong>Return columns:</strong> <code>channel</code>, <code>visits</code>, <code>signups</code>,
<code>conversion_rate</code> (percentage, 1 decimal) — ordered by <code>conversion_rate</code> descending.</p>
""",
        "schema": """
CREATE TABLE visits (
    visit_id   INTEGER PRIMARY KEY,
    channel    TEXT NOT NULL,    -- 'search', 'social', 'email', 'referral'
    visit_date TEXT NOT NULL
);
CREATE TABLE signups (
    signup_id  INTEGER PRIMARY KEY,
    visit_id   INTEGER NOT NULL,
    signup_date TEXT NOT NULL
);
INSERT INTO visits VALUES
 (1,  'search',   '2025-05-01'), (2,  'search',   '2025-05-01'),
 (3,  'social',   '2025-05-01'), (4,  'email',    '2025-05-02'),
 (5,  'search',   '2025-05-02'), (6,  'social',   '2025-05-02'),
 (7,  'referral', '2025-05-03'), (8,  'search',   '2025-05-03'),
 (9,  'email',    '2025-05-03'), (10, 'social',   '2025-05-04'),
 (11, 'search',   '2025-05-04'), (12, 'email',    '2025-05-04'),
 (13, 'social',   '2025-05-05'), (14, 'referral', '2025-05-05'),
 (15, 'search',   '2025-05-05');
INSERT INTO signups VALUES
 (1, 2,  '2025-05-01'),
 (2, 5,  '2025-05-02'),
 (3, 4,  '2025-05-02'),
 (4, 8,  '2025-05-03'),
 (5, 12, '2025-05-04'),
 (6, 10, '2025-05-04');
""",
        "solution": """
SELECT v.channel,
       COUNT(*) AS visits,
       COUNT(s.signup_id) AS signups,
       ROUND(100.0 * COUNT(s.signup_id) / COUNT(*), 1) AS conversion_rate
FROM visits v
LEFT JOIN signups s ON s.visit_id = v.visit_id
GROUP BY v.channel
ORDER BY conversion_rate DESC;
""",
        "explanation": """
<p>The key trick: after a <code>LEFT JOIN</code>, <code>COUNT(*)</code> counts all rows (every visit)
while <code>COUNT(s.signup_id)</code> counts only rows where the join matched — because <code>COUNT</code>
of a column skips NULLs. One query, both funnel stages.</p>
<p>Email converts at 66.7% (2/3), search 50% (3/6), social 25% (1/4), referral 0% (0/2) — and referral
still appears, which an inner join would have broken. Funnel queries like this are a staple of analytics
engineering interviews.</p>
""",
        "hints": [
            "LEFT JOIN keeps channels with zero signups in the result.",
            "COUNT(*) vs COUNT(column): one counts rows, the other skips NULLs.",
            "100.0 * matched / total, rounded to 1 decimal.",
        ],
        "order_matters": True,
    },
    {
        "id": "m11",
        "title": "Average Days to First Order",
        "difficulty": "Medium",
        "category": "Date/Time",
        "companies": ["Shopify", "Etsy", "Wayfair"],
        "description": """
<p><strong>Mosaic Market</strong>, a handmade-goods marketplace, measures activation speed: on average,
how many days pass between a user signing up and placing their <em>first</em> order? Users who never
ordered are excluded.</p>
<p><strong>Return column:</strong> <code>avg_days_to_first_order</code> — a single value rounded to
1 decimal place.</p>
""",
        "schema": """
CREATE TABLE users (
    user_id     INTEGER PRIMARY KEY,
    signup_date TEXT NOT NULL
);
CREATE TABLE orders (
    order_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    total      REAL NOT NULL
);
INSERT INTO users VALUES
 (1, '2025-01-05'),
 (2, '2025-01-10'),
 (3, '2025-01-12'),
 (4, '2025-02-01'),
 (5, '2025-02-14'),
 (6, '2025-03-03');
INSERT INTO orders VALUES
 (1, 1, '2025-01-07', 49.00),
 (2, 1, '2025-01-20', 25.50),
 (3, 2, '2025-02-09', 120.00),
 (4, 3, '2025-01-12', 15.75),
 (5, 5, '2025-03-02', 60.20),
 (6, 2, '2025-03-15', 35.00),
 (7, 5, '2025-04-11', 78.90);
""",
        "solution": """
WITH first_orders AS (
    SELECT user_id, MIN(order_date) AS first_order_date
    FROM orders
    GROUP BY user_id
)
SELECT ROUND(
         AVG(julianday(f.first_order_date) - julianday(u.signup_date)),
         1
       ) AS avg_days_to_first_order
FROM first_orders f
JOIN users u ON u.user_id = f.user_id;
""",
        "explanation": """
<p>Step one: reduce orders to each user's <em>first</em> order with <code>MIN(order_date)</code> — using
all orders would skew the average badly (user 1's later order on 01-20 must not count). Step two: date
difference, averaged. SQLite uses <code>julianday()</code> arithmetic; Postgres would be
<code>first_order_date - signup_date</code>, BigQuery <code>DATE_DIFF</code>.</p>
<p>Gaps: user 1 → 2 days, user 2 → 30, user 3 → 0 (ordered the day they signed up — same-day must count
as 0, not be dropped), user 5 → 16. Average = 12.0. Users 4 and 6 never ordered and are excluded by the
inner join.</p>
""",
        "hints": [
            "First collapse orders to MIN(order_date) per user.",
            "An INNER JOIN to users drops the never-ordered users automatically.",
            "Date difference in SQLite: julianday(a) - julianday(b).",
        ],
        "order_matters": False,
    },
    {
        "id": "m12",
        "title": "Daily Cancellation Rate",
        "difficulty": "Medium",
        "category": "CASE Expressions",
        "companies": ["Uber", "Lyft", "Grab"],
        "description": """
<p>Ops at <strong>Swiftly</strong> (the ride-hailing company from the easy set) monitors marketplace
health via the daily cancellation rate: of all trips requested on a day, what percentage were cancelled
(by either side)?</p>
<p><strong>Return columns:</strong> <code>trip_date</code>, <code>cancellation_rate</code> (percentage,
1 decimal) — ordered by <code>trip_date</code> ascending.</p>
""",
        "schema": """
CREATE TABLE trips (
    trip_id   INTEGER PRIMARY KEY,
    trip_date TEXT NOT NULL,
    status    TEXT NOT NULL  -- 'completed', 'cancelled_by_driver', 'cancelled_by_rider'
);
INSERT INTO trips VALUES
 (1,  '2025-05-10', 'completed'),
 (2,  '2025-05-10', 'cancelled_by_rider'),
 (3,  '2025-05-10', 'completed'),
 (4,  '2025-05-10', 'completed'),
 (5,  '2025-05-11', 'cancelled_by_driver'),
 (6,  '2025-05-11', 'cancelled_by_rider'),
 (7,  '2025-05-11', 'completed'),
 (8,  '2025-05-12', 'completed'),
 (9,  '2025-05-12', 'completed'),
 (10, '2025-05-12', 'completed'),
 (11, '2025-05-13', 'cancelled_by_driver'),
 (12, '2025-05-13', 'completed'),
 (13, '2025-05-13', 'completed'),
 (14, '2025-05-13', 'cancelled_by_rider');
""",
        "solution": """
SELECT trip_date,
       ROUND(
         100.0 * SUM(CASE WHEN status LIKE 'cancelled%' THEN 1 ELSE 0 END) / COUNT(*),
         1
       ) AS cancellation_rate
FROM trips
GROUP BY trip_date
ORDER BY trip_date;
""",
        "explanation": """
<p>Conditional aggregation again: the <code>CASE</code> turns each row into a 1 or 0, the <code>SUM</code>
counts cancellations, and <code>COUNT(*)</code> is the denominator — all in one pass, no subqueries or
joins. <code>LIKE 'cancelled%'</code> covers both cancellation reasons.</p>
<p>Rates: 25.0, 66.7, 0.0, 50.0. Note 2025-05-12 correctly shows 0.0 rather than disappearing — a
<code>WHERE status LIKE 'cancelled%'</code> approach would lose that day entirely. When a metric needs
"x per total," filter inside the aggregate, not in WHERE.</p>
""",
        "hints": [
            "Don't filter cancellations in WHERE — you'd lose the denominator (and zero-rate days).",
            "SUM(CASE WHEN ... THEN 1 ELSE 0 END) / COUNT(*).",
            "Both cancellation statuses start with 'cancelled'.",
        ],
        "order_matters": True,
    },
    {
        "id": "m13",
        "title": "Above-Average Spenders",
        "difficulty": "Medium",
        "category": "Subqueries",
        "companies": ["Apple", "Best Buy"],
        "description": """
<p><strong>Tonebox</strong>, an audio gear store, defines VIPs as customers whose lifetime spend is
strictly greater than the <em>average lifetime spend</em> (averaged across customers who have ordered).</p>
<p>Careful: that's the average of <em>per-customer totals</em>, not the average order amount.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>total_spent</code> — ordered by
<code>total_spent</code> descending.</p>
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
 (1, 'Marisol Vega'),
 (2, 'Henrik Olsen'),
 (3, 'Asha Gupta'),
 (4, 'Leo Costa'),
 (5, 'Faye Ndiaye');
INSERT INTO orders VALUES
 (1,  1, 120.00),
 (2,  1, 340.00),
 (3,  2, 89.00),
 (4,  3, 410.00),
 (5,  3, 95.00),
 (6,  3, 230.00),
 (7,  4, 60.00),
 (8,  4, 75.00),
 (9,  5, 180.00),
 (10, 1, 55.00);
""",
        "solution": """
WITH totals AS (
    SELECT customer_id, SUM(amount) AS total
    FROM orders
    GROUP BY customer_id
)
SELECT c.name,
       t.total AS total_spent
FROM totals t
JOIN customers c ON c.customer_id = t.customer_id
WHERE t.total > (SELECT AVG(total) FROM totals)
ORDER BY total_spent DESC;
""",
        "explanation": """
<p>The CTE computes lifetime spend per customer; the scalar subquery averages those totals (avg of 515,
89, 735, 135, 180 = 330.80). Asha (735) and Marisol (515) clear the bar.</p>
<p>The distinction the question hinges on: <code>AVG(amount)</code> over raw orders is 165.40 — a
different number answering a different question. Mixing up grain (per-order vs per-customer) is one of
the most common analytical mistakes, and interviewers deliberately phrase questions to test it.</p>
""",
        "hints": [
            "Compute per-customer totals first (CTE or subquery).",
            "The threshold is AVG over those totals — not AVG(amount) over orders.",
            "Compare each customer's total against the scalar subquery.",
        ],
        "order_matters": True,
    },
    {
        "id": "m14",
        "title": "Customers Who Bought Every Category",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["Costco", "Amazon"],
        "description": """
<p><strong>Pantryland</strong>, a wholesale club, wants to identify its most diversified shoppers:
customers who have purchased from <em>every</em> product category the store carries.</p>
<p>This pattern is called <em>relational division</em> — "find entities related to ALL members of a
set."</p>
<p><strong>Return column:</strong> <code>name</code> — any order.</p>
""",
        "schema": """
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL
);
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL
);
CREATE TABLE purchases (
    purchase_id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    product_id  INTEGER NOT NULL
);
INSERT INTO products VALUES
 (1, 'Trail Mix',      'Snacks'),
 (2, 'Sparkling Water','Beverages'),
 (3, 'Paper Towels',   'Household'),
 (4, 'Dark Roast',     'Beverages'),
 (5, 'Pita Chips',     'Snacks'),
 (6, 'Dish Soap',      'Household');
INSERT INTO customers VALUES
 (1, 'Rosa Linden'),
 (2, 'Max Okada'),
 (3, 'Ines Farah'),
 (4, 'Coby Mitchell');
INSERT INTO purchases VALUES
 (1,  1, 1), (2,  1, 2), (3,  1, 3),
 (4,  2, 1), (5,  2, 5), (6,  2, 1),
 (7,  3, 4), (8,  3, 5), (9,  3, 6), (10, 3, 2),
 (11, 4, 3), (12, 4, 4);
""",
        "solution": """
SELECT c.name
FROM customers c
JOIN purchases pu ON pu.customer_id = c.customer_id
JOIN products  pr ON pr.product_id = pu.product_id
GROUP BY c.customer_id, c.name
HAVING COUNT(DISTINCT pr.category) =
       (SELECT COUNT(DISTINCT category) FROM products);
""",
        "explanation": """
<p>Relational division via counting: if a customer's purchases span as many <em>distinct</em> categories
as exist in total (3 here), they've covered them all. Rosa (Snacks, Beverages, Household) and Ines
(Beverages, Snacks, Household) qualify; Max bought 3 items but only 2 distinct categories.</p>
<p>The <code>DISTINCT</code> inside the count is load-bearing — Max's duplicate Trail Mix purchase would
otherwise be counted twice. The scalar subquery keeps the query correct even when a new category is added
later, instead of hard-coding 3.</p>
""",
        "hints": [
            "Count how many distinct categories each customer has purchased from.",
            "Compare it to the total number of distinct categories (a scalar subquery).",
            "COUNT(DISTINCT ...) — duplicates within a category must not inflate the count.",
        ],
        "order_matters": False,
    },
]
