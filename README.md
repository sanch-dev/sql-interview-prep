# 🧪 QueryLab — Hands-on SQL Practice

48 original, hand-built SQL interview-style questions, with a real SQL engine
(SQLite via WebAssembly) running entirely in the browser. Write a query, **Run** it against realistic seeded tables, **Submit** to
have it validated against the reference solution — with order-insensitive result
comparison, numeric tolerance, progressive hints, full explanations, and progress
tracking.

**Live site:** https://sanch-dev.github.io/sql-interview-prep/

## Question bank

| Difficulty | Count | Focus |
|-----------|-------|-------|
| Easy | 16 | Filtering, joins, aggregation, NULL handling, CASE, set ops, strings |
| Medium | 18 | Window functions, dedup, funnels, rates, pivots, percent-of-total |
| Hard | 14 | Gaps & islands, sessionization, retention, recursive CTEs, interval merging |

## Project layout

```
build/
  q_easy.py / q_medium.py / q_hard.py   # question source of truth
  q_more.py                             # expansion pack (easy/medium/hard additions)
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

## Features

- **Diagnostic feedback** — wrong answers get a diagnosis, not just a verdict:
  right-rows-wrong-order, join fan-out, rounding/precision, fraction-vs-percent,
  NULL handling, plus tables of the exact missing/unexpected rows.
- **Mock interview mode** — 3 random questions (easy/medium/hard), 30-minute
  timer, hints and solutions locked, weighted scorecard, local history.
- Schema-aware autocomplete with on/off toggle, light/dark themes, cross-dialect
  error hints (T-SQL/Postgres/MySQL constructs explained in SQLite terms).

## How validation works

On **Submit**, the app seeds a fresh in-memory SQLite database with the question's
schema, runs your query and the reference solution against it, and compares result
sets: column count, row count, then cell-by-cell with float tolerance (1e-6).
Row order is only enforced for questions that explicitly require an `ORDER BY`.
Matching values with non-matching column names pass with an advisory note.

🤖 Built with [Claude Code](https://claude.com/claude-code)
