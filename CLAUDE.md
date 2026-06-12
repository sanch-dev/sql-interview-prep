# QueryLab (sql-interview-prep)

Static SQL-practice site: **60 SQL questions** (48 original + 5 interview patterns + 5 SQLZoo + 2 attributed) 
with an in-browser SQLite IDE (sql.js/WASM), instant validation, diagnostics, hints, solutions, mock
interview mode, light/dark themes.

- **Live:** https://sanch-dev.github.io/sql-interview-prep/
- **Repo:** https://github.com/sanch-dev/sql-interview-prep (GitHub Pages serves `/docs` on `main`)

## Content Strategy

**60 Total Questions:**
- 48 original interview-style questions
- 5 interview pattern questions (inspired by LeetCode/HackerRank, fully original)
- 5 SQLZoo curated problems (with attribution & links)
- 2 external source questions (with attribution & links)

**Sourcing & Attribution:** See [SOURCES.md](SOURCES.md) for full transparency on question origins.

## Layout

```
build/
  q_easy.py q_medium.py q_hard.py q_more.py       # 48 original questions
  q_interview_patterns.py                         # 5 pattern-based originals
  q_sqlzoo_curated.py                             # 5 SQLZoo problems (attributed)
  q_external_sources.py                           # 2 external sources (attributed)
  build.py                                        # validates all, generates questions.js
docs/                                             # deployed static site
  index.html  css/style.css  js/app.js
  js/questions.js                                 # GENERATED — never edit by hand
```

## Commands

```bash
python3 build/build.py            # validate all questions + regenerate questions.js
python3 -m http.server 8741 --directory docs   # serve locally at :8741
git push origin main              # deploy — Pages rebuilds (~30-60s)
```

No node/npm/brew on this machine; Python 3.12 + sqlite3 CLI available.
GitHub auth: token in keychain via `git credential-osxkeychain` (account sanch-dev).

## Conventions

- Questions: dicts with id, title, difficulty (Easy|Medium|Hard), category, companies,
  description (HTML), schema (CREATE+INSERT), solution, explanation (HTML), hints (3),
  order_matters, source (original/inspired/attributed), source_url (when applicable).
- **Expected output computed at runtime** by running `solution` — never hardcode.
- **Build fails** if schema/solution has errors or returns 0 rows.
- **Original content:** 48 questions are original; 12 others are inspired/attributed with clear sourcing.
- **SQLZoo integration:** 5 problems curated from https://sqlzoo.net with attribution & links.
- Validation/diagnostics: docs/js/app.js (`compareResults`) handles multiset diff, order-only, 
  fan-out, rounding, percent, NULL findings.
- localStorage keys use legacy `sqlforge_` prefix (renaming wipes user progress).
- Theme: CSS variables in `:root` (light "lab notebook", default) and `[data-theme="dark"]`.
  Editor switches default ↔ material-darker in applyTheme().
- CDN deps: CodeMirror 5.65.16, sql.js 1.10.3 (pinned on cdnjs).
- Verify deploy: `curl -s "https://sanch-dev.github.io/sql-interview-prep/js/app.js?cb=$RANDOM" | grep <marker>`

## Roadmap (discussed, not built)

Premium design pass (typography, fewer boxes, one accent) · pattern-based curriculum ·
per-question dialect notes (BigQuery/Postgres/Snowflake) · spaced repetition.
