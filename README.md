# ⚡ SQLForge — SQL Interview Prep for Data Engineers

36 original, hand-built SQL interview questions in the style asked at top product
companies, with a real SQL engine (SQLite via WebAssembly) running entirely in the
browser. Write a query, **Run** it against realistic seeded tables, **Submit** to
have it validated against the reference solution — with order-insensitive result
comparison, numeric tolerance, progressive hints, full explanations, and progress
tracking.

**Live site:** https://sanch-dev.github.io/sql-interview-prep/

## Question bank

| Difficulty | Count | Focus |
|-----------|-------|-------|
| Easy | 12 | Filtering, joins, aggregation, NULL handling, CASE |
| Medium | 14 | Window functions, dedup, funnels, rates, relational division |
| Hard | 10 | Gaps & islands, sessionization, retention cohorts, rolling windows, interval merging |

## Project layout

```
build/
  q_easy.py / q_medium.py / q_hard.py   # question source of truth
  build.py                              # validates every solution against SQLite,
                                        # then generates docs/js/questions.js
docs/                                   # the static site (GitHub Pages root)
  index.html
  css/style.css
  js/app.js                             # IDE, validation, progress tracking
  js/questions.js                       # generated — do not edit
```

## Development

```bash
python3 build/build.py        # validate questions + regenerate questions.js
python3 -m http.server 8741 --directory docs   # serve locally
```

The build fails if any question's schema or reference solution doesn't execute
cleanly, so the published bank is always runnable.

## How validation works

On **Submit**, the app seeds a fresh in-memory SQLite database with the question's
schema, runs your query and the reference solution against it, and compares result
sets: column count, row count, then cell-by-cell with float tolerance (1e-6).
Row order is only enforced for questions that explicitly require an `ORDER BY`.
Matching values with non-matching column names pass with an advisory note.

🤖 Built with [Claude Code](https://claude.com/claude-code)
