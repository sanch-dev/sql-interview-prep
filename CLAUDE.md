# QueryLab (sql-interview-prep)

Static SQL-practice site: 48 original interview-style questions with an in-browser
SQLite IDE (sql.js/WASM), instant validation, diagnostics, hints, solutions, mock
interview mode, light/dark themes.

- **Live:** https://sanch-dev.github.io/sql-interview-prep/
- **Repo:** https://github.com/sanch-dev/sql-interview-prep (GitHub Pages serves `/docs` on `main`)

## Layout

```
build/
  q_easy.py q_medium.py q_hard.py q_more.py   # question source of truth
  build.py                                    # validates solutions against SQLite,
                                              # generates docs/js/questions.js
docs/                                         # the deployed static site
  index.html  css/style.css  js/app.js
  js/questions.js                             # GENERATED — never edit by hand
```

## Commands

```bash
python3 build/build.py            # validate all questions + regenerate questions.js (run after editing q_*.py)
python3 -m http.server 8741 --directory docs   # serve locally
git push origin main              # deploy — Pages rebuilds automatically (~30-60s)
```

No node/npm/brew on this machine; Python 3.12 + sqlite3 CLI are available.
GitHub auth: token in macOS keychain via `git credential-osxkeychain` (account sanch-dev),
works for git push and API calls.

## Conventions / gotchas

- Questions: dicts with id, title, difficulty (Easy|Medium|Hard), category, companies,
  description (HTML), schema (CREATE+INSERT), solution, explanation (HTML), hints (3),
  order_matters. Expected output is computed at runtime by running `solution` — never
  hardcode results. Build fails if a schema/solution errors or returns 0 rows.
- All questions are ORIGINAL content — never copy from LeetCode/HackerRank/etc.
- Validation/diagnostics live in docs/js/app.js (`compareResults`): multiset diff,
  order-only/fan-out/rounding/percent/NULL findings.
- localStorage keys keep the legacy `sqlforge_` prefix (renaming wipes user progress).
- Theme system: CSS variables in `:root` (light "lab notebook", default) and
  `[data-theme="dark"]`. Editor theme switches default ↔ material-darker in applyTheme().
- CDN deps (CodeMirror 5.65.16, sql.js 1.10.3) — pinned versions on cdnjs.
- After deploying, verify with: `curl -s "https://sanch-dev.github.io/sql-interview-prep/js/app.js?cb=$RANDOM" | grep <new-code-marker>`

## Roadmap (discussed, not built)

Premium design pass (typography, fewer boxes, one accent) · pattern-based curriculum ·
per-question dialect notes (BigQuery/Postgres/Snowflake) · spaced repetition.
