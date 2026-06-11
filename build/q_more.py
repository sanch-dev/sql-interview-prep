# Expansion pack — original content, interview-style.

EASY_MORE = [
    {
        "id": "e13",
        "title": "Users Across Two Platforms",
        "difficulty": "Easy",
        "category": "Set Operations",
        "companies": ["Spotify", "Snap"],
        "description": """
<p><strong>Chirper</strong> ships separate iOS and Android builds, and (regrettably) the events land in
two separate tables. Product wants one deduplicated list of every user who was active on
<em>either</em> platform.</p>
<p>A user who appears in both tables — or several times in one — must appear exactly once.</p>
<p><strong>Return column:</strong> <code>user_id</code> — ordered ascending.</p>
""",
        "schema": """
CREATE TABLE ios_events (
    event_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    event_date TEXT NOT NULL
);
CREATE TABLE android_events (
    event_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    event_date TEXT NOT NULL
);
INSERT INTO ios_events VALUES
 (1, 501, '2025-05-01'),
 (2, 502, '2025-05-01'),
 (3, 501, '2025-05-02'),
 (4, 504, '2025-05-03'),
 (5, 506, '2025-05-04');
INSERT INTO android_events VALUES
 (1, 502, '2025-05-01'),
 (2, 503, '2025-05-02'),
 (3, 505, '2025-05-02'),
 (4, 503, '2025-05-03'),
 (5, 506, '2025-05-05');
""",
        "solution": """
SELECT user_id FROM ios_events
UNION
SELECT user_id FROM android_events
ORDER BY user_id;
""",
        "explanation": """
<p><code>UNION</code> stacks two result sets <em>and removes duplicates</em> — both across the two tables
(users 502 and 506 appear in each) and within one table (501 has two iOS events). Its sibling
<code>UNION ALL</code> keeps duplicates and is much cheaper, since it skips the dedup step.</p>
<p>The interview talking point: default to <code>UNION ALL</code> in pipelines unless you specifically
need dedup — on billions of rows the implicit DISTINCT of <code>UNION</code> is an expensive surprise.
Expected output: 501–506, six rows.</p>
""",
        "hints": [
            "Two tables with the same shape need to be stacked vertically — that's a set operation, not a join.",
            "UNION vs UNION ALL: one of them deduplicates.",
            "A single ORDER BY at the end sorts the combined result.",
        ],
        "order_matters": True,
    },
    {
        "id": "e14",
        "title": "Finding Refund Tickets",
        "difficulty": "Easy",
        "category": "String Functions",
        "companies": ["Zendesk", "Shopify"],
        "description": """
<p>The support team at <strong>Parcelry</strong> triages tickets by keyword. Find every ticket whose
subject mentions <code>refund</code> in <em>any</em> capitalization — "Refund", "REFUND", and
"refund" all count, and the word can appear anywhere in the subject.</p>
<p><strong>Return columns:</strong> <code>ticket_id</code>, <code>subject</code> — any order.</p>
""",
        "schema": """
CREATE TABLE tickets (
    ticket_id  INTEGER PRIMARY KEY,
    subject    TEXT NOT NULL,
    created_at TEXT NOT NULL
);
INSERT INTO tickets VALUES
 (1, 'Refund for damaged package',           '2025-06-01'),
 (2, 'Where is my order?',                   '2025-06-01'),
 (3, 'Please process my REFUND immediately', '2025-06-02'),
 (4, 'Change delivery address',              '2025-06-02'),
 (5, 'partial refund request',               '2025-06-03'),
 (6, 'App crashes on login',                 '2025-06-03'),
 (7, 'Refunding my subscription fee',        '2025-06-04'),
 (8, 'Damaged box, want money back',         '2025-06-04');
""",
        "solution": """
SELECT ticket_id, subject
FROM tickets
WHERE LOWER(subject) LIKE '%refund%';
""",
        "explanation": """
<p>Lowercasing the column first makes the match case-insensitive in any engine, and the
<code>%</code> wildcards on both sides mean "anywhere in the string." Note that ticket 7
("Refund<em>ing</em>") matches too — substring matching doesn't respect word boundaries, and ticket 8
("want money back") doesn't match at all despite clearly being a refund request.</p>
<p>Both make the real-world point interviewers want to hear: keyword <code>LIKE</code> filters are crude.
Word-boundary regexes, full-text indexes, or a classifier are the production answers — but
<code>LIKE</code> is still the first tool for quick triage. (SQLite's <code>LIKE</code> happens to be
case-insensitive for ASCII already; <code>LOWER()</code> makes your intent portable.)</p>
""",
        "hints": [
            "LIKE with % wildcards matches substrings: '%word%'.",
            "Normalize case first — LOWER(subject) — so any capitalization matches.",
            "No need for OR chains; one normalized pattern covers all variants.",
        ],
        "order_matters": False,
    },
    {
        "id": "e15",
        "title": "Cheapest and Priciest per Category",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["eBay", "Craigslist"],
        "description": """
<p><strong>Swapmeet</strong>, a second-hand marketplace, shows a price range on every category page:
the cheapest and most expensive active listing.</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>min_price</code>,
<code>max_price</code> — ordered by <code>category</code> ascending.</p>
""",
        "schema": """
CREATE TABLE listings (
    listing_id INTEGER PRIMARY KEY,
    category   TEXT NOT NULL,
    title      TEXT NOT NULL,
    price      REAL NOT NULL
);
INSERT INTO listings VALUES
 (1,  'Bikes',   'Vintage road bike',     280.00),
 (2,  'Bikes',   'Kids mountain bike',     95.00),
 (3,  'Bikes',   'Carbon gravel bike',   1450.00),
 (4,  'Cameras', 'Film SLR with lens',    175.00),
 (5,  'Cameras', 'Action cam',             89.50),
 (6,  'Cameras', 'Mirrorless body',       640.00),
 (7,  'Laptops', '13-inch ultrabook',     520.00),
 (8,  'Laptops', 'Gaming laptop',         980.00),
 (9,  'Laptops', 'Old netbook',            60.00),
 (10, 'Bikes',   'Folding commuter',      330.00);
""",
        "solution": """
SELECT category,
       MIN(price) AS min_price,
       MAX(price) AS max_price
FROM listings
GROUP BY category
ORDER BY category;
""",
        "explanation": """
<p>Multiple aggregates over the same groups in a single pass — <code>MIN</code> and <code>MAX</code>
side by side. Bikes: 95–1450, Cameras: 89.50–640, Laptops: 60–980.</p>
<p>The natural follow-up an interviewer will ask: "now give me the <em>title</em> of the cheapest listing
per category." That's a different problem — <code>MIN(price)</code> with <code>title</code> in the SELECT
is non-deterministic in most engines — and the answer is a window function
(<code>ROW_NUMBER() ... ORDER BY price</code>), which the medium set drills.</p>
""",
        "hints": [
            "One GROUP BY can feed several aggregate functions at once.",
            "MIN(price) and MAX(price) in the same SELECT.",
            "No HAVING needed — nothing is being filtered.",
        ],
        "order_matters": True,
    },
    {
        "id": "e16",
        "title": "Orders by Day of Week",
        "difficulty": "Easy",
        "category": "Date/Time",
        "companies": ["DoorDash", "Domino's"],
        "description": """
<p><strong>Bagelbox</strong> suspects weekends drive most of its orders and wants order counts by day of
week to plan kitchen staffing.</p>
<p>In SQLite, <code>strftime('%w', date)</code> returns the weekday as a string, <code>'0'</code> =
Sunday through <code>'6'</code> = Saturday.</p>
<p><strong>Return columns:</strong> <code>weekday_num</code>, <code>order_count</code> — ordered by
<code>weekday_num</code> ascending. Weekdays with no orders may be omitted.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INTEGER PRIMARY KEY,
    order_date TEXT NOT NULL,
    amount     REAL NOT NULL
);
INSERT INTO orders VALUES
 (1,  '2025-06-01', 32.50),  -- Sunday
 (2,  '2025-06-02', 18.00),  -- Monday
 (3,  '2025-06-06', 45.25),  -- Friday
 (4,  '2025-06-07', 38.10),  -- Saturday
 (5,  '2025-06-07', 22.75),  -- Saturday
 (6,  '2025-06-08', 29.00),  -- Sunday
 (7,  '2025-06-08', 51.30),  -- Sunday
 (8,  '2025-06-09', 16.45),  -- Monday
 (9,  '2025-06-13', 33.20),  -- Friday
 (10, '2025-06-14', 27.85),  -- Saturday
 (11, '2025-06-14', 40.00),  -- Saturday
 (12, '2025-06-15', 35.60);  -- Sunday
""",
        "solution": """
SELECT strftime('%w', order_date) AS weekday_num,
       COUNT(*) AS order_count
FROM orders
GROUP BY weekday_num
ORDER BY weekday_num;
""",
        "explanation": """
<p>Grouping by a <em>derived expression</em> rather than a raw column — the bread and butter of date
analytics. Sunday (0) → 4 orders, Monday (1) → 2, Friday (5) → 2, Saturday (6) → 4: the weekend
hypothesis holds.</p>
<p>Every warehouse has its own spelling — <code>EXTRACT(DOW FROM ...)</code> in Postgres,
<code>DAYOFWEEK</code> in BigQuery (which is 1-based!), <code>DATE_PART</code> in Snowflake/Redshift.
The off-by-one between engines is a genuinely common production bug; saying so in an interview signals
experience. Tuesday–Thursday have no orders and vanish from the output — joining against a
0-to-6 calendar would fill them in.</p>
""",
        "hints": [
            "Extract the weekday from each date, then group by that expression.",
            "SQLite: strftime('%w', order_date) — '0' is Sunday.",
            "COUNT(*) per group; order by the weekday value.",
        ],
        "order_matters": True,
    },
]

MEDIUM_MORE = [
    {
        "id": "m15",
        "title": "Quarterly Sales Pivot",
        "difficulty": "Medium",
        "category": "CASE Expressions",
        "companies": ["Oracle", "SAP", "Salesforce"],
        "description": """
<p>The sales VP at <strong>Fieldstone</strong> wants the classic spreadsheet view: one row per product,
one column per quarter of 2025, revenue in the cells. SQL has no spreadsheet pivot button — you build it
with conditional aggregation.</p>
<p>Quarters: Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec. Products with no sales in a quarter
must show <code>0</code>, not NULL.</p>
<p><strong>Return columns:</strong> <code>product</code>, <code>q1</code>, <code>q2</code>,
<code>q3</code>, <code>q4</code> — ordered by <code>product</code> ascending.</p>
""",
        "schema": """
CREATE TABLE sales (
    sale_id   INTEGER PRIMARY KEY,
    product   TEXT NOT NULL,
    sale_date TEXT NOT NULL,
    amount    REAL NOT NULL
);
INSERT INTO sales VALUES
 (1,  'Alpha Kit', '2025-01-15', 1200.00),
 (2,  'Alpha Kit', '2025-02-20',  800.00),
 (3,  'Beta Pack', '2025-03-05', 1500.00),
 (4,  'Alpha Kit', '2025-04-12',  950.00),
 (5,  'Beta Pack', '2025-05-30',  700.00),
 (6,  'Beta Pack', '2025-06-18',  650.00),
 (7,  'Alpha Kit', '2025-08-09', 1100.00),
 (8,  'Beta Pack', '2025-09-27',  900.00),
 (9,  'Alpha Kit', '2025-11-11', 1400.00),
 (10, 'Alpha Kit', '2025-12-02',  600.00);
""",
        "solution": """
SELECT product,
       SUM(CASE WHEN strftime('%m', sale_date) IN ('01','02','03') THEN amount ELSE 0 END) AS q1,
       SUM(CASE WHEN strftime('%m', sale_date) IN ('04','05','06') THEN amount ELSE 0 END) AS q2,
       SUM(CASE WHEN strftime('%m', sale_date) IN ('07','08','09') THEN amount ELSE 0 END) AS q3,
       SUM(CASE WHEN strftime('%m', sale_date) IN ('10','11','12') THEN amount ELSE 0 END) AS q4
FROM sales
GROUP BY product
ORDER BY product;
""",
        "explanation": """
<p>Each output column is a <code>SUM</code> whose <code>CASE</code> only "lets through" rows from the
right quarter — everything else contributes the <code>ELSE 0</code>. Four filtered sums in one scan turn
rows into columns: that's a pivot.</p>
<p>The <code>ELSE 0</code> handles the spec's "0, not NULL" — Beta Pack has no Q4 sales, and without it
<code>SUM</code> over no matching rows would yield NULL. Some engines have a native
<code>PIVOT</code> keyword (Snowflake, SQL Server), but conditional aggregation is the portable form and
the one interviews test. Expected: Alpha Kit 2000/950/1100/2000, Beta Pack 1500/1350/900/0.</p>
""",
        "hints": [
            "One column per quarter = one SUM(CASE WHEN month-in-quarter THEN amount ELSE 0 END) each.",
            "strftime('%m', sale_date) gives the month as '01'…'12'.",
            "ELSE 0 (not omitted) is what turns empty quarters into 0 instead of NULL.",
        ],
        "order_matters": True,
    },
    {
        "id": "m16",
        "title": "Products That Got Cheaper",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Amazon", "Wayfair", "Booking.com"],
        "description": """
<p><strong>Gearloft</strong>, an outdoor equipment store, keeps a full price history: every price change
is a new row. Marketing wants a "price drop" badge for products whose <em>current</em> (latest) price is
lower than their <em>original</em> (earliest) price.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>first_price</code>,
<code>last_price</code> — any order.</p>
""",
        "schema": """
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL
);
CREATE TABLE price_history (
    change_id  INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    price      REAL NOT NULL,
    changed_at TEXT NOT NULL
);
INSERT INTO products VALUES
 (1, 'Trailrunner Shoes'),
 (2, 'City Backpack'),
 (3, 'Thermal Bottle'),
 (4, 'Rain Jacket');
INSERT INTO price_history VALUES
 (1,  1, 120.00, '2025-01-10'),
 (2,  1, 110.00, '2025-03-02'),
 (3,  1,  95.00, '2025-05-15'),
 (4,  2,  60.00, '2025-01-12'),
 (5,  2,  75.00, '2025-04-20'),
 (6,  3,  25.00, '2025-02-01'),
 (7,  3,  25.00, '2025-03-18'),
 (8,  3,  22.00, '2025-06-01'),
 (9,  4,  80.00, '2025-02-14');
""",
        "solution": """
WITH bounds AS (
    SELECT DISTINCT
           product_id,
           FIRST_VALUE(price) OVER (PARTITION BY product_id ORDER BY changed_at)      AS first_price,
           FIRST_VALUE(price) OVER (PARTITION BY product_id ORDER BY changed_at DESC) AS last_price
    FROM price_history
)
SELECT p.name,
       b.first_price,
       b.last_price
FROM bounds b
JOIN products p ON p.product_id = b.product_id
WHERE b.last_price < b.first_price;
""",
        "explanation": """
<p>Two <code>FIRST_VALUE</code> windows — one ordered ascending (earliest price), one descending (latest
price) — attach both endpoints to every row; <code>DISTINCT</code> collapses each product to one row.
Trailrunner Shoes (120 → 95) and Thermal Bottle (25 → 22) qualify; City Backpack went up; Rain Jacket
never changed, and <code>&lt;</code> being strict correctly excludes it.</p>
<p>Why not <code>LAST_VALUE</code> ascending? Its default window frame ends at the <em>current row</em>,
so it returns the row's own price, not the partition's last — the most notorious window-function gotcha.
Reversing the sort and using <code>FIRST_VALUE</code> sidesteps it. (MIN/MAX over <code>changed_at</code>
with a self-join is a fine non-window alternative.)</p>
""",
        "hints": [
            "You need each product's earliest price and latest price side by side.",
            "FIRST_VALUE ordered ASC gives the earliest; FIRST_VALUE ordered DESC gives the latest.",
            "LAST_VALUE has a default-frame trap — avoid it or fix the frame explicitly.",
        ],
        "order_matters": False,
    },
    {
        "id": "m17",
        "title": "Cross-Platform Power Users",
        "difficulty": "Medium",
        "category": "Aggregation",
        "companies": ["Netflix", "Disney+", "Spotify"],
        "description": """
<p><strong>Streamio</strong> logs every playback with the platform it ran on. Product wants users who
have streamed on <em>both</em> <code>mobile</code> and <code>tv</code> — they're the strongest
subscribers and the target for a new cross-device feature.</p>
<p><strong>Return column:</strong> <code>user_id</code> — ordered ascending.</p>
""",
        "schema": """
CREATE TABLE playbacks (
    playback_id INTEGER PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    platform    TEXT NOT NULL,    -- 'mobile', 'tv', 'web'
    played_at   TEXT NOT NULL
);
INSERT INTO playbacks VALUES
 (1,  1, 'mobile', '2025-05-01'),
 (2,  1, 'tv',     '2025-05-02'),
 (3,  2, 'mobile', '2025-05-01'),
 (4,  2, 'mobile', '2025-05-03'),
 (5,  3, 'tv',     '2025-05-02'),
 (6,  3, 'web',    '2025-05-04'),
 (7,  4, 'mobile', '2025-05-03'),
 (8,  4, 'web',    '2025-05-04'),
 (9,  4, 'tv',     '2025-05-06'),
 (10, 5, 'web',    '2025-05-05'),
 (11, 6, 'tv',     '2025-05-05'),
 (12, 6, 'mobile', '2025-05-07'),
 (13, 6, 'tv',     '2025-05-08');
""",
        "solution": """
SELECT user_id
FROM playbacks
WHERE platform IN ('mobile', 'tv')
GROUP BY user_id
HAVING COUNT(DISTINCT platform) = 2
ORDER BY user_id;
""",
        "explanation": """
<p>Filter to the two platforms of interest, group by user, and require <em>both</em> to be present:
<code>COUNT(DISTINCT platform) = 2</code>. The <code>DISTINCT</code> is essential — user 6 has two tv
playbacks, and counting rows instead of distinct platforms would wrongly admit a tv-only user with two
events. Users 1, 4, 6 qualify; user 2 is mobile-only, user 3's second platform is web.</p>
<p>Equivalent formulations worth knowing: <code>INTERSECT</code> between the mobile users and the tv
users, or a self-join. The HAVING-count version generalizes best ("users active on all N platforms") and
is the same relational-division pattern as "bought every category" from the medium set.</p>
""",
        "hints": [
            "Restrict to the two platforms first, then look at each user's variety.",
            "HAVING COUNT(DISTINCT platform) = 2 demands both platforms be present.",
            "Without DISTINCT, two playbacks on the same platform would slip through.",
        ],
        "order_matters": True,
    },
    {
        "id": "m18",
        "title": "Revenue Share Within Category",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Amazon", "Etsy", "Mercado Libre"],
        "description": """
<p>Category managers at <strong>Loft &amp; Ladder</strong> don't just want product revenue — they want
each product's <em>share of its category</em>: what percent of the category's total revenue does each
product contribute?</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>name</code>, <code>revenue</code>,
<code>category_share_pct</code> (1 decimal) — ordered by <code>category</code> ascending, then
<code>revenue</code> descending.</p>
""",
        "schema": """
CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL
);
CREATE TABLE order_items (
    item_id    INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL,
    quantity   INTEGER NOT NULL,
    unit_price REAL NOT NULL
);
INSERT INTO products VALUES
 (1, 'Oak Bookshelf',  'Furniture'),
 (2, 'Walnut Desk',    'Furniture'),
 (3, 'Linen Throw',    'Textiles'),
 (4, 'Wool Rug',       'Textiles'),
 (5, 'Velvet Cushion', 'Textiles');
INSERT INTO order_items VALUES
 (1, 1, 2, 250.00),
 (2, 2, 1, 600.00),
 (3, 1, 1, 250.00),
 (4, 3, 4,  45.00),
 (5, 4, 1, 320.00),
 (6, 5, 5,  30.00),
 (7, 4, 1, 320.00),
 (8, 3, 2,  45.00);
""",
        "solution": """
WITH revenue AS (
    SELECT p.category,
           p.name,
           SUM(oi.quantity * oi.unit_price) AS revenue
    FROM products p
    JOIN order_items oi ON oi.product_id = p.product_id
    GROUP BY p.product_id, p.category, p.name
)
SELECT category,
       name,
       revenue,
       ROUND(100.0 * revenue / SUM(revenue) OVER (PARTITION BY category), 1)
         AS category_share_pct
FROM revenue
ORDER BY category, revenue DESC;
""",
        "explanation": """
<p>The percent-of-total pattern: aggregate first (per-product revenue), then use a windowed
<code>SUM ... PARTITION BY category</code> as the denominator — it computes each category's total
<em>without collapsing the rows</em>, which a GROUP BY would do. Mixing aggregation grain
(per product) with a coarser denominator (per category) in one query is exactly what window functions
exist for.</p>
<p>Furniture totals 1350 — Bookshelf 750 (55.6%), Desk 600 (44.4%). Textiles totals 1060 — Rug 640
(60.4%), Throw 270 (25.5%), Cushion 150 (14.2%). Sanity-check the output by verifying each category's
shares sum to ~100% (rounding can leave them a tenth off) — a habit interviewers explicitly look for.
The same window-as-denominator move powers "% of company headcount per department" and every other
share-of-whole metric.</p>
""",
        "hints": [
            "Two grains at once: revenue per product, total per category. Aggregate then window.",
            "SUM(revenue) OVER (PARTITION BY category) is the denominator, computed per row.",
            "100.0 * numerator / denominator, ROUND to 1 decimal.",
        ],
        "order_matters": True,
    },
]

HARD_MORE = [
    {
        "id": "h11",
        "title": "Org Chart Depth",
        "difficulty": "Hard",
        "category": "Recursive CTEs",
        "companies": ["Microsoft", "Workday", "Rippling"],
        "description": """
<p><strong>Hexaware Labs</strong> (from the easy set) wants each employee's <em>level</em> in the org
chart: the CEO is level 1, their direct reports level 2, and so on. The hierarchy is arbitrarily deep,
so a fixed number of self-joins can't solve it — you need recursion.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>level</code> — ordered by
<code>level</code> ascending, then <code>name</code> ascending.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    manager_id INTEGER          -- NULL for the CEO
);
INSERT INTO employees VALUES
 (1, 'Priya Sharma', NULL),
 (2, 'Ben Carter',   1),
 (3, 'Olivia Stone', 1),
 (4, 'Marco Ruiz',   2),
 (5, 'Tina Wong',    2),
 (6, 'Felix Braun',  3),
 (7, 'Nora Quinn',   4),
 (8, 'Dev Anand',    4),
 (9, 'June Park',    6);
""",
        "solution": """
WITH RECURSIVE org AS (
    SELECT emp_id, name, 1 AS level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    SELECT e.emp_id, e.name, org.level + 1
    FROM employees e
    JOIN org ON e.manager_id = org.emp_id
)
SELECT name, level
FROM org
ORDER BY level, name;
""",
        "explanation": """
<p>A recursive CTE has two parts glued by <code>UNION ALL</code>: the <em>anchor</em> (the CEO, level 1)
and the <em>recursive member</em>, which joins the table back to the rows produced so far — each pass
finds the next layer of reports and stamps it <code>level + 1</code>. Recursion stops automatically when
a pass adds no rows.</p>
<p>Expected: Priya 1; Ben, Olivia 2; Felix, Marco, Tina 3; Dev, June, Nora 4. This is <em>the</em>
canonical recursive-CTE question — org charts, category trees, dependency graphs all reduce to it. Two
interview extensions worth rehearsing: building the full path string
(<code>path || ' > ' || name</code>), and cycle protection (a corrupted row making someone their own
ancestor recurses forever — Postgres has <code>CYCLE</code> clauses; elsewhere you cap depth).</p>
""",
        "hints": [
            "Arbitrary depth rules out self-joins — WITH RECURSIVE is the tool.",
            "Anchor: the row with manager_id IS NULL, at level 1.",
            "Recursive step: join employees to the CTE on manager_id = cte.emp_id, level + 1.",
        ],
        "order_matters": True,
    },
    {
        "id": "h12",
        "title": "Three Sold-Out Nights in a Row",
        "difficulty": "Hard",
        "category": "Gaps & Islands",
        "companies": ["Ticketmaster", "Live Nation", "Airbnb"],
        "description": """
<p><strong>The Velvet Room</strong>, a music venue, runs one show per night. A show is <em>sold out</em>
when <code>tickets_sold ≥ capacity</code>. The booking team wants every date that was part of a run of
<strong>3 or more consecutive sold-out nights</strong> — the signal to raise prices.</p>
<p>Unlike the streak-length question, here you must return the <em>dates themselves</em> — every date
inside a qualifying run.</p>
<p><strong>Return column:</strong> <code>show_date</code> — ordered ascending.</p>
""",
        "schema": """
CREATE TABLE shows (
    show_date    TEXT PRIMARY KEY,
    tickets_sold INTEGER NOT NULL,
    capacity     INTEGER NOT NULL
);
INSERT INTO shows VALUES
 ('2025-06-01',  80, 100),
 ('2025-06-02', 100, 100),
 ('2025-06-03', 105, 100),
 ('2025-06-04', 100, 100),
 ('2025-06-05',  70, 100),
 ('2025-06-06', 100, 100),
 ('2025-06-07', 110, 100),
 ('2025-06-08',  95, 100),
 ('2025-06-09', 100, 100),
 ('2025-06-10', 120, 100),
 ('2025-06-11', 100, 100),
 ('2025-06-12', 101, 100);
""",
        "solution": """
WITH sold_out AS (
    SELECT show_date
    FROM shows
    WHERE tickets_sold >= capacity
),
anchored AS (
    SELECT show_date,
           date(show_date,
                '-' || ROW_NUMBER() OVER (ORDER BY show_date) || ' day') AS anchor
    FROM sold_out
),
runs AS (
    SELECT anchor, COUNT(*) AS run_len
    FROM anchored
    GROUP BY anchor
)
SELECT a.show_date
FROM anchored a
JOIN runs r ON r.anchor = a.anchor
WHERE r.run_len >= 3
ORDER BY a.show_date;
""",
        "explanation": """
<p>Same gaps-and-islands anchor trick as the login-streak question (<code>date − row_number</code> is
constant within a consecutive run), with one extra move: after measuring each run's length, join
<em>back</em> to the anchored rows to recover the individual dates of qualifying runs. Aggregate, then
re-attach — a two-step you'll reuse constantly.</p>
<p>The runs: Jun 2–4 (3 nights ✓), Jun 6–7 (2 ✗), Jun 9–12 (4 ✓). Expected output: 06-02, 06-03, 06-04,
06-09, 06-10, 06-11, 06-12. This is the venue-flavored version of a famous interview classic usually
posed about stadium attendance; the window-free variant (joining each row to its ±1 and ±2 neighbors)
also works but doesn't generalize to "N or more".</p>
""",
        "hints": [
            "Filter to sold-out dates first; the problem is then purely about consecutive dates.",
            "date − row_number is constant within a consecutive run — group on that anchor.",
            "Count each run's length, then JOIN BACK to the per-date rows to output dates in runs ≥ 3.",
        ],
        "order_matters": True,
    },
    {
        "id": "h13",
        "title": "Completed the Funnel in Order",
        "difficulty": "Hard",
        "category": "Aggregation",
        "companies": ["Shopify", "Amazon", "Pinterest"],
        "description": """
<p><strong>Cartly</strong> defines a <em>clean conversion</em> strictly: a user must <code>view</code> a
product, <em>then</em> <code>cart</code> it, <em>then</em> <code>purchase</code> — in that chronological
order, based on each step's <strong>first</strong> occurrence. A user who purchases first and views later
(a re-order from email, say) doesn't count.</p>
<p>Find every user who completed the funnel in order.</p>
<p><strong>Return column:</strong> <code>user_id</code> — ordered ascending.</p>
""",
        "schema": """
CREATE TABLE events (
    event_id   INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    event_type TEXT NOT NULL,    -- 'view', 'cart', 'purchase'
    event_time TEXT NOT NULL
);
INSERT INTO events VALUES
 (1,  1, 'view',     '2025-05-01 10:00:00'),
 (2,  1, 'cart',     '2025-05-01 10:05:00'),
 (3,  1, 'purchase', '2025-05-01 10:20:00'),
 (4,  2, 'cart',     '2025-05-02 11:00:00'),
 (5,  2, 'view',     '2025-05-02 11:10:00'),
 (6,  2, 'purchase', '2025-05-02 11:30:00'),
 (7,  3, 'view',     '2025-05-03 09:15:00'),
 (8,  3, 'cart',     '2025-05-03 09:40:00'),
 (9,  4, 'purchase', '2025-05-04 08:00:00'),
 (10, 4, 'view',     '2025-05-04 08:30:00'),
 (11, 4, 'cart',     '2025-05-04 08:45:00'),
 (12, 5, 'view',     '2025-05-05 09:00:00'),
 (13, 5, 'view',     '2025-05-05 09:10:00'),
 (14, 5, 'cart',     '2025-05-05 09:30:00'),
 (15, 5, 'cart',     '2025-05-05 09:45:00'),
 (16, 5, 'purchase', '2025-05-05 09:50:00');
""",
        "solution": """
WITH firsts AS (
    SELECT user_id,
           MIN(CASE WHEN event_type = 'view'     THEN event_time END) AS first_view,
           MIN(CASE WHEN event_type = 'cart'     THEN event_time END) AS first_cart,
           MIN(CASE WHEN event_type = 'purchase' THEN event_time END) AS first_purchase
    FROM events
    GROUP BY user_id
)
SELECT user_id
FROM firsts
WHERE first_view < first_cart
  AND first_cart < first_purchase
ORDER BY user_id;
""",
        "explanation": """
<p>Conditional aggregation pivots each user's event log into one row with three timestamps:
<code>MIN(CASE WHEN type = X THEN time END)</code> is "first occurrence of X" (the CASE yields NULL for
other rows, and MIN ignores NULLs). Then the funnel condition is two plain comparisons.</p>
<p>The missing-step case needs no special handling: if a user never purchased, <code>first_purchase</code>
is NULL, and <code>first_cart &lt; NULL</code> is unknown — the row is filtered out by three-valued
logic. Expected: users 1 and 5 (user 5's duplicate views/carts are absorbed by MIN; user 2 carted before
viewing; user 3 never purchased; user 4 purchased first). Ordered-funnel analysis is a staple at any
company with a checkout flow, and this MIN-pivot beats the three-way self-join most candidates reach for.</p>
""",
        "hints": [
            "Get each step's FIRST timestamp per user: MIN(CASE WHEN type = '...' THEN event_time END).",
            "MIN skips the NULLs the CASE produces for other event types.",
            "Then just compare: first_view < first_cart < first_purchase. NULLs (missing steps) self-eliminate.",
        ],
        "order_matters": True,
    },
    {
        "id": "h14",
        "title": "Top Spender of Each Month",
        "difficulty": "Hard",
        "category": "Window Functions",
        "companies": ["American Express", "Uber", "Revolut"],
        "description": """
<p><strong>Vaultpay</strong> runs a monthly VIP program: the customer who spent the most that month gets
rewards. For each month, find the top spender — and when customers tie for the top spot, include
<em>all</em> of them.</p>
<p>Two layers to get right: first aggregate to (month, customer) spend, then rank <em>within each
month</em>.</p>
<p><strong>Return columns:</strong> <code>month</code> (<code>YYYY-MM</code>), <code>name</code>,
<code>monthly_spend</code> — ordered by <code>month</code> ascending, then <code>name</code> ascending.</p>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL
);
CREATE TABLE payments (
    payment_id  INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    paid_at     TEXT NOT NULL,
    amount      REAL NOT NULL
);
INSERT INTO customers VALUES
 (1, 'Aldo Reyes'),
 (2, 'Bea Tan'),
 (3, 'Cleo Marsh'),
 (4, 'Dmitri Volkov');
INSERT INTO payments VALUES
 (1,  1, '2025-01-05', 120.00),
 (2,  1, '2025-01-22', 180.00),
 (3,  2, '2025-01-09', 250.00),
 (4,  3, '2025-01-30', 140.00),
 (5,  1, '2025-02-03', 200.00),
 (6,  2, '2025-02-11', 90.00),
 (7,  2, '2025-02-25', 110.00),
 (8,  3, '2025-02-14', 75.00),
 (9,  4, '2025-02-20', 125.00),
 (10, 2, '2025-03-08', 300.00),
 (11, 3, '2025-03-15', 220.00),
 (12, 4, '2025-03-19', 160.00),
 (13, 4, '2025-03-28', 140.00),
 (14, 1, '2025-03-31', 95.00);
""",
        "solution": """
WITH monthly AS (
    SELECT strftime('%Y-%m', p.paid_at) AS month,
           c.name,
           SUM(p.amount) AS monthly_spend
    FROM payments p
    JOIN customers c ON c.customer_id = p.customer_id
    GROUP BY month, c.customer_id, c.name
),
ranked AS (
    SELECT month,
           name,
           monthly_spend,
           RANK() OVER (PARTITION BY month ORDER BY monthly_spend DESC) AS rnk
    FROM monthly
)
SELECT month, name, monthly_spend
FROM ranked
WHERE rnk = 1
ORDER BY month, name;
""",
        "explanation": """
<p>Aggregate-then-rank, with the partition on the <em>derived</em> month column: the first CTE rolls
payments up to (month, customer) totals, the second ranks within each month, keeping ties via
<code>RANK</code>.</p>
<p>February is the trap: Aldo and Bea both total exactly 200.00, so both are returned —
<code>ROW_NUMBER</code> would silently crown one of them, and which one would be nondeterministic.
Expected: Jan → Aldo (300); Feb → Aldo and Bea (200 each); Mar → Bea and Dmitri (300 each). Five rows
total. The same shape answers "top product per store per week" and a dozen other leaderboard-with-ties
questions.</p>
""",
        "hints": [
            "Grain first: SUM to (month, customer) before any ranking.",
            "RANK() OVER (PARTITION BY month ORDER BY spend DESC), keep rank 1.",
            "Two months contain exact ties — RANK keeps them, ROW_NUMBER would not.",
        ],
        "order_matters": True,
    },
]
