# Easy questions — original content, interview-style.
# Each dict is one question. `solution` is executed at build time and at
# runtime in the browser to produce the expected result set.

EASY = [
    {
        "id": "e01",
        "title": "Active Premium Subscribers",
        "difficulty": "Easy",
        "category": "Filtering",
        "companies": ["Netflix", "Spotify"],
        "description": """
<p>You're an analyst at <strong>Streamio</strong>, a video streaming service. Marketing wants to send a
thank-you email to everyone on the <code>premium</code> plan whose subscription is currently
<code>active</code>.</p>
<p>Write a query that returns the <code>name</code> and <code>country</code> of every active premium
subscriber, sorted alphabetically by name.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>country</code> — ordered by <code>name</code> ascending.</p>
""",
        "schema": """
CREATE TABLE subscribers (
    sub_id      INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    country     TEXT NOT NULL,
    plan        TEXT NOT NULL,      -- 'basic', 'standard', 'premium'
    status      TEXT NOT NULL,      -- 'active', 'paused', 'cancelled'
    signup_date TEXT NOT NULL
);
INSERT INTO subscribers VALUES
 (1,  'Ava Chen',        'US', 'premium',  'active',    '2024-03-12'),
 (2,  'Liam Patel',      'IN', 'basic',    'active',    '2024-05-01'),
 (3,  'Sofia Rossi',     'IT', 'premium',  'cancelled', '2023-11-20'),
 (4,  'Noah Kim',        'KR', 'standard', 'active',    '2024-01-15'),
 (5,  'Emma Müller',     'DE', 'premium',  'active',    '2024-07-09'),
 (6,  'Lucas Silva',     'BR', 'premium',  'paused',    '2024-02-28'),
 (7,  'Mia Johnson',     'US', 'standard', 'cancelled', '2023-09-05'),
 (8,  'Yuki Tanaka',     'JP', 'premium',  'active',    '2025-01-22'),
 (9,  'Omar Haddad',     'AE', 'basic',    'paused',    '2024-10-30'),
 (10, 'Isabella Lopez',  'MX', 'premium',  'active',    '2024-12-14');
""",
        "solution": """
SELECT name, country
FROM subscribers
WHERE plan = 'premium' AND status = 'active'
ORDER BY name;
""",
        "explanation": """
<p>This is a pure <code>WHERE</code>-clause question. Both conditions must hold at the same time, so they
are combined with <code>AND</code>. String comparisons in SQL use single quotes.</p>
<p>The interviewer is checking that you don't confuse <code>AND</code>/<code>OR</code> precedence and that
you remember the <code>ORDER BY</code> the prompt asks for. In production you'd also confirm whether
plan/status values are case-consistent before relying on equality checks.</p>
""",
        "hints": [
            "You need two conditions to be true at once — combine them in the WHERE clause.",
            "String literals use single quotes: plan = 'premium'.",
            "Don't forget the ORDER BY name the prompt asks for.",
        ],
        "order_matters": True,
    },
    {
        "id": "e02",
        "title": "Second Highest Salary",
        "difficulty": "Easy",
        "category": "Subqueries",
        "companies": ["Amazon", "Meta", "Adobe"],
        "description": """
<p><strong>LedgerPay</strong>, a fintech startup, is benchmarking compensation. HR wants to know the
<em>second highest distinct salary</em> across the whole company.</p>
<p>Note that two employees share the top salary — your query must treat duplicate salaries as one value.
If you simply sort and take the second row, you'll get the wrong answer.</p>
<p><strong>Return column:</strong> <code>second_salary</code> (a single row with a single value).</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     INTEGER NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Dana Wright',   'Engineering', 120000),
 (2, 'Raj Mehta',     'Engineering', 120000),
 (3, 'Lena Fischer',  'Product',     110000),
 (4, 'Tom Becker',    'Sales',        95000),
 (5, 'Aisha Bello',   'Marketing',    88000),
 (6, 'Chris Novak',   'Support',      61000),
 (7, 'Grace Liu',     'Engineering', 104000);
""",
        "solution": """
SELECT MAX(salary) AS second_salary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);
""",
        "explanation": """
<p>The classic approach: the second highest salary is the maximum of all salaries that are strictly less
than the overall maximum. The inner subquery finds the top salary (120000), and the outer
<code>MAX</code> finds the best salary below it (110000).</p>
<p>An equally valid approach uses <code>SELECT DISTINCT salary ORDER BY salary DESC LIMIT 1 OFFSET 1</code>.
The <code>DISTINCT</code> is essential — without it the duplicate 120000 would be returned. Interviewers
often follow up with "what if there is no second salary?" — the subquery version naturally returns
<code>NULL</code>.</p>
""",
        "hints": [
            "Two employees are tied at the top — sorting and taking row 2 returns the same max again.",
            "Think: 'the biggest salary that is smaller than the biggest salary'.",
            "Either MAX with a subquery, or DISTINCT + ORDER BY + LIMIT/OFFSET works.",
        ],
        "order_matters": False,
    },
    {
        "id": "e03",
        "title": "Customers Who Never Ordered",
        "difficulty": "Easy",
        "category": "Joins",
        "companies": ["Amazon", "Shopify"],
        "description": """
<p><strong>Cartly</strong>, an e-commerce marketplace, wants to re-engage signed-up customers who have
never placed an order.</p>
<p>Write a query that returns the <code>name</code> of every customer with <em>zero</em> orders.</p>
<p><strong>Return column:</strong> <code>name</code> — any order.</p>
""",
        "schema": """
CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    joined_date TEXT NOT NULL
);
CREATE TABLE orders (
    order_id    INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    amount      REAL NOT NULL,
    order_date  TEXT NOT NULL
);
INSERT INTO customers VALUES
 (1, 'Harper Reed',   '2024-01-03'),
 (2, 'Diego Marin',   '2024-02-17'),
 (3, 'Pria Nair',     '2024-03-09'),
 (4, 'Sam Okafor',    '2024-04-21'),
 (5, 'Elena Petrova', '2024-05-30'),
 (6, 'Jack Murphy',   '2024-06-11');
INSERT INTO orders VALUES
 (101, 1, 64.50,  '2024-02-01'),
 (102, 1, 19.99,  '2024-03-15'),
 (103, 3, 230.00, '2024-04-02'),
 (104, 5, 12.75,  '2024-06-20'),
 (105, 3, 89.10,  '2024-07-08');
""",
        "solution": """
SELECT c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;
""",
        "explanation": """
<p>A <code>LEFT JOIN</code> keeps every customer; customers with no matching order get <code>NULL</code>
in all the order columns. Filtering on <code>o.order_id IS NULL</code> isolates exactly those customers
(Diego, Sam, Jack).</p>
<p>Alternatives interviewers accept: <code>WHERE customer_id NOT IN (SELECT customer_id FROM orders)</code>
(careful — this breaks if the subquery can return NULLs) or the safest pattern,
<code>NOT EXISTS</code> with a correlated subquery.</p>
""",
        "hints": [
            "A LEFT JOIN keeps rows from the left table even when there is no match.",
            "What value do the order columns have for customers with no orders?",
            "NOT EXISTS or NOT IN (careful with NULLs!) are valid alternatives.",
        ],
        "order_matters": False,
    },
    {
        "id": "e04",
        "title": "Duplicate Emails",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["Meta", "Salesforce"],
        "description": """
<p>The CRM team at <strong>Salesloop</strong> suspects their contact list has duplicate sign-ups. A
contact is a duplicate if the same email appears more than once.</p>
<p>Write a query returning each email that appears at least twice, along with how many times it appears.</p>
<p><strong>Return columns:</strong> <code>email</code>, <code>times_seen</code> — any order.</p>
""",
        "schema": """
CREATE TABLE contacts (
    contact_id INTEGER PRIMARY KEY,
    email      TEXT NOT NULL,
    created_at TEXT NOT NULL
);
INSERT INTO contacts VALUES
 (1, 'jo@example.com',     '2025-01-04'),
 (2, 'amy@example.com',    '2025-01-06'),
 (3, 'jo@example.com',     '2025-01-11'),
 (4, 'kit@example.com',    '2025-01-12'),
 (5, 'amy@example.com',    '2025-02-02'),
 (6, 'jo@example.com',     '2025-02-09'),
 (7, 'lee@example.com',    '2025-02-15'),
 (8, 'zara@example.com',   '2025-03-01'),
 (9, 'kit@example.com',    '2025-03-03');
""",
        "solution": """
SELECT email, COUNT(*) AS times_seen
FROM contacts
GROUP BY email
HAVING COUNT(*) > 1;
""",
        "explanation": """
<p><code>GROUP BY email</code> collapses the table to one row per email, and <code>COUNT(*)</code> counts
rows within each group. The filter on the aggregate has to live in <code>HAVING</code>, not
<code>WHERE</code> — <code>WHERE</code> runs before grouping, so it cannot see the counts.</p>
<p>The <code>WHERE</code> vs <code>HAVING</code> distinction is one of the most common screening checks in
SQL interviews.</p>
""",
        "hints": [
            "Group the rows so each email becomes one group.",
            "You need to filter on an aggregate (a count). WHERE can't do that.",
            "HAVING filters groups after aggregation.",
        ],
        "order_matters": False,
    },
    {
        "id": "e05",
        "title": "Top 5 Products by Revenue",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["Amazon", "Walmart", "Flipkart"],
        "description": """
<p><strong>Gadgetry</strong>, an electronics retailer, wants a leaderboard of its best-selling products.
Revenue for a product is the sum of <code>quantity × unit_price</code> across all its order line items.</p>
<p>Return the top 5 products by total revenue, highest first.</p>
<p><strong>Return columns:</strong> <code>product_name</code>, <code>revenue</code> — ordered by
<code>revenue</code> descending, limited to 5 rows.</p>
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
 (1, 'Aurora Headphones', 'Audio'),
 (2, 'Pulse Smartwatch',  'Wearables'),
 (3, 'Nimbus Keyboard',   'Accessories'),
 (4, 'Volt Power Bank',   'Accessories'),
 (5, 'Echo Webcam',       'Video'),
 (6, 'Drift Mouse',       'Accessories'),
 (7, 'Beam Projector',    'Video');
INSERT INTO order_items VALUES
 (1,  1, 2, 129.99),
 (2,  2, 1, 199.00),
 (3,  3, 3,  79.50),
 (4,  1, 1, 129.99),
 (5,  4, 5,  39.99),
 (6,  5, 2,  89.00),
 (7,  7, 1, 449.00),
 (8,  2, 2, 199.00),
 (9,  6, 4,  24.50),
 (10, 3, 1,  79.50),
 (11, 7, 1, 449.00),
 (12, 5, 1,  89.00);
""",
        "solution": """
SELECT p.name AS product_name,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
GROUP BY p.product_id, p.name
ORDER BY revenue DESC
LIMIT 5;
""",
        "explanation": """
<p>Join products to their line items, compute <code>SUM(quantity * unit_price)</code> per product, then
sort descending and take 5. Grouping by the primary key (<code>product_id</code>) is safer than grouping
by name alone, since two products could share a name.</p>
<p>Note the multiplication happens <em>inside</em> the <code>SUM</code> — a frequent mistake is
<code>SUM(quantity) * SUM(unit_price)</code>, which is mathematically wrong.</p>
""",
        "hints": [
            "Revenue per line item is quantity * unit_price; aggregate that per product.",
            "The multiplication goes inside SUM(), not outside.",
            "ORDER BY the aggregate descending, then LIMIT 5.",
        ],
        "order_matters": True,
    },
    {
        "id": "e06",
        "title": "Daily Completed Rides",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["Uber", "Lyft", "DoorDash"],
        "description": """
<p><strong>Swiftly</strong>, a ride-hailing company, tracks every ride request. Operations wants a daily
report of how many rides actually <em>completed</em> (ignore cancelled rides).</p>
<p><strong>Return columns:</strong> <code>ride_date</code>, <code>completed_rides</code> — ordered by
<code>ride_date</code> ascending. Days with zero completed rides may be omitted.</p>
""",
        "schema": """
CREATE TABLE rides (
    ride_id   INTEGER PRIMARY KEY,
    city      TEXT NOT NULL,
    ride_date TEXT NOT NULL,
    fare      REAL,
    status    TEXT NOT NULL   -- 'completed', 'cancelled_by_rider', 'cancelled_by_driver'
);
INSERT INTO rides VALUES
 (1,  'Austin',  '2025-04-01', 18.40, 'completed'),
 (2,  'Austin',  '2025-04-01', NULL,  'cancelled_by_rider'),
 (3,  'Dallas',  '2025-04-01', 22.10, 'completed'),
 (4,  'Austin',  '2025-04-02', 9.75,  'completed'),
 (5,  'Dallas',  '2025-04-02', NULL,  'cancelled_by_driver'),
 (6,  'Dallas',  '2025-04-02', 31.00, 'completed'),
 (7,  'Austin',  '2025-04-02', 12.30, 'completed'),
 (8,  'Austin',  '2025-04-03', NULL,  'cancelled_by_rider'),
 (9,  'Dallas',  '2025-04-03', NULL,  'cancelled_by_rider'),
 (10, 'Austin',  '2025-04-04', 27.60, 'completed'),
 (11, 'Dallas',  '2025-04-04', 16.85, 'completed'),
 (12, 'Austin',  '2025-04-04', 8.20,  'completed');
""",
        "solution": """
SELECT ride_date, COUNT(*) AS completed_rides
FROM rides
WHERE status = 'completed'
GROUP BY ride_date
ORDER BY ride_date;
""",
        "explanation": """
<p>Filter first (<code>WHERE status = 'completed'</code>), then group by day and count. Because the
filter is on a raw column — not an aggregate — it belongs in <code>WHERE</code>, which is also more
efficient since rows are discarded before grouping.</p>
<p>Note 2025-04-03 disappears from the output entirely: both of its rides were cancelled. Interviewers
sometimes follow up with "how would you show that day with a 0?" — that requires a calendar/date
dimension table or a recursive date series, a good thing to mention.</p>
""",
        "hints": [
            "Filter to completed rides before you group.",
            "GROUP BY the date column and COUNT the rows in each group.",
            "This filter belongs in WHERE (raw column), not HAVING (aggregates).",
        ],
        "order_matters": True,
    },
    {
        "id": "e07",
        "title": "Earning More Than the Boss",
        "difficulty": "Easy",
        "category": "Self-Joins",
        "companies": ["Google", "Microsoft"],
        "description": """
<p>At <strong>Hexaware Labs</strong>, the employees table stores each person's manager as a reference to
another row in the same table. The CEO has no manager (<code>manager_id</code> is <code>NULL</code>).</p>
<p>Find every employee who earns strictly more than their direct manager.</p>
<p><strong>Return column:</strong> <code>employee</code> (the employee's name) — any order.</p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id     INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    salary     INTEGER NOT NULL,
    manager_id INTEGER          -- NULL for the CEO
);
INSERT INTO employees VALUES
 (1, 'Priya Sharma',  185000, NULL),
 (2, 'Ben Carter',    140000, 1),
 (3, 'Olivia Stone',  152000, 1),
 (4, 'Marco Ruiz',    149000, 2),
 (5, 'Tina Wong',     131000, 2),
 (6, 'Felix Braun',   158000, 3),
 (7, 'Nora Quinn',    99000,  3),
 (8, 'Dev Anand',     162000, 4);
""",
        "solution": """
SELECT e.name AS employee
FROM employees e
JOIN employees m ON m.emp_id = e.manager_id
WHERE e.salary > m.salary;
""",
        "explanation": """
<p>A self-join: alias the table twice — <code>e</code> for the employee, <code>m</code> for the manager —
and join the employee's <code>manager_id</code> to the manager's <code>emp_id</code>. Then compare
salaries across the two aliases.</p>
<p>Marco (149k &gt; Ben's 140k), Felix (158k &gt; Olivia's 152k), and Dev (162k &gt; Marco's 149k) qualify.
The CEO is excluded automatically because an inner join drops the row with a <code>NULL</code> manager.</p>
""",
        "hints": [
            "Join the table to itself with two different aliases.",
            "Match employee.manager_id to manager.emp_id.",
            "An INNER join naturally excludes the CEO (NULL manager).",
        ],
        "order_matters": False,
    },
    {
        "id": "e08",
        "title": "Crowd Favorites",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["Netflix", "IMDb"],
        "description": """
<p><strong>Reelgood</strong>, a movie discovery app, wants to surface "crowd favorites": movies with an
average rating of at least <strong>4.0</strong> from at least <strong>3 ratings</strong> (a high average
from one or two users isn't trustworthy).</p>
<p><strong>Return columns:</strong> <code>title</code>, <code>avg_rating</code> (rounded to 2 decimal
places) — any order.</p>
""",
        "schema": """
CREATE TABLE movies (
    movie_id INTEGER PRIMARY KEY,
    title    TEXT NOT NULL
);
CREATE TABLE ratings (
    rating_id INTEGER PRIMARY KEY,
    movie_id  INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    rating    INTEGER NOT NULL   -- 1 to 5
);
INSERT INTO movies VALUES
 (1, 'Midnight Circuit'),
 (2, 'The Paper Garden'),
 (3, 'Gravity Falls Apart'),
 (4, 'Solstice'),
 (5, 'Iron Harvest');
INSERT INTO ratings VALUES
 (1,  1, 11, 5), (2,  1, 12, 4), (3,  1, 13, 5), (4,  1, 14, 3),
 (5,  2, 11, 5), (6,  2, 15, 5),
 (7,  3, 12, 4), (8,  3, 13, 4), (9,  3, 16, 5), (10, 3, 17, 4),
 (11, 4, 14, 2), (12, 4, 15, 3), (13, 4, 16, 3),
 (14, 5, 11, 4), (15, 5, 17, 5), (16, 5, 18, 2);
""",
        "solution": """
SELECT m.title,
       ROUND(AVG(r.rating), 2) AS avg_rating
FROM movies m
JOIN ratings r ON r.movie_id = m.movie_id
GROUP BY m.movie_id, m.title
HAVING AVG(r.rating) >= 4.0 AND COUNT(*) >= 3;
""",
        "explanation": """
<p>Both conditions are on aggregates, so both live in <code>HAVING</code>. 'Midnight Circuit' averages
4.25 over 4 ratings and 'Gravity Falls Apart' averages 4.25 over 4 ratings — they qualify. 'The Paper
Garden' averages 5.0 but only has 2 ratings, so it's filtered out — exactly the trap the minimum-count
rule exists to catch.</p>
<p>Note that <code>AVG</code> of integers returns a float in SQLite; in some engines (e.g. older SQL
Server) integer division bites here and you'd cast first.</p>
""",
        "hints": [
            "You need two aggregate conditions: an average and a count.",
            "Conditions on aggregates go in HAVING, combined with AND.",
            "ROUND(AVG(rating), 2) formats the average.",
        ],
        "order_matters": False,
    },
    {
        "id": "e09",
        "title": "Users and Their Cities",
        "difficulty": "Easy",
        "category": "Joins",
        "companies": ["Meta", "LinkedIn"],
        "description": """
<p><strong>Townsquare</strong>, a social app, stores user profiles and (optionally) a home address.
Build a directory listing every user and the city they live in. Users who haven't added an address
should still appear, with a <code>NULL</code> city.</p>
<p><strong>Return columns:</strong> <code>name</code>, <code>city</code> — any order.</p>
""",
        "schema": """
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY,
    name    TEXT NOT NULL
);
CREATE TABLE addresses (
    address_id INTEGER PRIMARY KEY,
    user_id    INTEGER NOT NULL,
    city       TEXT NOT NULL,
    state      TEXT NOT NULL
);
INSERT INTO users VALUES
 (1, 'Wren Adler'),
 (2, 'Kofi Mensah'),
 (3, 'Lara Voss'),
 (4, 'Theo Brandt'),
 (5, 'June Park');
INSERT INTO addresses VALUES
 (1, 2, 'Seattle',  'WA'),
 (2, 3, 'Denver',   'CO'),
 (3, 5, 'Portland', 'OR');
""",
        "solution": """
SELECT u.name, a.city
FROM users u
LEFT JOIN addresses a ON a.user_id = u.user_id;
""",
        "explanation": """
<p>The requirement "every user must appear, even without a match" is the textbook signal for a
<code>LEFT JOIN</code>. An inner join would silently drop Wren and Theo.</p>
<p>This tests whether you reach for the right join type by reading the requirements, not by habit.
A common interview follow-up: "what happens if a user somehow has two addresses?" — the user would
appear twice, which is why production queries often deduplicate or pick a primary address.</p>
""",
        "hints": [
            "Every user must appear even with no address — which join keeps unmatched rows?",
            "LEFT JOIN from users to addresses.",
            "Unmatched rows show NULL for the address columns — that's expected.",
        ],
        "order_matters": False,
    },
    {
        "id": "e10",
        "title": "Order Size Buckets",
        "difficulty": "Easy",
        "category": "CASE Expressions",
        "companies": ["Shopify", "Stripe"],
        "description": """
<p>The growth team at <strong>Bagelbox</strong>, a subscription food service, segments orders into size
buckets:</p>
<ul>
<li><code>small</code> — amount under $50</li>
<li><code>medium</code> — amount from $50 to $200 (inclusive on both ends)</li>
<li><code>large</code> — amount over $200</li>
</ul>
<p>Count how many orders fall into each bucket.</p>
<p><strong>Return columns:</strong> <code>size_category</code>, <code>order_count</code> — any order.</p>
""",
        "schema": """
CREATE TABLE orders (
    order_id   INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    amount     REAL NOT NULL,
    order_date TEXT NOT NULL
);
INSERT INTO orders VALUES
 (1,  201, 23.50,  '2025-02-01'),
 (2,  202, 50.00,  '2025-02-01'),
 (3,  203, 310.25, '2025-02-02'),
 (4,  201, 75.80,  '2025-02-03'),
 (5,  204, 200.00, '2025-02-04'),
 (6,  205, 12.99,  '2025-02-05'),
 (7,  202, 540.00, '2025-02-06'),
 (8,  206, 49.99,  '2025-02-07'),
 (9,  203, 150.00, '2025-02-08'),
 (10, 207, 201.10, '2025-02-09');
""",
        "solution": """
SELECT CASE
         WHEN amount < 50 THEN 'small'
         WHEN amount <= 200 THEN 'medium'
         ELSE 'large'
       END AS size_category,
       COUNT(*) AS order_count
FROM orders
GROUP BY size_category;
""",
        "explanation": """
<p><code>CASE</code> expressions evaluate top-down and stop at the first match, so the second branch
only needs <code>amount &lt;= 200</code> — anything under 50 was already captured. The boundary rows are
the real test: $50.00 and $200.00 are <em>medium</em>, $201.10 is <em>large</em>, $49.99 is
<em>small</em>.</p>
<p>SQLite lets you reference the alias <code>size_category</code> in <code>GROUP BY</code>; in engines
that don't, you'd repeat the whole CASE expression or wrap it in a subquery.</p>
""",
        "hints": [
            "Build the bucket label with a CASE expression.",
            "CASE branches evaluate in order — use that to simplify range checks.",
            "Watch the boundaries: 50 and 200 are both 'medium'.",
        ],
        "order_matters": False,
    },
    {
        "id": "e11",
        "title": "Revenue by Category",
        "difficulty": "Easy",
        "category": "Joins",
        "companies": ["Walmart", "Target", "Amazon"],
        "description": """
<p><strong>Loft &amp; Ladder</strong>, a home goods retailer, needs a category-level revenue report for a
board deck. Revenue is <code>quantity × unit_price</code> summed over all line items of products in that
category.</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>total_revenue</code> (rounded to 2
decimals) — ordered by <code>total_revenue</code> descending.</p>
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
 (1, 'Oak Bookshelf',    'Furniture'),
 (2, 'Linen Throw',      'Textiles'),
 (3, 'Ceramic Vase',     'Decor'),
 (4, 'Walnut Desk',      'Furniture'),
 (5, 'Wool Rug',         'Textiles'),
 (6, 'Brass Lamp',       'Decor'),
 (7, 'Velvet Cushion',   'Textiles');
INSERT INTO order_items VALUES
 (1,  1, 1, 249.00),
 (2,  2, 3, 45.50),
 (3,  3, 2, 38.00),
 (4,  4, 1, 599.00),
 (5,  5, 1, 320.00),
 (6,  6, 2, 89.99),
 (7,  7, 4, 29.99),
 (8,  1, 1, 249.00),
 (9,  3, 1, 38.00),
 (10, 2, 2, 45.50);
""",
        "solution": """
SELECT p.category,
       ROUND(SUM(oi.quantity * oi.unit_price), 2) AS total_revenue
FROM products p
JOIN order_items oi ON oi.product_id = p.product_id
GROUP BY p.category
ORDER BY total_revenue DESC;
""",
        "explanation": """
<p>Same join-then-aggregate pattern as the product leaderboard, but grouped one level higher — by
category. Furniture totals $1,097.00, Textiles $576.46, Decor $293.98.</p>
<p>In a real warehouse this would be a star-schema query: fact table (<code>order_items</code>) joined to
a dimension (<code>products</code>), aggregated by a dimension attribute. Saying that out loud in a data
engineering interview earns points.</p>
""",
        "hints": [
            "Join line items to products to get each item's category.",
            "GROUP BY category, SUM(quantity * unit_price).",
            "Order by the rounded total, descending.",
        ],
        "order_matters": True,
    },
    {
        "id": "e12",
        "title": "Stale or Incomplete Accounts",
        "difficulty": "Easy",
        "category": "NULL Handling",
        "companies": ["Dropbox", "Atlassian"],
        "description": """
<p><strong>Fileforge</strong>, a cloud storage product, is auditing accounts for cleanup. An account is a
cleanup candidate if it has <em>no email on file</em> (<code>NULL</code>) <em>or</em> its last login was
before <code>2025-01-01</code>.</p>
<p>Careful: comparisons with <code>NULL</code> never evaluate to true — <code>email != ''</code> won't
catch missing emails.</p>
<p><strong>Return columns:</strong> <code>account_id</code>, <code>username</code> — any order.</p>
""",
        "schema": """
CREATE TABLE accounts (
    account_id INTEGER PRIMARY KEY,
    username   TEXT NOT NULL,
    email      TEXT,              -- NULL if never provided
    last_login TEXT               -- NULL if never logged in
);
INSERT INTO accounts VALUES
 (1, 'sky_walker',  'sky@mail.com',   '2025-03-14'),
 (2, 'pixel_pete',  NULL,             '2025-04-02'),
 (3, 'quietfox',    'fox@mail.com',   '2024-08-19'),
 (4, 'mango_dev',   'mango@mail.com', '2025-05-21'),
 (5, 'lostuser99',  NULL,             '2024-02-11'),
 (6, 'nova_r',      'nova@mail.com',  '2024-12-31'),
 (7, 'beta_tester', 'beta@mail.com',  '2025-01-01');
""",
        "solution": """
SELECT account_id, username
FROM accounts
WHERE email IS NULL
   OR last_login < '2025-01-01';
""",
        "explanation": """
<p>The two correct ingredients: <code>IS NULL</code> (never <code>= NULL</code>, which is always unknown)
and a plain string comparison on ISO-8601 dates, which sort correctly as text.</p>
<p>Edge rows: <code>nova_r</code> logged in 2024-12-31 → included; <code>beta_tester</code> logged in
exactly 2025-01-01 → excluded ("before" is strict). <code>pixel_pete</code> has a recent login but no
email → included via the OR branch. NULL three-valued logic is among the most reliable sources of
production bugs, which is why interviewers love it.</p>
""",
        "hints": [
            "= NULL never matches anything. What's the correct operator?",
            "ISO dates (YYYY-MM-DD) compare correctly as plain strings.",
            "It's an OR — either condition alone qualifies the account.",
        ],
        "order_matters": False,
    },
]
