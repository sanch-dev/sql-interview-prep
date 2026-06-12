# Question Sourcing & Attribution

QueryLab maintains a hybrid approach to SQL interview questions with full transparency.

## Question Sources (60 Total)

### 1. Original Questions (48 questions)
- **All questions are original content** created for this project
- Realistic schemas, narratives, and companies from real business contexts
- Designed to match real-world interview patterns from major platforms
- Validate against actual SQLite engine at build time
- Coverage: Easy (16), Medium (18), Hard (14)

### 2. Interview Pattern Questions (5 questions)
- **Inspired by** common SQL interview patterns from LeetCode, HackerRank, CodeSignal
- **Fully original schemas and narratives** — not copied from any source
- Attribution: `"Inspired by LeetCode #XXXX"` in source field
- Topics:
  - `ip01`: Customer Retention Cohort Analysis (inspired by LeetCode #1158)
  - `ip02`: Median Salary by Department
  - `ip03`: Active User Streaks (inspired by LeetCode #1354)
  - `ip04`: Top-N Per Group with Tie-Handling (inspired by LeetCode #176)
  - `ip05`: Product Sales Running Totals
- Coverage: Medium (2), Hard (3)

### 3. SQLZoo Curated Problems (5 problems with full attribution)
- **Curated & adapted from SQLZoo educational tutorials**
- Source: https://sqlzoo.net/ (free, educational resource)
- Each problem includes:
  - `source_url`: Direct link to original SQLZoo tutorial
  - Attribution & explanation in description
  - "Learn more" links within the problem
- Topics:
  - `sqlz01`: SELECT with WHERE filtering (World tutorial)
  - `sqlz02`: COUNT and SUM Aggregates
  - `sqlz03`: JOIN Operations (multiple tables)
  - `sqlz04`: LEFT JOIN for Unmatched Records
  - `sqlz05`: GROUP BY with HAVING (filtering aggregates)
- Coverage: Easy (1), Medium (4)
- **Why SQLZoo?** Free educational resource, no paywall, aligns with learning progression

### 4. External Source Questions (2 questions with attribution)
- Inspired by publicly available educational resources
- Each includes:
  - `source`: Platform/resource name
  - `source_url`: Link for further learning
  - Attribution in explanation
- Coverage: Easy (1), Medium (1)

## Total Stats
- **Easy:** 19 (16 original + 2 attributed + 1 SQLZoo)
- **Medium:** 25 (18 original + 2 patterns + 2 attributed + 3 SQLZoo)
- **Hard:** 16 (14 original + 2 patterns)

## Why This Approach?

### Legal & Ethical
- ✓ **Original content** = no copyright issues
- ✓ **Explicit attribution** = proper credit to sources
- ✓ **External links** = directs users to official sources
- ✓ **Non-commercial** = educational use aligned with fair use
- ✓ **Educational platforms** = SQLZoo is free & educational

### Practical
- ✓ **Realistic questions** match actual interview patterns
- ✓ **All validated** against SQLite (runnable, correct answers)
- ✓ **Layered difficulty** from tutorial basics to hard interview patterns
- ✓ **Transparency** builds user trust

## Adding New Questions

### Option A: Original Interview Pattern Questions
Edit `build/q_interview_patterns.py`:
```python
{
    "id": "ipXX",
    "title": "Your Question Title",
    "difficulty": "Easy|Medium|Hard",
    "category": "Window Functions|Aggregation|etc",
    "companies": ["Company1", "Company2"],
    "source": "Original (inspired by LeetCode #XXX)",
    "description": "<p>...</p>",
    "schema": "CREATE TABLE ...",
    "solution": "SELECT ...",
    "explanation": "<p>...</p>",
    "hints": ["Hint 1", "Hint 2"],
    "order_matters": False,
}
```

### Option B: SQLZoo Curated Problems
Edit `build/q_sqlzoo_curated.py`:
```python
{
    "id": "sqlzXX",
    "title": "Problem from SQLZoo",
    "difficulty": "Easy|Medium|Hard",
    "source": "SQLZoo: Tutorial Name",
    "source_url": "https://sqlzoo.net/wiki/...",
    "description": "<p>Adapted from SQLZoo... <a href='...'>Learn more</a></p>",
    # ... rest of fields, include attribution in explanation
}
```

### Option C: External Source Questions
Edit `build/q_external_sources.py`:
```python
{
    "id": "extXX",
    "source": "Platform Name",
    "source_url": "https://...",
    # ... rest of question structure
}
```

### Validate & Deploy
```bash
python3 build/build.py    # Validates all questions
git push origin main      # Deploy (GitHub Pages)
```

## Transparency in the UI

Every question displays:
1. **Difficulty & Category** — for self-assessment
2. **Companies** — where this pattern appears in real interviews
3. **Source attribution** — "Original", "Inspired by LeetCode", "SQLZoo", etc.
4. **Source URL** — when available, direct link to learn more

This keeps your site transparent about origins while providing genuine value.

## External Learning Resources (Referenced)

Users can click these links to practice on official platforms:
- **SQLZoo** (https://sqlzoo.net/) — Free educational tutorials ✓
- **LeetCode SQL** (https://leetcode.com/tag/database/) — Interview prep
- **HackerRank SQL** (https://www.hackerrank.com/domains/sql) — Challenges
- **CodeSignal** — Pattern reference

## License & Attribution

**QueryLab Content:**
- Original questions: Your own creation (no license required)
- Interview pattern questions: Original content with attribution
- SQLZoo problems: Curated from SQLZoo educational resource with explicit attribution
- External source questions: Referenced with links to originals

**Users see:**
- Clear sourcing for every question
- Links to original resources where applicable
- Educational progression from basics (SQLZoo) to interview hard (original patterns)
