# SQLZoo Curated Problems with Attribution
# Problems selected from SQLZoo's public tutorials
# Source: https://sqlzoo.net/
# Educational use with explicit attribution and links back to original

SQLZOO_PROBLEMS = [
    {
        "id": "sqlz01",
        "title": "SELECT from World (Basic Filtering)",
        "difficulty": "Easy",
        "category": "Filtering & Selection",
        "companies": ["Educational - General SQL"],
        "source": "SQLZoo: SELECT from World Tutorial",
        "source_url": "https://sqlzoo.net/wiki/SELECT_from_World_Tutorial",
        "description": """
<p>This problem is <strong>adapted from SQLZoo's SELECT from World tutorial</strong>. 
Use SELECT with WHERE to filter countries by criteria.</p>
<p>Write a query to find countries with a large area (over 5 million sq km) or large population (over 250 million).
Return country name and area.</p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/SELECT_from_World_Tutorial">SQLZoo SELECT from World</a></p>
""",
        "schema": """
CREATE TABLE world (
    name       TEXT PRIMARY KEY,
    continent  TEXT,
    area       BIGINT,
    population BIGINT,
    gdp        BIGINT
);
INSERT INTO world VALUES
 ('Afghanistan', 'Asia', 652230, 25500100, NULL),
 ('Albania', 'Europe', 28748, 2876591, 12960000000),
 ('Algeria', 'Africa', 2381741, 37900000, 188681000000),
 ('Andorra', 'Europe', 468, 78115, 3712000000),
 ('Angola', 'Africa', 1246700, 20609294, NULL),
 ('Brazil', 'South America', 8514877, 200566000, 1839758000000),
 ('Canada', 'North America', 9984670, 33679000, 1736436000000),
 ('China', 'Asia', 9596961, 1365444697, 10982084000000),
 ('India', 'Asia', 3287263, 1295291143, 2073543000000),
 ('Russia', 'Europe', 17125191, 146000000, 1583800000000);
""",
        "solution": """
SELECT name, area
FROM world
WHERE area > 5000000 OR population > 250000000
ORDER BY name;
""",
        "explanation": """
<p>This is a fundamental WHERE clause with OR logic. The problem teaches:</p>
<ol>
<li>SELECT with multiple columns</li>
<li>WHERE with compound conditions (OR)</li>
<li>Comparison operators (>, <)</li>
<li>ORDER BY for consistent output</li>
</ol>
<p><strong>Attribution:</strong> This problem is adapted from SQLZoo's SELECT from World tutorial, 
a free educational resource for learning SQL. <a href="https://sqlzoo.net/wiki/SELECT_from_World_Tutorial">Visit SQLZoo</a></p>
""",
        "hints": [
            "Use OR to combine two conditions.",
            "Remember that OR means either condition can be true.",
            "Use comparison operators: > (greater than), < (less than).",
        ],
        "order_matters": False,
    },
    {
        "id": "sqlz02",
        "title": "COUNT and SUM Aggregates",
        "difficulty": "Easy",
        "category": "Aggregation",
        "companies": ["Educational - General SQL"],
        "source": "SQLZoo: Aggregate Functions",
        "source_url": "https://sqlzoo.net/wiki/SUM_and_COUNT",
        "description": """
<p><strong>Adapted from SQLZoo's SUM and COUNT tutorial</strong>.</p>
<p>A shipping company wants to know total volume (in tons) of all orders 
and the number of distinct customers who placed orders.</p>
<p><strong>Return columns:</strong> <code>total_volume</code>, <code>customer_count</code></p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/SUM_and_COUNT">SQLZoo SUM and COUNT</a></p>
""",
        "schema": """
CREATE TABLE shipments (
    shipment_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    volume_tons DECIMAL,
    ship_date TEXT
);
INSERT INTO shipments VALUES
 (1, 101, 15.5, '2024-01-05'),
 (2, 102, 22.0, '2024-01-10'),
 (3, 101, 18.5, '2024-01-15'),
 (4, 103, 30.0, '2024-01-20'),
 (5, 102, 25.0, '2024-01-25'),
 (6, 104, 12.0, '2024-02-01');
""",
        "solution": """
SELECT SUM(volume_tons) AS total_volume,
       COUNT(DISTINCT customer_id) AS customer_count
FROM shipments;
""",
        "explanation": """
<p>Key SQL concepts tested:</p>
<ol>
<li><code>SUM()</code> — aggregate function to total numeric values</li>
<li><code>COUNT(DISTINCT ...)</code> — count unique values only</li>
<li>Single-row aggregates return one row regardless of input size</li>
</ol>
<p><strong>Attribution:</strong> Inspired by SQLZoo's SUM and COUNT tutorial. 
<a href="https://sqlzoo.net/wiki/SUM_and_COUNT">Visit SQLZoo</a></p>
""",
        "hints": [
            "Use SUM() to add up all values in a column.",
            "Use COUNT(DISTINCT column) to count unique values.",
            "Aggregate functions combine multiple rows into one result.",
        ],
        "order_matters": False,
    },
    {
        "id": "sqlz03",
        "title": "JOIN Tables Together",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Educational - General SQL"],
        "source": "SQLZoo: JOIN Operations",
        "source_url": "https://sqlzoo.net/wiki/The_JOIN_operation",
        "description": """
<p><strong>Adapted from SQLZoo's JOIN tutorial</strong>.</p>
<p>You have a database of schools and their match results. Write a query that shows 
each match with the names of both schools involved.</p>
<p><strong>Return columns:</strong> <code>match_id</code>, <code>home_school</code>, <code>away_school</code>, <code>score</code></p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/The_JOIN_operation">SQLZoo JOIN Operations</a></p>
""",
        "schema": """
CREATE TABLE schools (
    school_id INTEGER PRIMARY KEY,
    school_name TEXT NOT NULL
);
CREATE TABLE matches (
    match_id INTEGER PRIMARY KEY,
    home_school_id INTEGER NOT NULL,
    away_school_id INTEGER NOT NULL,
    score TEXT NOT NULL
);
INSERT INTO schools VALUES
 (1, 'Lincoln High'),
 (2, 'Central Academy'),
 (3, 'North Valley'),
 (4, 'Riverside High');
INSERT INTO matches VALUES
 (1, 1, 2, '3-1'),
 (2, 3, 4, '2-2'),
 (3, 1, 3, '1-0'),
 (4, 2, 4, '4-1');
""",
        "solution": """
SELECT m.match_id,
       h.school_name AS home_school,
       a.school_name AS away_school,
       m.score
FROM matches m
JOIN schools h ON m.home_school_id = h.school_id
JOIN schools a ON m.away_school_id = a.school_id
ORDER BY m.match_id;
""",
        "explanation": """
<p>This demonstrates multiple JOINs: the same table (schools) is joined twice with different aliases.</p>
<p>Key concepts:</p>
<ol>
<li>Table aliases (h, a, m) for clarity</li>
<li>Multiple JOINs in one query</li>
<li>JOIN syntax: <code>FROM table1 JOIN table2 ON condition</code></li>
<li>Each JOIN adds rows from the joined table based on the condition</li>
</ol>
<p><strong>Attribution:</strong> Adapted from SQLZoo's JOIN tutorial, a free resource for SQL learners.
<a href="https://sqlzoo.net/wiki/The_JOIN_operation">Visit SQLZoo</a></p>
""",
        "hints": [
            "Use aliases (h, a) to refer to the schools table twice.",
            "Each JOIN connects on a foreign key relationship.",
            "The ON clause specifies how to match rows between tables.",
        ],
        "order_matters": False,
    },
    {
        "id": "sqlz04",
        "title": "LEFT JOIN for Unmatched Records",
        "difficulty": "Medium",
        "category": "Joins",
        "companies": ["Educational - General SQL"],
        "source": "SQLZoo: NULL and Joins",
        "source_url": "https://sqlzoo.net/wiki/NULL_and_JOINs",
        "description": """
<p><strong>Adapted from SQLZoo's NULL and JOINs tutorial</strong>.</p>
<p>A company has employees and their department assignments. Some employees 
have no department assigned yet. Find all employees with their department names, 
including those without departments (showing NULL).</p>
<p><strong>Return columns:</strong> <code>employee_name</code>, <code>department_name</code></p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/NULL_and_JOINs">SQLZoo NULL and JOINs</a></p>
""",
        "schema": """
CREATE TABLE employees (
    emp_id INTEGER PRIMARY KEY,
    emp_name TEXT NOT NULL,
    dept_id INTEGER
);
CREATE TABLE departments (
    dept_id INTEGER PRIMARY KEY,
    dept_name TEXT NOT NULL
);
INSERT INTO employees VALUES
 (1, 'Alice', 10),
 (2, 'Bob', 20),
 (3, 'Charlie', NULL),
 (4, 'Dana', 10),
 (5, 'Eve', NULL);
INSERT INTO departments VALUES
 (10, 'Engineering'),
 (20, 'Sales'),
 (30, 'Marketing');
""",
        "solution": """
SELECT e.emp_name,
       d.dept_name
FROM employees e
LEFT JOIN departments d ON e.dept_id = d.dept_id
ORDER BY e.emp_name;
""",
        "explanation": """
<p><strong>LEFT JOIN vs INNER JOIN:</strong></p>
<ul>
<li>INNER JOIN: Only returns rows where both tables have matching records</li>
<li>LEFT JOIN: Returns ALL rows from the left table, with NULL where no match exists</li>
</ul>
<p>In this query, all employees are shown, and those without departments show NULL.</p>
<p><strong>Attribution:</strong> Based on SQLZoo's NULL and JOINs tutorial. 
<a href="https://sqlzoo.net/wiki/NULL_and_JOINs">Visit SQLZoo</a></p>
""",
        "hints": [
            "LEFT JOIN keeps all rows from the left table (employees).",
            "If no matching department exists, dept_name will be NULL.",
            "This is useful for finding unmatched records.",
        ],
        "order_matters": False,
    },
    {
        "id": "sqlz05",
        "title": "GROUP BY with HAVING",
        "difficulty": "Medium",
        "category": "Aggregation & Grouping",
        "companies": ["Educational - General SQL"],
        "source": "SQLZoo: GROUP BY and HAVING",
        "source_url": "https://sqlzoo.net/wiki/SUM_and_COUNT",
        "description": """
<p><strong>Adapted from SQLZoo's GROUP BY and HAVING tutorial</strong>.</p>
<p>An online retailer wants to find products in categories that have 
generated more than $50,000 in total revenue. Show category and total revenue.</p>
<p><strong>Return columns:</strong> <code>category</code>, <code>total_revenue</code></p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/SUM_and_COUNT">SQLZoo GROUP BY and HAVING</a></p>
""",
        "schema": """
CREATE TABLE sales (
    sale_id INTEGER PRIMARY KEY,
    product_id INTEGER,
    category TEXT,
    amount DECIMAL
);
INSERT INTO sales VALUES
 (1, 101, 'Electronics', 30000),
 (2, 102, 'Electronics', 35000),
 (3, 103, 'Electronics', 20000),
 (4, 201, 'Books', 2500),
 (5, 202, 'Books', 3000),
 (6, 301, 'Clothing', 10000),
 (7, 302, 'Clothing', 15000),
 (8, 303, 'Clothing', 20000),
 (9, 304, 'Clothing', 10000),
 (10, 401, 'Toys', 50000),
 (11, 402, 'Toys', 30000);
""",
        "solution": """
SELECT category,
       SUM(amount) AS total_revenue
FROM sales
GROUP BY category
HAVING SUM(amount) > 50000
ORDER BY total_revenue DESC;
""",
        "explanation": """
<p><strong>GROUP BY vs HAVING:</strong></p>
<ul>
<li>WHERE filters BEFORE grouping (on raw data)</li>
<li>HAVING filters AFTER grouping (on aggregated results)</li>
</ul>
<p>In this query:</p>
<ol>
<li>GROUP BY category — combine sales by category</li>
<li>HAVING SUM(amount) > 50000 — keep only categories with revenue > 50k</li>
</ol>
<p><strong>Attribution:</strong> Inspired by SQLZoo's GROUP BY and HAVING tutorial.
<a href="https://sqlzoo.net/wiki/SUM_and_COUNT">Visit SQLZoo</a></p>
""",
        "hints": [
            "GROUP BY groups rows; HAVING filters the groups.",
            "WHERE filters before grouping; HAVING filters after.",
            "Cannot use aggregate functions in WHERE, must use HAVING.",
        ],
        "order_matters": False,
    },
]
