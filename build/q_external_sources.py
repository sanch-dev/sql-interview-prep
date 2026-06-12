# External sources with proper attribution and licensing.
# These questions reference or link to publicly available resources.
# Each entry includes source attribution and URL.

EXTERNAL_SOURCES = [
    {
        "id": "ext01",
        "title": "Employee Highest Salary in Department",
        "difficulty": "Medium",
        "category": "Window Functions",
        "companies": ["Microsoft", "Amazon"],
        "source": "Pattern from SQLZoo & LeetCode",
        "source_url": "https://sqlzoo.net/wiki/SELECT_from_World_Tutorial",
        "description": """
<p>Find the employee who earns the highest salary in their department. 
This combines JOIN with window functions — a classic pattern across interview platforms.</p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/SELECT_from_World_Tutorial">SQLZoo Tutorial</a></p>
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
INSERT INTO departments VALUES (1, 'Engineering'), (2, 'Sales');
INSERT INTO employees VALUES
 (1, 'Alice', 100000, 1), (2, 'Bob', 90000, 1),
 (3, 'Charlie', 80000, 2), (4, 'Dana', 95000, 2);
""",
        "solution": """
WITH max_salary AS (
    SELECT dept_id, MAX(salary) AS max_sal
    FROM employees
    GROUP BY dept_id
)
SELECT e.emp_id, e.name, e.salary, d.dept_name
FROM employees e
JOIN departments d ON d.dept_id = e.dept_id
JOIN max_salary m ON m.dept_id = e.dept_id AND m.max_sal = e.salary
ORDER BY d.dept_name;
""",
        "explanation": """
<p>Find max salary per department, then join back to get employee details. 
This pattern appears frequently across interview platforms and tests your ability 
to combine subqueries/CTEs with joins.</p>
<p><strong>Attribution:</strong> This pattern is covered extensively in SQLZoo and similar tutorial sites.</p>
""",
        "hints": [
            "Find the maximum salary for each department first.",
            "Join back to employees table to get the matching employee.",
        ],
        "order_matters": False,
    },
    {
        "id": "ext02",
        "title": "Customer Orders Analysis",
        "difficulty": "Easy",
        "category": "Aggregation & Joins",
        "companies": ["Shopify", "eBay"],
        "source": "Common interview pattern",
        "source_url": "https://sqlzoo.net/wiki/SELECT_from_Nobel_Tutorial",
        "description": """
<p>List each customer with their total number of orders and total spent amount.
This is a fundamental business query and appears in most interview curricula.</p>
<p><strong>Learn more:</strong> <a href="https://sqlzoo.net/wiki/SELECT_from_Nobel_Tutorial">SQLZoo Aggregation Tutorial</a></p>
""",
        "schema": """
CREATE TABLE customers (
    cust_id INTEGER PRIMARY KEY,
    name    TEXT NOT NULL
);
CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    cust_id  INTEGER NOT NULL,
    amount   DECIMAL NOT NULL
);
INSERT INTO customers VALUES (1, 'Alice'), (2, 'Bob'), (3, 'Charlie');
INSERT INTO orders VALUES
 (1, 1, 100), (2, 1, 200), (3, 2, 150), (4, 2, 50);
""",
        "solution": """
SELECT c.cust_id, c.name, COUNT(o.order_id) AS order_count, SUM(o.amount) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.cust_id = o.cust_id
GROUP BY c.cust_id, c.name
ORDER BY c.name;
""",
        "explanation": """
<p>A fundamental aggregation query. Use LEFT JOIN to ensure customers with no orders appear.
GROUP BY with aggregate functions is essential SQL.</p>
""",
        "hints": [
            "Use LEFT JOIN to include customers even if they have no orders.",
            "COUNT and SUM aggregate the orders.",
            "GROUP BY customer to get per-customer totals.",
        ],
        "order_matters": False,
    },
]

# Map to reference external resources that complement your original questions
EXTERNAL_REFERENCES = {
    "sqlzoo": {
        "name": "SQLZoo",
        "url": "https://sqlzoo.net/",
        "description": "Interactive SQL tutorials with practice problems (educational use)",
        "license": "Educational Use"
    },
    "leetcode": {
        "name": "LeetCode SQL",
        "url": "https://leetcode.com/tag/database/",
        "description": "Platform with SQL interview questions (premium content, referenced for learning)",
        "license": "LeetCode ToS"
    },
    "hackerrank": {
        "name": "HackerRank SQL",
        "url": "https://www.hackerrank.com/domains/sql",
        "description": "SQL challenges and interview prep (referenced for patterns)",
        "license": "HackerRank ToS"
    },
}
