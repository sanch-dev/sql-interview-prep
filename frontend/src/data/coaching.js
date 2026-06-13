// Pattern coaching metadata for all 60 non-debug questions.
// Each entry: pattern name, DE context, common mistakes, post-solve debrief, interview variants.

export const COACHING = {

  // ── EASY ─────────────────────────────────────────────────────────────────

  'e01': {
    pattern: 'Conditional Filtering',
    deContext: 'Billing pipelines filter subscriber tables daily — by plan tier, status, and region — to populate revenue dashboards and drive churn models.',
    commonMistakes: [
      'Using HAVING instead of WHERE when no GROUP BY is present — HAVING sees group results, not raw rows',
      'Case-sensitive string comparisons returning 0 rows if the data casing does not match exactly',
    ],
    debrief: 'WHERE filters rows before any grouping or aggregation. This is the foundational query pattern — nearly every pipeline query starts with a WHERE clause. The key interview signal is whether you instinctively narrow scope with conditions before pulling data.',
    variants: ['Filter by multiple plan types using IN (…)', 'Count active subscribers per plan — combine with GROUP BY', 'Filter by status AND date range simultaneously'],
  },

  'e02': {
    pattern: 'Scalar Subquery / Offset Pattern',
    deContext: 'HR analytics and compensation benchmarking need ranked salary lookups — used in pay equity analysis and salary band-setting pipelines.',
    commonMistakes: [
      'Missing DISTINCT — duplicate salaries collapse the ranking and give wrong results',
      'OFFSET 1 without ORDER BY — produces non-deterministic results that differ each run',
    ],
    debrief: 'The scalar subquery pattern (WHERE salary < (SELECT MAX…)) works but is brittle with ties. In production, DENSE_RANK() OVER (ORDER BY salary DESC) handles duplicates correctly and runs in one pass. Interviewers who ask this often want to see you mention both approaches.',
    variants: ['Third highest salary', 'Nth highest using a parameter', 'Second highest per department — requires a window function'],
  },

  'e03': {
    pattern: 'Anti-Join (LEFT JOIN + IS NULL)',
    deContext: 'Finding missing relationships is core to data quality pipelines: orphaned records, users without events, products never sold — all use the same anti-join pattern.',
    commonMistakes: [
      'Using NOT IN instead of LEFT JOIN — NOT IN returns 0 rows if the subquery contains even one NULL',
      'Forgetting IS NULL on the right-table column, which turns the LEFT JOIN into an INNER JOIN',
    ],
    debrief: 'LEFT JOIN + WHERE right_table.key IS NULL is the standard anti-join. It is NULL-safe and performs well. NOT EXISTS is also correct. NOT IN is the trap — interviewers specifically test whether you know about the NULL edge case.',
    variants: ['Products never ordered', 'Managers with no direct reports', 'Events with no matching user record'],
  },

  'e04': {
    pattern: 'GROUP BY + HAVING for Duplicate Detection',
    deContext: 'Deduplication is a daily task in data pipelines — finding duplicate records before a merge, detecting double-inserts, or identifying non-unique keys in staging tables.',
    commonMistakes: [
      'Using WHERE COUNT(*) > 1 — WHERE runs before aggregation and cannot see COUNT results',
      'Grouping on the wrong column (e.g., ID instead of the duplicated value like email)',
    ],
    debrief: 'HAVING COUNT(*) > 1 is the classic duplicate detection pattern. In DE interviews, you\'ll often be asked to extend it: find duplicates and show which rows to keep (latest by timestamp), or delete duplicates using a CTE with ROW_NUMBER.',
    variants: ['Show only the duplicate rows (not the originals)', 'Delete duplicates keeping the most recent insert', 'Find emails that appear in multiple source tables'],
  },

  'e05': {
    pattern: 'Top-N with ORDER BY + TOP/LIMIT',
    deContext: 'Product and marketing teams pull "top N" lists constantly — top products, top markets, top campaigns. These feed both dashboards and ML feature pipelines.',
    commonMistakes: [
      'No ORDER BY direction specified — DESC is required for "top" but easy to forget',
      'LIMIT without ORDER BY returns arbitrary rows — non-deterministic across different runs',
    ],
    debrief: 'Simple ORDER BY + TOP N works for global rankings. In production, the question immediately becomes "top N per group" — which requires RANK() or DENSE_RANK(). If an interviewer asks this easy version, answer it, then proactively say: "if you wanted top N per category, I would use a window function."',
    variants: ['Top 5 by revenue in each category (window function)', 'Bottom 5 products by units sold', 'Top products by unit count vs revenue — two different rankings'],
  },

  'e06': {
    pattern: 'Date Grouping + Status Filtering',
    deContext: 'Operations dashboards for ride-sharing, logistics, and delivery track completed vs cancelled events per day — a core pipeline output for SLA monitoring.',
    commonMistakes: [
      'Grouping by a full datetime instead of truncating to date — gives one row per timestamp instead of one per day',
      'Filtering completed rides in HAVING instead of WHERE — WHERE is faster because it filters before grouping',
    ],
    debrief: 'Date truncation (CAST to DATE, or FORMAT) before grouping is a pattern you will use in every time-series pipeline. The correct sequence: filter rows first (WHERE status = \'completed\'), then group by date, then aggregate. Filter early, aggregate late.',
    variants: ['Completion rate per day (completed / total)', 'Rolling 7-day completed ride count', 'Daily trend for multiple status types using CASE pivoting'],
  },

  'e07': {
    pattern: 'Self-Join on Hierarchy',
    deContext: 'HR systems, org charts, and approval hierarchies are stored as adjacency lists (manager_id → employee_id). Self-joins are the direct query tool for single-level traversals.',
    commonMistakes: [
      'Using the same alias for both copies of the table — self-joins require two distinct aliases',
      'Join direction confusion: joining employee-to-manager vs manager-to-employee inverts the comparison',
    ],
    debrief: 'Self-join requires two aliases: e for employees, m for managers. The condition e.manager_id = m.employee_id links the two copies. For multi-level hierarchies (full reporting chains), self-join does not scale — that requires a recursive CTE, which you should mention proactively.',
    variants: ['Employees earning exactly as much as their manager', 'Pairs of employees who share the same manager', 'Recursive: full org chart depth with recursive CTE'],
  },

  'e08': {
    pattern: 'Aggregate + Threshold Filter',
    deContext: 'Recommendation systems identify "crowd favorites" — items rated above a threshold by a minimum number of users. This powers content surfacing on streaming and e-commerce platforms.',
    commonMistakes: [
      'Filtering on average rating in WHERE instead of HAVING — aggregates are not available in WHERE',
      'Not requiring a minimum review count — an item with one 5-star rating outscores a 4.8-average item with 10,000 ratings',
    ],
    debrief: 'The double HAVING condition (AVG > threshold AND COUNT > minimum) is the production-safe version. Interviewers look for whether you catch the minimum vote count edge case unprompted — it is the difference between a toy query and a production-ready one.',
    variants: ['Top-rated products with at least 100 reviews', 'Authors with average rating above 4.0 and 50+ ratings', 'Filter by both average score and recency of last review'],
  },

  'e09': {
    pattern: 'INNER JOIN — Two-Table Lookup',
    deContext: 'Joining users or customers to a reference table (cities, regions, segments) is the most common join in any analytical pipeline — used in every dimensional model.',
    commonMistakes: [
      'Cartesian product from a missing join condition — every row matched to every row, returning millions of rows',
      'Selecting ambiguous column names when both tables have a column with the same name',
    ],
    debrief: 'INNER JOIN returns only rows with a match in both tables. If a user has no matching city record, they disappear from the result. In DE interviews, always ask: "should users without a matching city still appear?" That question tells you whether to use INNER vs LEFT JOIN.',
    variants: ['Include users with no city — LEFT JOIN', 'Join through three tables (users → orders → products)', 'Check for users in one table but not another — anti-join'],
  },

  'e10': {
    pattern: 'CASE WHEN Bucketing',
    deContext: 'Data pipelines bucket continuous values into categories constantly — order size tiers, customer segments, risk levels, age groups. CASE WHEN is the standard SQL tool.',
    commonMistakes: [
      'Overlapping conditions — CASE evaluates top to bottom and returns the first match; order matters',
      'Missing ELSE — rows that match no condition return NULL, not a default bucket',
    ],
    debrief: 'CASE WHEN evaluates conditions top-to-bottom and returns on the first match. Always include ELSE to handle edge cases. In production, bucketing is done in the SELECT layer of a staging model — the output column name becomes a categorical feature for ML or a dimension in a report.',
    variants: ['Assign revenue tiers (low/medium/high) to customers', 'Flag orders as on-time vs late using CASE on date difference', 'Pivot multiple CASE columns into one aggregated report'],
  },

  'e11': {
    pattern: 'JOIN + GROUP BY for Grain Change',
    deContext: 'Revenue by category is a standard output of every e-commerce analytics pipeline — it aggregates from order-item grain to product-category grain using a JOIN.',
    commonMistakes: [
      'Selecting a column from the wrong table when the same concept (e.g., category) exists in multiple places',
      'Forgetting to GROUP BY all non-aggregate columns in SELECT',
    ],
    debrief: 'JOIN → GROUP BY → SUM is the core grain-change pattern in dimensional modeling. You are rolling up from a transactional grain (one row per order-item) to a categorical grain (one row per category). In production, this pattern lives in the aggregation layer of a pipeline (dbt models, Spark jobs).',
    variants: ['Revenue by category AND month', 'Category revenue share as a percentage of total', 'Top category per month using a window function'],
  },

  'e12': {
    pattern: 'NULL Handling — IS NULL Detection',
    deContext: 'Data quality jobs scan staging tables for incomplete records — NULL email, NULL phone, NULL last_seen — before writing to production tables. This query is a data quality gate.',
    commonMistakes: [
      'Using = NULL instead of IS NULL — the expression col = NULL always evaluates to NULL (never true)',
      'Confusing empty string (\'\') with NULL — they are different values in SQL',
    ],
    debrief: 'NULL is not a value — it is the absence of a value. Standard equality operators (=, !=) never match NULL. IS NULL and IS NOT NULL are the only correct operators. An interviewer asking this question is testing whether you know the NULL trap specifically.',
    variants: ['Find records where at least one of three columns is NULL', 'Replace NULLs with a default using COALESCE', 'Count NULLs per column across a full table'],
  },

  'e13': {
    pattern: 'Set Operations — INTERSECT / UNION',
    deContext: 'Cross-platform user overlap analysis (users active on both mobile and web, users in two cohorts) uses set operations. INTERSECT finds the overlap; UNION combines.',
    commonMistakes: [
      'UNION ALL retains duplicates — use UNION when deduplication is required, UNION ALL when you know records are unique',
      'INTERSECT requires identical column count and compatible types in both SELECT statements',
    ],
    debrief: 'INTERSECT returns users in both sets. UNION ALL is faster than UNION because it skips deduplication — use it when rows are already unique or duplicates are acceptable. For "users in A but not B", use EXCEPT (or LEFT JOIN + IS NULL for more control).',
    variants: ['Users on Platform A but not Platform B — EXCEPT', 'Combine two user tables from different regions with UNION ALL', 'Find users active across 3+ platforms'],
  },

  'e14': {
    pattern: 'String Pattern Matching',
    deContext: 'Support ticket triage pipelines scan text fields for keywords — refund, cancel, escalate — to route tickets automatically. LIKE and CHARINDEX are the SQL tools for this.',
    commonMistakes: [
      'LIKE \'refund%\' only matches strings starting with "refund" — use \'%refund%\' for a contains match',
      'CHARINDEX returns 0 (not NULL) when the substring is not found — so WHERE CHARINDEX(...) > 0 is the correct filter',
    ],
    debrief: 'LIKE with wildcards (%) is the basic pattern. CHARINDEX returns the position of a substring (0 if not found). For production pipelines processing millions of tickets, full-text search indexes are preferred over LIKE — an interviewer may ask you to mention this trade-off.',
    variants: ['Find tickets mentioning "refund" OR "cancel" — OR with LIKE', 'Extract text after a specific delimiter using CHARINDEX + SUBSTRING', 'Count tickets by keyword category using CASE + LIKE'],
  },

  'e15': {
    pattern: 'MIN/MAX per Group',
    deContext: 'Price range analysis — cheapest and most expensive item per category — feeds pricing dashboards, merchandising tools, and competitive intelligence pipelines.',
    commonMistakes: [
      'MIN(price) correctly returns the cheapest price, but not the product name — getting the name requires a window function or subquery',
      'Not grouping by category — getting global min/max across all categories instead of per-category',
    ],
    debrief: 'MIN and MAX per group is straightforward. The harder version — "show the product NAME that is cheapest per category" — cannot be solved with GROUP BY alone. You need ROW_NUMBER() OVER (PARTITION BY category ORDER BY price ASC) = 1 in a CTE. Mention this extension proactively.',
    variants: ['Return the actual product name for min/max, not just the price', 'Categories where min and max price differ by less than 10%', 'Min price per category and month combined'],
  },

  'e16': {
    pattern: 'Date Part Extraction',
    deContext: 'Day-of-week analysis identifies demand patterns for scheduling, staffing, and logistics models. Extracting date parts is a constant operation in time-series pipelines.',
    commonMistakes: [
      'DATENAME vs DATEPART — DATENAME returns a string ("Monday"), DATEPART returns an integer (2 in SQL Server)',
      'SQL Server weekday numbering starts at 1=Sunday — offset by 1 if your logic expects 0=Sunday',
    ],
    debrief: 'DATEPART(weekday, date) gives the numeric day of week. DATENAME(weekday, date) gives the name. For ordering by day name (Mon→Sun), order by DATEPART not the name string — alphabetical order of day names is not chronological.',
    variants: ['Order volume by hour of day', 'Revenue by month name (formatted)', 'Orders placed on weekends vs weekdays using CASE + DATEPART'],
  },

  // ── MEDIUM ───────────────────────────────────────────────────────────────

  'm01': {
    pattern: 'RANK() — Top-1 Per Group',
    deContext: 'HR compensation analysis requires the highest-paid employee per department — one of the most frequent DE interview patterns across all companies.',
    commonMistakes: [
      'Using MAX(salary) in GROUP BY — returns the salary but not the employee name',
      'RANK() vs ROW_NUMBER() — RANK gives ties the same rank; ROW_NUMBER breaks ties arbitrarily',
    ],
    debrief: 'The canonical pattern: RANK() OVER (PARTITION BY department ORDER BY salary DESC) inside a CTE, then WHERE rank = 1 outside. PARTITION BY resets the ranking per department. This pattern appears in virtually every DE interview — know it cold. DENSE_RANK avoids rank gaps after ties.',
    variants: ['Top 3 earners per department', 'Most recent order per customer', 'Highest-revenue product per category'],
  },

  'm02': {
    pattern: 'Date Truncation for Time-Series Grouping',
    deContext: 'Monthly Active Users (MAU) is a core growth metric — computed by grouping events to month-grain and counting distinct users. Every growth analytics pipeline outputs this.',
    commonMistakes: [
      'Grouping by the full date instead of truncating to YYYY-MM — gives daily counts instead of monthly',
      'COUNT(*) instead of COUNT(DISTINCT user_id) — counts events not unique users',
    ],
    debrief: 'FORMAT(event_date, \'yyyy-MM\') truncates to month. COUNT(DISTINCT user_id) counts unique users, not events. In production, MAU computation runs on billions of rows — this is where approximate distinct counting (HyperLogLog) becomes relevant. Mentioning this shows DE depth.',
    variants: ['Weekly Active Users (WAU) using ISO week number', 'MAU showing new vs returning users', 'DAU/MAU ratio as an engagement rate metric'],
  },

  'm03': {
    pattern: 'DENSE_RANK() for Competitive Ranking',
    deContext: 'Leaderboards in gaming, sales competitions, and product engagement need gap-free ranking — DENSE_RANK ensures tied users get the same rank with no position jumps.',
    commonMistakes: [
      'Using RANK() which skips ranks after ties (1, 1, 3 instead of 1, 1, 2)',
      'ROW_NUMBER() which gives unique ranks even to ties — wrong for leaderboards where ties should share a position',
    ],
    debrief: 'DENSE_RANK is correct for leaderboards: 1, 1, 2, 3. RANK gives 1, 1, 3, 4 (skips 2 after a tie). ROW_NUMBER gives 1, 2, 3, 4 (arbitrary tiebreak). The interviewer is checking if you know all three functions and can choose the right one for the requirement.',
    variants: ['Top 10 players with their rank shown', 'Show only players who advanced (rank ≤ threshold)', 'Rank within a time window — this week\'s leaderboard only'],
  },

  'm04': {
    pattern: 'Self-Join for Calendar Gap Detection',
    deContext: 'IoT and sensor pipelines detect missing readings by checking whether yesterday\'s record exists — a date gap self-join that appears in monitoring and alerting pipelines.',
    commonMistakes: [
      'Using LAG() instead of a self-join — LAG reads the previous row regardless of date; if a date is missing, LAG reads the wrong day',
      'DATEADD result type vs column type mismatch causing implicit cast failures',
    ],
    debrief: 'The self-join on DATEADD(day, -1, date) only matches if the previous calendar day exists — unlike LAG which always finds the previous row whether or not a day is missing. This gap-awareness is the entire point of the question. The interviewer is testing whether you understand why LAG fails here.',
    variants: ['Find all dates where a reading is missing', 'Days warmer than the previous day AND above a threshold', 'Consecutive days where temperature increased each day'],
  },

  'm05': {
    pattern: 'Latest Record Per Group (ROW_NUMBER = 1)',
    deContext: 'Shipment tracking, ticket systems, and order management store status as a log — you need the current status per entity. This is the most common "deduplication by recency" pattern.',
    commonMistakes: [
      'MAX(updated_at) in GROUP BY — returns the timestamp but not the status value (requires a join back)',
      'Missing PARTITION BY — ROW_NUMBER() without PARTITION ranks across all rows, not per shipment',
    ],
    debrief: 'ROW_NUMBER() OVER (PARTITION BY entity_id ORDER BY updated_at DESC) = 1 inside a CTE is the standard "latest per group" pattern. It is used in slowly-changing dimension (SCD) logic and event stream deduplication in production pipelines.',
    variants: ['Latest order status per customer', 'Current price per product (from price history)', 'Most recent login record per user'],
  },

  'm06': {
    pattern: 'Running Total — SUM OVER',
    deContext: 'Cumulative revenue charts are standard on every financial dashboard. SUM() OVER (ORDER BY date) computes the running total in a single pass — used in billing, collections, and growth pipelines.',
    commonMistakes: [
      'Missing ORDER BY inside OVER — without it, SUM OVER returns the grand total for every row (not cumulative)',
      'RANGE UNBOUNDED PRECEDING (the default) handles ties differently than ROWS UNBOUNDED PRECEDING',
    ],
    debrief: 'SUM(revenue) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) is explicit and predictable. The window expands one row at a time in date order, accumulating the sum. In production this is also used for cumulative user counts, running loan balances, and cumulative ad spend.',
    variants: ['Cumulative user count over time', 'Running total that resets each month — PARTITION BY month', '7-day rolling sum — ROWS BETWEEN 6 PRECEDING AND CURRENT ROW'],
  },

  'm07': {
    pattern: 'Cohort Count with HAVING',
    deContext: 'Repeat purchase rate measures customer loyalty — a core KPI for e-commerce and subscription businesses. Pipelines that compute this run daily to feed retention dashboards.',
    commonMistakes: [
      'Counting order rows instead of distinct order dates — a customer with 5 items in one order should count as one purchase event',
      'HAVING COUNT > 1 when the definition requires at least 2 distinct purchase dates',
    ],
    debrief: 'Repeat rate = customers with more than one order / total customers. HAVING COUNT(DISTINCT order_date) >= 2 is precise. The business definition ("repeat" means what exactly?) is worth clarifying with the interviewer — this signals DE maturity.',
    variants: ['3+ purchase customers (loyal segment)', 'Repeat rate month-over-month trend', 'Customers who bought in both Q1 and Q2'],
  },

  'm08': {
    pattern: 'Self-Join for Item Co-occurrence',
    deContext: 'Market basket analysis ("frequently bought together") feeds recommendation engines. The self-join on order_id finds co-purchased items — foundational for collaborative filtering.',
    commonMistakes: [
      'Joining a.item_id = b.item_id instead of a.item_id != b.item_id — pairs an item with itself',
      'Double-counting pairs: both (A, B) and (B, A) appear without a.item_id < b.item_id guard',
    ],
    debrief: 'Self-join on order_id with a.item_id < b.item_id produces each pair exactly once. COUNT(*) gives how many orders contained both items. In production at scale, this runs on distributed systems (Spark) with approximate algorithms — but SQL is used for the prototype.',
    variants: ['Top 10 most frequently co-purchased pairs', 'Items always bought together (100% co-occurrence with item A)', 'Product pairs that co-occur more in premium vs standard customers'],
  },

  'm09': {
    pattern: 'Nth Event per Entity — ROW_NUMBER',
    deContext: '"Second order, third login, fifth purchase" — nth event per entity is a standard retention and lifecycle pattern used in customer journey pipelines.',
    commonMistakes: [
      'Using OFFSET 1 LIMIT 1 with a subquery — does not generalize to "per customer" without a correlated subquery',
      'Not ordering by timestamp — ROW_NUMBER without ORDER BY gives non-deterministic results',
    ],
    debrief: 'ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) gives each order a sequential number per customer. Filtering WHERE rn = 2 gives the second order. This generalizes cleanly to any N and any entity. LAG() is an alternative for computing time between events.',
    variants: ["Customer's third purchase date", 'Time between first and second order — DATEDIFF on LAG', 'Customers with a second order within 30 days of their first'],
  },

  'm10': {
    pattern: 'Multi-Step Funnel with LEFT JOINs',
    deContext: 'Signup funnel analysis tracks users from signup → activation → first action. This is a foundational growth analytics query used by every consumer product company.',
    commonMistakes: [
      'INNER JOIN removes users who did not complete all steps — LEFT JOIN is needed to keep all users and identify drop-off',
      'Attributing to the wrong channel when a user has multiple touchpoints',
    ],
    debrief: 'A funnel query uses LEFT JOINs from the broadest step outward. Users who did not complete the next step get NULL for that step\'s columns. COUNT(step2.user_id) vs COUNT(step1.user_id) gives the conversion rate. This pattern applies to any multi-step process.',
    variants: ['Conversion rate at each funnel step as a percentage', 'Funnel by channel (organic vs paid)', 'Time-to-conversion at each step'],
  },

  'm11': {
    pattern: 'Date Difference Aggregation',
    deContext: 'Time-to-first-order, time-to-activate, time-to-churn — DATEDIFF aggregations measure speed through a customer lifecycle. Used in cohort analysis and onboarding optimization.',
    commonMistakes: [
      'DATEDIFF(day, start, end) counts day boundaries — may be off by one depending on the business definition',
      'Not deciding whether to include users who never ordered (NULL first_order_date) in the average',
    ],
    debrief: 'DATEDIFF(day, signup_date, first_order_date) gives days to first order. AVG() of this across users gives the metric. Always clarify: are you including users who have never ordered (NULL) or excluding them? The answer changes both the query and the business interpretation.',
    variants: ['Median days to first order — use PERCENTILE_CONT', 'Distribution of days to first order in buckets', 'Average days to second order per acquisition channel'],
  },

  'm12': {
    pattern: 'Conditional Rate — CASE in AVG',
    deContext: 'Cancellation rate, completion rate, and defect rate are all computed the same way: AVG(CASE WHEN condition THEN 1 ELSE 0 END). This feeds reliability dashboards and SLA monitoring.',
    commonMistakes: [
      'SUM(cancelled) / COUNT(*) — integer division gives 0 in SQL Server without a CAST to FLOAT',
      'Not filtering to a relevant time window — global cancellation rate includes anomalous periods',
    ],
    debrief: 'AVG(CASE WHEN status = \'cancelled\' THEN 1.0 ELSE 0.0 END) is cleaner — it avoids division and the decimal issue. This is the "proportion" idiom: the average of a 0/1 column equals the proportion of rows where the condition is true.',
    variants: ['Daily cancellation rate as a time series', 'Cancellation rate by driver, product, or region', '7-day rolling cancellation rate'],
  },

  'm13': {
    pattern: 'Scalar Subquery in WHERE for Threshold Filtering',
    deContext: 'Segmenting customers above a dynamic threshold (above average spend, above median) is standard in marketing and risk pipelines — the threshold itself is derived from the data.',
    commonMistakes: [
      'Correlated subquery running once per row instead of a scalar subquery that runs once globally — massive performance difference',
      'HAVING AVG > AVG(AVG) — double aggregation that SQL does not permit',
    ],
    debrief: 'WHERE total_spend > (SELECT AVG(total_spend) FROM customers) is a scalar subquery — it runs once, returns one value, and compares every row to it. In production, this is often materialized as a separate aggregation and joined back to avoid re-computing per row.',
    variants: ['Customers above the 75th percentile in spend', 'Products priced below the category average', 'Days with above-average order volume'],
  },

  'm14': {
    pattern: 'Relational Division — Bought Every Category',
    deContext: 'Finding customers who purchased across all categories (or used all features, or visited all required pages) is the "relational division" problem — appears in segment building and cohort analysis.',
    commonMistakes: [
      'Comparing COUNT(DISTINCT category) to a hardcoded number instead of (SELECT COUNT(DISTINCT category) FROM products)',
      'Forgetting DISTINCT — one purchase per category per customer, not total purchases',
    ],
    debrief: 'The pattern: GROUP BY customer_id, HAVING COUNT(DISTINCT category) = (SELECT COUNT(DISTINCT category) FROM products). This is relational division — finding entities that satisfy a condition for ALL members of another set. It is rare but impressive to know.',
    variants: ['Users who have used all product features', 'Students who submitted every assignment', 'Employees who completed every required training module'],
  },

  'm15': {
    pattern: 'Conditional Pivot with CASE',
    deContext: 'Quarterly reporting requires pivoting row-level data into columns (Q1, Q2, Q3, Q4). CASE-based pivoting is standard in reporting pipelines and analytical data marts.',
    commonMistakes: [
      'Using separate queries per quarter joined together — works but is inefficient and does not scale',
      'Month-based CASE using string month names — alphabetical ordering is not chronological',
    ],
    debrief: 'SUM(CASE WHEN DATEPART(quarter, date) = 1 THEN amount ELSE 0 END) AS Q1 is the conditional aggregate pivot. For large-scale pivoting with dynamic columns, this gets replaced by PIVOT syntax or dynamic SQL in production. The interview version always uses the CASE pattern.',
    variants: ['Monthly pivot (12 columns)', 'Pivot by product category instead of time period', 'Show quarter-over-quarter change within the pivot'],
  },

  'm16': {
    pattern: 'LAG() for Row-over-Row Comparison',
    deContext: 'Price change detection — finding products that decreased in price — uses LAG to compare each price record to the previous one. Used in pricing pipelines and competitive intelligence.',
    commonMistakes: [
      'LAG without PARTITION BY — compares across all products instead of within each product separately',
      'LAG with wrong ORDER BY direction — ascending order by date is required to get the previous (earlier) price',
    ],
    debrief: 'LAG(price, 1) OVER (PARTITION BY product_id ORDER BY effective_date) gives the previous price for the same product. WHERE current_price < previous_price finds price decreases. This exact pattern is used for any slowly-changing metric: stock prices, exchange rates, conversion rates.',
    variants: ['Products whose price increased', 'Price change percentage (not just direction)', 'Products with more than 3 price changes in the last 90 days'],
  },

  'm17': {
    pattern: 'Multi-Condition HAVING Filter',
    deContext: 'Cross-platform power users — active on both mobile and web — are a key retention segment. Identifying them requires counting distinct platform values per user and filtering by threshold.',
    commonMistakes: [
      'Two separate queries for each platform joined on user_id — works but requires an extra join step',
      'COUNT(platform) instead of COUNT(DISTINCT platform) — overcounts if users have multiple sessions per platform',
    ],
    debrief: 'GROUP BY user_id, HAVING COUNT(DISTINCT platform) >= 2 is concise and correct. In production, this query identifies a segment that gets exported to a CRM or used as a feature in a churn model.',
    variants: ['Users active on 3+ platforms', 'Power users by channel and time period', 'Cross-platform users who also completed a purchase'],
  },

  'm18': {
    pattern: 'SUM OVER PARTITION for Share Calculation',
    deContext: 'Revenue share within category — each product\'s percentage of its category total — is a standard metric in retail analytics. The window SUM avoids a self-join.',
    commonMistakes: [
      'Dividing by a globally-joined total instead of a per-category total — PARTITION BY is the fix',
      'Integer division: revenue / total_revenue gives 0 in SQL Server without CAST to FLOAT',
    ],
    debrief: 'SUM(revenue) OVER (PARTITION BY category) gives the category total for each row, alongside the row\'s own revenue. Dividing gives the share. No subquery or self-join needed. This is the window function\'s core advantage — you see both row detail and group aggregate simultaneously.',
    variants: ['Each customer\'s share of their region\'s total revenue', 'Product share of category, filtered to share > 20%', 'Month-over-month share change per category'],
  },

  // ── HARD ─────────────────────────────────────────────────────────────────

  'h01': {
    pattern: 'Gaps & Islands — Consecutive Streak Detection',
    deContext: 'User engagement streaks (login streaks, study streaks, workout streaks) power gamification features and retention alerts in consumer apps. This is the canonical DE interview hard question.',
    commonMistakes: [
      'Using LAG to detect gaps — only finds isolated breaks, does not measure the length of a streak',
      'ROW_NUMBER without deduplication — if a user logs in twice in one day, the anchor shifts incorrectly',
    ],
    debrief: 'The gaps-and-islands trick: (date value) - ROW_NUMBER() = constant for consecutive dates. Group by user and this constant, count rows per group. The maximum count across groups is the longest streak. Deduplicate dates first (DISTINCT) before applying ROW_NUMBER.',
    variants: ['Current streak vs longest historical streak', 'Users with a streak of 7+ days today', 'Average streak length across all users'],
  },

  'h02': {
    pattern: 'LAG() for Period-over-Period Growth Rate',
    deContext: 'Month-over-month revenue growth is in every finance and growth report. LAG(revenue, 1) OVER (ORDER BY month) gives the prior month\'s value for the growth calculation.',
    commonMistakes: [
      'Division by zero when previous month revenue is 0 — wrap denominator in NULLIF(..., 0)',
      'Missing months in the data causing LAG to compare against the wrong prior month',
    ],
    debrief: '(current - LAG(current)) / NULLIF(LAG(current), 0) * 100 is the standard growth rate formula. NULLIF prevents division by zero. The harder version handles months with no data (gaps) — requires a date spine joined with LEFT JOIN. Mention this to the interviewer.',
    variants: ['Week-over-week growth rate', 'Same-period-last-year comparison — LAG with offset 12', 'Growth trend — is growth accelerating or decelerating?'],
  },

  'h03': {
    pattern: 'Median — PERCENTILE_CONT',
    deContext: 'Median salary is more robust than average for compensation benchmarking — used in pay equity analysis and HR reporting pipelines. Median requires a percentile function or ranking trick.',
    commonMistakes: [
      'Using AVG instead of PERCENTILE_CONT(0.5) — average is not the median for skewed distributions',
      'The ROW_NUMBER median trick only works correctly when the count is odd — even counts need special handling',
    ],
    debrief: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) is the standard SQL median. It interpolates between the two middle values for even-count groups. For DE roles, knowing P95 and P99 latency queries is as important as the median — mention percentile_cont variants.',
    variants: ['P25, P50, P75 salary distribution per company', 'Compare mean vs median to detect skew', 'Departments where median and mean differ by more than 20%'],
  },

  'h04': {
    pattern: 'Sessionization — Gap-Based Session Boundary',
    deContext: 'Web analytics and clickstream pipelines define a "session" as events within a time gap threshold (typically 30 minutes). Counting sessions from raw event logs is a standard DE task.',
    commonMistakes: [
      'Assuming session_id exists in the data — it must be computed from the event gaps',
      'LAG on timestamp without PARTITION BY user_id — compares events across different users',
    ],
    debrief: 'LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) gives the previous event\'s timestamp. A new session starts when the gap exceeds the threshold. SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY timestamp) assigns a cumulative session number per user.',
    variants: ['Average session duration', 'Events per session', 'Sessions per user per day'],
  },

  'h05': {
    pattern: 'Day-1 Retention — Cohort Analysis',
    deContext: 'Day-1 retention is the most critical early engagement metric in consumer apps. Pipelines compute it by cohort (signup date) and feed it to growth models and A/B test analysis.',
    commonMistakes: [
      'Using INNER JOIN instead of LEFT JOIN — users who never returned disappear from the result, inflating the retention rate',
      'Off-by-one on the date comparison: activity_date = signup_date + 1, not activity_date > signup_date',
    ],
    debrief: 'LEFT JOIN users to activity on the next-day condition. COUNT(activity.user_id) / COUNT(users.user_id) gives the retention rate — NULLs from unmatched users automatically count as 0 in the numerator. This is the standard cohort retention formula.',
    variants: ['Day-7 and Day-30 retention — extend the date offset', 'Retention curve across all N-day points', 'Retention by signup channel or experiment arm'],
  },

  'h06': {
    pattern: 'DENSE_RANK with Ties — Top-N Per Group',
    deContext: 'Product rankings on e-commerce platforms must include tied items at the boundary — if two products tie for 3rd place, both should appear. DENSE_RANK handles this correctly.',
    commonMistakes: [
      'RANK() which creates gaps — correct for score ties but wrong when the business wants all tied items at position N',
      'ROW_NUMBER which arbitrarily breaks ties — items with identical revenue get different ranks',
    ],
    debrief: 'DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) <= 3 keeps all tied items at the boundary. The result may return more than N rows per group when there are ties at position N — clarify with the interviewer whether this is expected behavior.',
    variants: ['Top 5 products per category, all ties at position 5 included', 'Bottom 3 performers per region', 'Rank products within a time window — PARTITION BY category, month'],
  },

  'h07': {
    pattern: 'Cumulative Distinct Count',
    deContext: 'Cumulative new user counts (total distinct users up to date D) feed user growth dashboards. A naive running COUNT(DISTINCT) is not directly supported as a window function.',
    commonMistakes: [
      'SUM(COUNT(DISTINCT user_id)) OVER — sums group-level distinct counts, not cumulative distinct across all prior days (overcounts)',
      'Subquery per date — correct but O(N²) in complexity, extremely slow at scale',
    ],
    debrief: 'Standard approach: MIN(date) per user gives their first-seen date. Then COUNT(user_id) WHERE first_seen_date <= D gives the cumulative distinct count at date D. Run as a window function on the first-seen dataset. This is a common "trick" question at senior-level DE interviews.',
    variants: ['Cumulative new customers by acquisition channel', 'New vs returning users per day', 'Running distinct count with a reset per month'],
  },

  'h08': {
    pattern: '7-Day Rolling Average — ROWS BETWEEN',
    deContext: 'Rolling averages smooth time-series noise in revenue, DAU, and conversion metrics — used in every analytics dashboard. ROWS BETWEEN implements the moving window explicitly.',
    commonMistakes: [
      'RANGE BETWEEN instead of ROWS BETWEEN — RANGE uses value-based boundaries, not row count, and behaves unexpectedly with duplicate dates',
      'Window of 6 PRECEDING instead of 6 PRECEDING — 7 rows total includes today + 6 prior days',
    ],
    debrief: 'AVG(revenue) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) computes the 7-day rolling average. Always use ROWS for rolling windows on time series — RANGE is for value-based windows and causes surprising behavior with ties.',
    variants: ['30-day rolling average', 'Rolling sum instead of rolling average', 'Rolling average that resets at month boundaries — PARTITION BY month'],
  },

  'h09': {
    pattern: 'NTILE for Quantile Bucketing',
    deContext: 'Customer value quartiles (Q1=low, Q4=high) feed segmentation models and CRM systems. NTILE divides a ranked dataset into N equal buckets — a standard analytical pipeline operation.',
    commonMistakes: [
      'NTILE(4) assigns bucket 1 to the lowest values — bucket 4 is the top quartile, not bucket 1',
      'Unequal bucket sizes when total rows are not divisible by N — NTILE distributes the remainder across the first buckets',
    ],
    debrief: 'NTILE(4) OVER (ORDER BY total_spend) assigns 1=lowest, 4=highest. For true quantile boundaries (the actual spend values at each quartile), use PERCENTILE_CONT instead. NTILE assigns ranks; PERCENTILE_CONT gives the boundary values.',
    variants: ['Decile analysis (NTILE 10)', 'Customer segments with descriptive labels using CASE + NTILE', 'Which quartile generates the most total revenue?'],
  },

  'h10': {
    pattern: 'Interval Merging — Overlapping Ranges',
    deContext: 'Deduplicating overlapping video watch segments, ad impressions, or log entries to compute true coverage time is a real DE problem. Interval merging is the solution.',
    commonMistakes: [
      'Summing all interval durations without merging — double-counts overlapping time',
      'Using LAG only — LAG detects where a new group starts relative to the prior row, but misses multi-row overlaps',
    ],
    debrief: 'Canonical approach: use a running MAX of end times to detect when a new interval group starts. Assign group numbers, then GROUP BY group, taking MIN(start) and MAX(end) per group. Sum the merged durations. This is an advanced gaps-and-islands variant.',
    variants: ['Count non-overlapping coverage hours per user per day', 'Detect gaps between intervals (uncovered time periods)', 'Merge overlapping ad impressions to compute true reach'],
  },

  'h11': {
    pattern: 'Recursive CTE for Hierarchy Traversal',
    deContext: 'Org chart depth, bill-of-materials explosion, and directory tree traversal all require recursive queries. In DE, recursive CTEs process hierarchical reference data for dimensional models.',
    commonMistakes: [
      'No termination condition — recursive CTEs without a base case or depth limit can loop indefinitely',
      'Confusing the anchor member (first SELECT, the root) with the recursive member (second SELECT, the children)',
    ],
    debrief: 'Recursive CTE structure: WITH cte AS (anchor SELECT UNION ALL recursive SELECT WHERE termination). The anchor is the root. The recursive member joins cte to the table to get the next level. Add a depth counter to control recursion and avoid infinite loops.',
    variants: ['All reports under a manager at any depth', 'Find the root of a tree from any leaf node', 'Compute the full path (breadcrumb) from root to each node'],
  },

  'h12': {
    pattern: 'Consecutive Sequence Detection — Gaps & Islands',
    deContext: 'Consecutive sold-out nights trigger pricing changes in hotel and airline systems. Detecting runs of consecutive events is the gaps-and-islands pattern applied to binary outcomes.',
    commonMistakes: [
      'LAG-based approach that only detects isolated events, not the length of consecutive runs',
      'Not deduplicating before ROW_NUMBER — duplicate dates per entity break the anchor calculation',
    ],
    debrief: 'ROW_NUMBER() OVER (ORDER BY date) - DATEDIFF(day, base_date, date) = constant for consecutive dates. Group by this constant and COUNT rows per group. Filter groups with count >= 3. This is the same gaps-and-islands anchor trick as the login streak — the pattern generalizes to any consecutive-event detection.',
    variants: ['5+ consecutive sold-out nights', 'Start and end date of each consecutive sold-out run', 'Longest sold-out streak across all properties'],
  },

  'h13': {
    pattern: 'Ordered Funnel with Timestamp Validation',
    deContext: 'Funnel completion analysis verifies that users completed steps in the required order — critical for multi-step checkout, onboarding, and experiment validation in DE pipelines.',
    commonMistakes: [
      'Checking presence of all steps without verifying order — a user who did step 3 before step 1 incorrectly counts as converted',
      'Using COUNT(*) per step instead of comparing timestamps to enforce ordering',
    ],
    debrief: 'The ordered funnel requires comparing timestamps: step2_time > step1_time AND step3_time > step2_time. Implement with self-joins or with MIN(CASE WHEN step = X THEN timestamp END) pattern, comparing conditional minimums. The ordered condition is the key distinguishing feature.',
    variants: ['Funnel with a time limit between steps (within 7 days)', 'Multi-path funnel with two valid step orderings', 'Quantify the conversion rate difference between ordered and unordered funnel'],
  },

  'h14': {
    pattern: 'RANK per Time Period — PARTITION BY Month',
    deContext: 'Top spender of each month is a standard executive report — requires ranking within each month independently. RANK() OVER (PARTITION BY month ORDER BY spend DESC) = 1 is the pattern.',
    commonMistakes: [
      'ORDER BY month, spend DESC without PARTITION BY — produces a global rank, not a per-month rank',
      'RANK() vs ROW_NUMBER() with ties — RANK returns two rank-1 rows when customers tie; ROW_NUMBER picks one arbitrarily',
    ],
    debrief: 'PARTITION BY month resets the rank to 1 at the start of each month. ORDER BY spend DESC gives rank 1 to the highest spender. If multiple customers tie for top spend, RANK returns both — usually correct for reporting.',
    variants: ['Top 3 spenders per month (rank <= 3)', 'Top spender per region per month — add PARTITION BY region', 'Month where a specific customer was the top spender'],
  },

  // ── INTERVIEW PATTERNS ────────────────────────────────────────────────────

  'ip01': {
    pattern: 'Cohort Retention Analysis',
    deContext: 'Cohort retention is the foundational metric of growth analytics — tracking the percentage of a signup cohort that returns in subsequent months. Every subscription and consumer app reports this.',
    commonMistakes: [
      'Confusing cohort month (first transaction date) with activity month (any subsequent transaction)',
      'Dividing by total customers instead of cohort size — each month\'s denominator is the original cohort count',
    ],
    debrief: 'The cohort pattern: first_transaction_date gives the cohort; each subsequent transaction gives the activity month. DATEDIFF(month, cohort, activity) gives months-since-cohort. GROUP BY cohort AND months_since gives the retention grid. COUNT(DISTINCT user) / cohort_size gives the rate.',
    variants: ['Day-N retention (more granular cohorts)', 'Revenue retention ($ retained, not user count)', 'Full cohort retention heatmap query (all months in one query)'],
  },

  'ip02': {
    pattern: 'Statistical Percentile — Median per Group',
    deContext: 'Compensation analysis, latency percentiles (P50, P95, P99), and risk scoring all require percentile computations per group. PERCENTILE_CONT is the SQL standard.',
    commonMistakes: [
      'Using AVG as a proxy for median — biased by outliers, incorrect for skewed salary distributions',
      'PERCENTILE_CONT(0.5) WITHIN GROUP syntax — non-standard and varies by database platform',
    ],
    debrief: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) with GROUP BY department gives the interpolating median per group. For DE roles, knowing P95 and P99 queries is equally important — the same function with different percentile values.',
    variants: ['P25, P50, P75, P95 in one query', 'Median salary vs average salary — quantify the difference', 'Departments where median and mean differ by more than 20%'],
  },

  'ip03': {
    pattern: 'Active Streak Detection — Gaps & Islands',
    deContext: 'User activity streaks (consecutive active days) drive engagement features — notifications, badges, and retention alerts. The gaps-and-islands pattern detects both active streaks and gap lengths.',
    commonMistakes: [
      'Comparing ROW_NUMBER to raw date values without integer conversion — produces incorrect anchors',
      'Not deduplicating — a user with two logins on one day breaks the consecutive-day arithmetic',
    ],
    debrief: 'Deduplicate to one row per user per date first. Then: date - ROW_NUMBER() = constant for consecutive dates (the "anchor date"). GROUP BY user and anchor. COUNT(*) gives streak length. HAVING COUNT >= N gives active streaks. Learn this anchor arithmetic — it is the canonical solution.',
    variants: ['Currently active streak (anchor includes today)', 'Historical longest streak per user', 'Users whose current streak just reached 7 days — trigger a notification'],
  },

  'ip04': {
    pattern: 'Top-N Per Group with Tie Preservation',
    deContext: 'Top-N queries with correct tie handling appear in leaderboards, recommendation ranking, and report generation. Choosing the right ranking function is the key interview signal.',
    commonMistakes: [
      'ROW_NUMBER when the business requires tied items to both appear at the boundary position',
      'RANK when the business requires gap-free numbering — position skipping after a tie is unacceptable',
    ],
    debrief: 'Three functions, three behaviors: ROW_NUMBER (unique, arbitrary tiebreak), RANK (tied items same rank, gap after), DENSE_RANK (tied items same rank, no gap). Always ask: "what should happen when two items tie for position N?" before writing the query.',
    variants: ['Top 3 per group — all tied items at position 3 included', 'Top 1 per group — any consistent tiebreak is fine', 'Full ranking — all items ranked with no omissions'],
  },

  'ip05': {
    pattern: 'Running Total with Partitioned Window',
    deContext: 'Cumulative sales by product over time feeds inventory forecasting and revenue forecasting pipelines. A partitioned running total resets the cumulative sum per product.',
    commonMistakes: [
      'Missing PARTITION BY product — the running total accumulates across all products instead of resetting per product',
      'Unsorted window — SUM OVER without ORDER BY returns the grand total for all rows, not a cumulative total',
    ],
    debrief: 'SUM(sales) OVER (PARTITION BY product_id ORDER BY sale_date ROWS UNBOUNDED PRECEDING) computes the running total per product. PARTITION BY resets at the start of each product. ROWS UNBOUNDED PRECEDING is explicit and avoids RANGE-based ambiguity with duplicate dates.',
    variants: ['Running total alongside the grand total in a separate column', 'Percentage of monthly total accumulated so far', 'Running total per product per month — PARTITION BY product, month'],
  },

  // ── EXTERNAL / SQLZOO ─────────────────────────────────────────────────────

  'ext01': {
    pattern: 'MAX per Group with Window Function',
    deContext: 'Highest salary per department is the classic HR analytics query — used to build compensation benchmarks and flag outliers in payroll pipelines.',
    commonMistakes: [
      'GROUP BY with MAX — returns the maximum but not the employee name alongside it',
      'PARTITION BY missing — MAX OVER without partition gives the global maximum to every row',
    ],
    debrief: 'MAX(salary) OVER (PARTITION BY department) gives the department maximum alongside each row, without collapsing the data. This is the window function\'s key advantage: compare each employee\'s salary to the department max in the same row, then filter with WHERE.',
    variants: ['All employees earning within 10% of the department maximum', 'Department max vs company-wide max as a ratio', 'Employees earning exactly the department maximum'],
  },

  'ext02': {
    pattern: 'JOIN + Aggregation — Customer Order Summary',
    deContext: 'Customer order summaries — total orders, total spend, last order date — are the most common analytical output in e-commerce pipelines. They feed CRM, lifecycle models, and dashboards.',
    commonMistakes: [
      'COUNT(*) instead of COUNT(DISTINCT order_id) when joining with order items — fan-out from the join inflates counts',
      'INNER JOIN excludes customers with no orders — LEFT JOIN preserves them with NULL values',
    ],
    debrief: 'Standard customer summary: LEFT JOIN customers to orders, GROUP BY customer_id, aggregate COUNT(order_id), SUM(amount), MAX(order_date). LEFT JOIN ensures customers with zero orders appear. In production, this typically becomes a feature store or CRM field.',
    variants: ['Customer lifetime value (CLV = total spend)', 'Customers with their most recent order details — window function', 'Segment customers by order count using CASE + aggregation'],
  },

  'sqlz01': {
    pattern: 'Basic SELECT with WHERE Filtering',
    deContext: 'Every analytical query starts with filtered selection — choosing the right rows from a large table. This is the foundation of all pipeline logic.',
    commonMistakes: [
      'SELECT * in production — always list required columns to control what flows downstream',
      'Numeric comparison on a text column — implicit casting causes unexpected behavior or errors',
    ],
    debrief: 'WHERE filters rows before any other operation. Combining conditions with AND/OR and using comparison operators correctly is fundamental. In production, always include a WHERE clause to limit data volume — unfiltered full-table scans are expensive at scale.',
    variants: ['Multi-condition filter with AND and OR', 'Range filter using BETWEEN', 'Filter using a list of values with IN (…)'],
  },

  'sqlz02': {
    pattern: 'COUNT and SUM Aggregation',
    deContext: 'Aggregate metrics — total count, total value, distinct counts — are the most common outputs of analytical pipelines. Nearly every dashboard query involves at least one aggregate.',
    commonMistakes: [
      'COUNT(*) vs COUNT(column) — COUNT(*) counts all rows; COUNT(col) skips NULLs',
      'SUM of a text-stored number — implicit casting fails silently or errors depending on the database',
    ],
    debrief: 'COUNT(*) counts rows. SUM() totals a numeric column. Without GROUP BY, you get one row summarizing the entire table. With GROUP BY, you get one row per group. These are the two modes: scalar aggregate vs grouped aggregate.',
    variants: ['Count per category with GROUP BY', 'COUNT(DISTINCT col) for unique value counts', 'Filter groups after aggregation with HAVING'],
  },

  'sqlz03': {
    pattern: 'INNER JOIN — Two-Table Query',
    deContext: 'Joining fact tables to dimension tables (orders to customers, events to users, sales to products) is the core operation of dimensional modeling and analytical queries.',
    commonMistakes: [
      'Missing ON clause — creates a Cartesian product (every row from table A joined to every row from table B)',
      'Ambiguous column reference when both tables share a column name — always qualify with a table alias',
    ],
    debrief: 'INNER JOIN returns only rows with a match in both tables. Table aliases are essential for readability and to resolve ambiguous column names. The ON clause defines the join key — make sure you join on the correct foreign key relationship.',
    variants: ['Three-table join — add a second JOIN', 'JOIN with an additional WHERE filter', 'JOIN with GROUP BY and aggregation'],
  },

  'sqlz04': {
    pattern: 'LEFT JOIN for Unmatched Records',
    deContext: 'Data quality and completeness checks identify records in one table with no match in another — orphaned records, users without events, products without orders. LEFT JOIN + IS NULL is the tool.',
    commonMistakes: [
      'Converting LEFT JOIN to INNER JOIN by filtering on the right table in WHERE — NULLs disappear when you filter on a right-table column',
      'Confusing LEFT JOIN direction — the "left" table is the primary one that must fully appear in results',
    ],
    debrief: 'LEFT JOIN returns all rows from the left table, with NULLs for unmatched right table columns. WHERE right.col IS NULL then filters to just the unmatched rows — the anti-join. Putting a filter on a right-table non-null column in WHERE converts it back to an INNER JOIN.',
    variants: ['Customers who have never placed an order', 'Products with no sales in the last 30 days', 'Records missing from a required lookup table'],
  },

  'sqlz05': {
    pattern: 'GROUP BY with HAVING Filter',
    deContext: 'Filtering aggregated results — only cities with more than 10 users, only products with total revenue above $1000 — is the HAVING pattern used in every analytics pipeline.',
    commonMistakes: [
      'WHERE COUNT(*) > 10 — syntax error, WHERE does not have access to aggregate results',
      'Putting a non-aggregate condition in HAVING when it belongs in WHERE — less efficient',
    ],
    debrief: 'HAVING filters the output of GROUP BY, just as WHERE filters rows before grouping. SQL order of operations: WHERE → GROUP BY → HAVING. Use WHERE for row-level conditions, HAVING for group-level conditions on aggregates.',
    variants: ['Categories with more than 5 products AND average price above $50', 'Groups with HAVING and ORDER BY combined', 'Top 3 categories by total revenue — HAVING + ORDER BY'],
  },
}
