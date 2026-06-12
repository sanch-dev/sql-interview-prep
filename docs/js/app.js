/* QueryLab — app logic.
 * (localStorage keys keep the legacy "sqlforge_" prefix so existing
 * users' progress survives the rebrand.)
 * Queries run in an in-browser SQLite (sql.js / WebAssembly).
 * Validation: the user's query and the reference solution both run against a
 * fresh database seeded with the question's schema; result sets are compared
 * with numeric tolerance, order-insensitively unless the question requires order.
 */
(function () {
  "use strict";

  const QUESTIONS = window.QUESTIONS || [];
  const byId = (id) => document.getElementById(id);
  const LS_PROGRESS = "sqlforge_progress_v1";
  const LS_DRAFT = "sqlforge_draft_";

  let SQL = null;            // sql.js module
  let editor = null;         // CodeMirror instance
  let current = null;        // current question object
  let filters = { diff: "All", cat: "All", status: "All", search: "" };
  let lastExpected = null;   // cached expected result for the tab view
  let hintTables = {};       // {table: [columns]} for the current question's schema
  let autocompleteOn = localStorage.getItem("sqlforge_autocomplete") !== "0";
  let theme = localStorage.getItem("sqlforge_theme") || "light";

  /* ---------------- theme ---------------- */
  function cmTheme() { return theme === "dark" ? "material-darker" : "default"; }
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    byId("themeBtn").textContent = theme === "dark" ? "☀ Light" : "☾ Dark";
    if (editor) {
      editor.setOption("theme", cmTheme());
      setTimeout(() => editor.refresh(), 0);
    }
  }

  /* ---------------- dialect detection ----------------
   * The IDE runs SQLite. When a query errors, check it for constructs from
   * other dialects and explain the SQLite equivalent instead of leaving the
   * user with a bare "syntax error".
   */
  const DIALECT_PATTERNS = [
    [/\bwith\s*\(\s*nolock\s*\)/i,
     "<code>WITH (NOLOCK)</code> is SQL Server (T-SQL) syntax. Table hints don't exist in SQLite — and aren't needed here, each run gets its own private database. Just remove it."],
    [/\bselect\s+top\s+\d+/i,
     "<code>SELECT TOP n</code> is SQL Server syntax. In SQLite (and Postgres/MySQL), put <code>LIMIT n</code> at the end of the query."],
    [/\bgetdate\s*\(/i,
     "<code>GETDATE()</code> is SQL Server. Use <code>date('now')</code> or <code>datetime('now')</code> in SQLite."],
    [/\bisnull\s*\(/i,
     "<code>ISNULL(a, b)</code> is SQL Server. Use <code>COALESCE(a, b)</code> (portable) or SQLite's <code>IFNULL(a, b)</code>."],
    [/\bnvl\s*\(/i,
     "<code>NVL</code> is Oracle. Use <code>COALESCE</code>."],
    [/\bdatediff\s*\(/i,
     "<code>DATEDIFF</code> is SQL Server/MySQL. In SQLite, difference in days is <code>julianday(a) - julianday(b)</code>."],
    [/\bdateadd\s*\(/i,
     "<code>DATEADD</code> is SQL Server. In SQLite use date modifiers: <code>date(d, '+1 day')</code>, <code>date(d, '-3 month')</code>."],
    [/\bdate_trunc\s*\(/i,
     "<code>DATE_TRUNC</code> is Postgres/Snowflake. In SQLite use <code>strftime</code> — e.g. <code>strftime('%Y-%m', d)</code> for month grain."],
    [/\b(date_format|str_to_date)\s*\(/i,
     "<code>DATE_FORMAT</code>/<code>STR_TO_DATE</code> are MySQL. Use <code>strftime</code> in SQLite."],
    [/::\s*[a-z]+/i,
     "The <code>::type</code> cast operator is Postgres. Use <code>CAST(x AS TYPE)</code> — or multiply by <code>1.0</code> to force float division."],
    [/\bqualify\b/i,
     "<code>QUALIFY</code> is Snowflake/BigQuery. In SQLite, put the window function in a CTE and filter it in the outer SELECT."],
  ];

  function dialectNotes(sql) {
    const notes = DIALECT_PATTERNS.filter(([re]) => re.test(sql)).map(([, msg]) => msg);
    if (!notes.length) return "";
    return notes.map((n) => `<div class="dialect-note">💡 ${n}</div>`).join("");
  }

  /* ---------------- progress ---------------- */
  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(LS_PROGRESS)) || {}; }
    catch (e) { return {}; }
  }
  function saveProgress(p) { localStorage.setItem(LS_PROGRESS, JSON.stringify(p)); }
  function setStatus(qid, status) {
    const p = loadProgress();
    if (status === "attempted" && p[qid] === "solved") return; // never downgrade
    p[qid] = status;
    saveProgress(p);
    renderStats();
    renderList();
  }

  /* ---------------- stats ---------------- */
  function renderStats() {
    const p = loadProgress();
    const counts = { Easy: [0, 0], Medium: [0, 0], Hard: [0, 0] };
    QUESTIONS.forEach((q) => {
      counts[q.difficulty][1]++;
      if (p[q.id] === "solved") counts[q.difficulty][0]++;
    });
    const solved = counts.Easy[0] + counts.Medium[0] + counts.Hard[0];
    const total = QUESTIONS.length;
    const pct = total ? Math.round((100 * solved) / total) : 0;
    byId("topbarStats").innerHTML = `
      <span class="stat-pill"><span class="dot dot-easy"></span>Easy ${counts.Easy[0]}/${counts.Easy[1]}</span>
      <span class="stat-pill"><span class="dot dot-medium"></span>Medium ${counts.Medium[0]}/${counts.Medium[1]}</span>
      <span class="stat-pill"><span class="dot dot-hard"></span>Hard ${counts.Hard[0]}/${counts.Hard[1]}</span>
      <span class="stat-pill">${solved}/${total} solved
        <span class="progress-bar-wrap"><span class="progress-bar-fill" style="width:${pct}%"></span></span>
      </span>`;
  }

  /* ---------------- sidebar list ---------------- */
  function visibleQuestions() {
    const p = loadProgress();
    return QUESTIONS.filter((q) => {
      if (filters.diff !== "All" && q.difficulty !== filters.diff) return false;
      if (filters.cat !== "All" && q.category !== filters.cat) return false;
      if (filters.status !== "All") {
        const st = p[q.id] || "todo";
        if (st !== filters.status) return false;
      }
      if (filters.search) {
        const hay = (q.title + " " + q.category + " " + q.companies.join(" ")).toLowerCase();
        if (!hay.includes(filters.search.toLowerCase())) return false;
      }
      return true;
    });
  }

  function renderList() {
    const p = loadProgress();
    const list = byId("questionList");
    const qs = visibleQuestions();
    if (!qs.length) {
      list.innerHTML = '<div class="empty-list">No questions match these filters.</div>';
      return;
    }
    const groups = ["Easy", "Medium", "Hard"];
    let html = "";
    groups.forEach((g) => {
      const inGroup = qs.filter((q) => q.difficulty === g);
      if (!inGroup.length) return;
      html += `<div class="q-group-label">${g} · ${inGroup.length}</div>`;
      inGroup.forEach((q) => {
        const st = p[q.id] || "todo";
        const icon = st === "solved" ? "✔" : st === "attempted" ? "◐" : "○";
        const active = current && current.id === q.id ? " active" : "";
        html += `
          <div class="q-item${active}" data-qid="${q.id}" role="button" tabindex="0">
            <span class="q-status ${st}" title="${st}">${icon}</span>
            <span class="q-item-title">${q.title}</span>
            <span class="q-diff diff-${q.difficulty}">${q.difficulty}</span>
          </div>`;
      });
    });
    list.innerHTML = html;
    list.querySelectorAll(".q-item").forEach((el) => {
      el.addEventListener("click", () => openQuestion(el.dataset.qid));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") openQuestion(el.dataset.qid); });
    });
  }

  /* ---------------- welcome cards ---------------- */
  function renderWelcome() {
    const defs = [
      ["Easy", "Filters, joins, aggregates", "easy"],
      ["Medium", "Window functions, funnels, dedup", "medium"],
      ["Hard", "Streaks, sessions, retention", "hard"],
    ];
    byId("welcomeGrid").innerHTML = defs
      .map(([d, sub]) => {
        const n = QUESTIONS.filter((q) => q.difficulty === d).length;
        return `<div class="welcome-card" data-diff="${d}">
          <h3 class="diff-${d}">${d}</h3>
          <div class="count">${n}</div>
          <div class="sub">${sub}</div>
        </div>`;
      })
      .join("");
    byId("welcomeGrid").querySelectorAll(".welcome-card").forEach((el) => {
      el.addEventListener("click", () => {
        setDiffFilter(el.dataset.diff);
        const first = visibleQuestions()[0];
        if (first) openQuestion(first.id);
      });
    });
  }

  /* ---------------- SQL helpers ---------------- */
  function freshDb(schema) {
    const db = new SQL.Database();
    db.exec(schema);
    return db;
  }

  // Run sql, return { columns, values } of the LAST statement that produced rows.
  function runSql(db, sql) {
    const results = db.exec(sql); // throws on syntax/runtime errors
    if (!results.length) return { columns: [], values: [] };
    return results[results.length - 1];
  }

  function normCell(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return Math.round(v * 1e6) / 1e6;
    return String(v);
  }
  function cellsEqual(a, b) {
    a = normCell(a); b = normCell(b);
    if (a === null || b === null) return a === b;
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
    // allow numeric string vs number ("42" vs 42)
    const na = Number(a), nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== "" && String(b).trim() !== "")
      return Math.abs(na - nb) < 1e-6;
    return String(a) === String(b);
  }
  function rowKey(row) {
    return JSON.stringify(row.map((v) => {
      const n = normCell(v);
      return typeof n === "number" ? n.toFixed(6) : n;
    }));
  }

  /* ---------------- diagnostics ----------------
   * On a wrong answer, don't just say "wrong" — figure out HOW it's wrong
   * and say something a good interviewer/tutor would say.
   */

  // rows of `a` not covered by `b`, as multisets (duplicates respected)
  function multisetDiff(a, b) {
    const counts = new Map();
    b.forEach((r) => {
      const k = rowKey(r);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    const out = [];
    a.forEach((r) => {
      const k = rowKey(r);
      const c = counts.get(k) || 0;
      if (c > 0) counts.set(k, c - 1);
      else out.push(r);
    });
    return out;
  }

  function sameSequence(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++)
      for (let j = 0; j < a[i].length; j++)
        if (!cellsEqual(a[i][j], b[i][j])) return false;
    return true;
  }

  // multiset equality after rounding numbers to integers — catches
  // "right formula, wrong decimal precision" mistakes
  function coarselyEqual(a, b) {
    const coarseKey = (row) =>
      JSON.stringify(row.map((v) => (typeof v === "number" ? Math.round(v) : v === null ? null : String(v))));
    const ka = a.map(coarseKey).sort();
    const kb = b.map(coarseKey).sort();
    return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
  }

  function diagTable(label, columns, rows, total) {
    let html = `<div class="table-card diag-card"><div class="table-card-head">${escapeHtml(label)}` +
      ` <span class="row-count">· showing ${rows.length} of ${total}</span></div>` +
      '<div class="table-scroll"><table class="data-table"><thead><tr>' +
      columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("") +
      "</tr></thead><tbody>";
    rows.forEach((r) => {
      html += "<tr>" + r.map((v) =>
        v === null ? '<td class="null-val">NULL</td>' : `<td>${escapeHtml(String(v))}</td>`
      ).join("") + "</tr>";
    });
    return html + "</tbody></table></div></div>";
  }

  function compareResults(user, expected, orderMatters) {
    if (expected.columns.length !== user.columns.length) {
      return {
        pass: false,
        html: `<ul class="diag-list"><li>Wrong number of columns: you returned ` +
          `<strong>${user.columns.length}</strong> (${escapeHtml(user.columns.join(", ") || "none")}), ` +
          `expected <strong>${expected.columns.length}</strong> (${escapeHtml(expected.columns.join(", "))}). ` +
          `Re-read the "Return columns" line of the question.</li></ul>`,
      };
    }

    const missing = multisetDiff(expected.values, user.values); // expected rows you lack
    const extra = multisetDiff(user.values, expected.values);   // your rows that shouldn't exist

    if (!missing.length && !extra.length) {
      if (orderMatters && !sameSequence(user.values, expected.values)) {
        return {
          pass: false,
          html: `<ul class="diag-list"><li><strong>So close —</strong> every row and value is correct, ` +
            `but the <strong>order</strong> is wrong, and this question checks ordering. ` +
            `Compare your ORDER BY against the spec (direction and tie-breakers).</li></ul>`,
        };
      }
      const colMismatch = expected.columns.some(
        (c, i) => c.toLowerCase() !== String(user.columns[i] || "").toLowerCase()
      );
      return {
        pass: true,
        note: colMismatch
          ? `Note: values match, but your column names (${user.columns.join(", ")}) differ from the spec ` +
            `(${expected.columns.join(", ")}). In an interview, alias your columns as asked.`
          : null,
      };
    }

    const findings = [];

    if (user.values.length === 0) {
      findings.push("Your query returned <strong>no rows</strong> — a filter or join condition is " +
        "eliminating everything. Run pieces of the query (just the FROM/JOIN, then add WHERE) to find where rows vanish.");
    } else if (user.values.length === expected.values.length) {
      findings.push(`Row counts match (<strong>${user.values.length}</strong>), but some values differ.`);
    } else {
      findings.push(`Row count: you returned <strong>${user.values.length}</strong>, ` +
        `expected <strong>${expected.values.length}</strong>.`);
    }

    const expectedKeys = new Set(expected.values.map(rowKey));
    if (!missing.length && extra.length && extra.every((r) => expectedKeys.has(rowKey(r)))) {
      findings.push("Every unexpected row is a <strong>duplicate of a correct row</strong> — a join is " +
        "probably fanning out (one-to-many match). Consider COUNT(DISTINCT ...), pre-aggregating in a CTE, " +
        "or SELECT DISTINCT.");
    }

    if (missing.length && extra.length && coarselyEqual(user.values, expected.values)) {
      findings.push("The values are <strong>nearly right</strong> — they differ only in decimal precision. " +
        "Check the rounding the question asks for (e.g. <code>ROUND(x, 1)</code>) and watch integer division: " +
        "use <code>100.0</code>, not <code>100</code>.");
    }

    if (expected.values.length === 1 && expected.columns.length === 1 && user.values.length === 1) {
      const u = user.values[0][0], e = expected.values[0][0];
      if (typeof u === "number" && typeof e === "number" && Math.abs(u * 100 - e) < 0.5) {
        findings.push("Your value looks like a <strong>fraction</strong> — the question wants a " +
          "<strong>percentage</strong>. Multiply by <code>100.0</code>.");
      }
    }

    const missingHasNull = missing.some((r) => r.some((v) => v === null));
    const extraHasNull = extra.some((r) => r.some((v) => v === null));
    if (missingHasNull !== extraHasNull && (missingHasNull || extraHasNull)) {
      findings.push("The differing rows involve <strong>NULL</strong>s — check your NULL handling " +
        "(<code>IS NULL</code> vs <code>= NULL</code>, inner vs LEFT JOIN, aggregates skipping NULLs).");
    }

    let html = `<ul class="diag-list">${findings.map((f) => `<li>${f}</li>`).join("")}</ul>`;
    if (missing.length)
      html += diagTable("Missing — expected but not in your output", expected.columns, missing.slice(0, 3), missing.length);
    if (extra.length)
      html += diagTable("Unexpected — in your output but not expected", user.columns, extra.slice(0, 3), extra.length);
    return { pass: false, html };
  }

  function fmtVal(v) {
    if (v === null || v === undefined) return "NULL";
    return typeof v === "number" ? String(normCell(v)) : `'${v}'`;
  }

  /* ---------------- rendering results ---------------- */
  function resultTable(res, opts) {
    opts = opts || {};
    if (!res || !res.columns.length) {
      return '<div class="result-placeholder">The query ran but returned no result set. ' +
             "Make sure your final statement is a SELECT.</div>";
    }
    const cap = 200;
    const rows = res.values.slice(0, cap);
    let html = '<div class="table-card"><div class="table-card-head">' +
      (opts.label || "result") +
      ` <span class="row-count">· ${res.values.length} row${res.values.length === 1 ? "" : "s"}` +
      (res.values.length > cap ? ` (showing first ${cap})` : "") +
      "</span></div><div class=\"table-scroll\"><table class=\"data-table\"><thead><tr>";
    res.columns.forEach((c) => (html += `<th>${escapeHtml(c)}</th>`));
    html += "</tr></thead><tbody>";
    rows.forEach((r) => {
      html += "<tr>";
      r.forEach((v) => {
        html += v === null
          ? '<td class="null-val">NULL</td>'
          : `<td>${escapeHtml(String(v))}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody></table></div></div>";
    return html;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function showVerdict(kind, title, detail) {
    const v = byId("verdict");
    v.className = "verdict " + kind;
    v.innerHTML = `<span class="verdict-title">${title}</span>` +
      (detail ? `<span class="verdict-detail">${detail}</span>` : "");
    v.classList.remove("hidden");
  }

  /* ---------------- run / submit ---------------- */
  function getUserSql() { return editor.getValue(); }

  function handleRun() {
    if (!current || !SQL) return;
    lastExpected = null;
    byId("resultTabs").classList.add("hidden");
    byId("resultExpected").classList.add("hidden");
    byId("resultYours").classList.remove("hidden");
    const sql = getUserSql();
    if (!sql.trim() || /^\s*--/.test(sql) && !sql.replace(/--.*$/gm, "").trim()) {
      showVerdict("info", "Nothing to run", "Write a SELECT statement first.");
      byId("resultYours").innerHTML = "";
      return;
    }
    let db;
    try {
      db = freshDb(current.schema);
      const res = runSql(db, sql);
      showVerdict("info", "Query executed",
        "This was a dry run — output below is not checked. Hit <strong>Submit</strong> to validate.");
      byId("resultYours").innerHTML = resultTable(res, { label: "your output" });
    } catch (e) {
      showVerdict("fail", "SQL error", `<pre>${escapeHtml(String(e.message || e))}</pre>` +
        dialectNotes(sql) + "Fix the syntax/runtime error and run again.");
      byId("resultYours").innerHTML = "";
    } finally {
      if (db) db.close();
    }
  }

  function handleSubmit() {
    if (!current || !SQL) return;
    const sql = getUserSql();
    if (!sql.replace(/--.*$/gm, "").trim()) {
      showVerdict("info", "Nothing to submit", "Write your query first.");
      return;
    }
    if (mock && mock.perQ[mock.idx].status === "pending") mock.perQ[mock.idx].attempts++;
    let db;
    let userRes;
    try {
      db = freshDb(current.schema);
      userRes = runSql(db, sql);
    } catch (e) {
      if (db) db.close();
      setStatus(current.id, "attempted");
      showVerdict("fail", "SQL error",
        `<pre>${escapeHtml(String(e.message || e))}</pre>` + dialectNotes(sql));
      byId("resultYours").innerHTML = "";
      return;
    }
    db.close();

    // expected result from the reference solution, on a fresh db (user may have mutated theirs)
    const db2 = freshDb(current.schema);
    const expected = runSql(db2, current.solution);
    db2.close();
    lastExpected = expected;

    const cmp = compareResults(userRes, expected, !!current.order_matters);

    byId("resultTabs").classList.remove("hidden");
    byId("resultYours").innerHTML = resultTable(userRes, { label: "your output" });
    byId("resultExpected").innerHTML = resultTable(expected, { label: "expected output" });
    switchTab("yours");

    if (cmp.pass) {
      setStatus(current.id, "solved");
      showVerdict("pass", "✓ Accepted — correct!",
        (cmp.note ? cmp.note + " " : "") +
        (mock ? "Moving to the next question…"
              : "Nice work. Try the next one, or read the solution to compare approaches."));
      if (mock) mockRecordSolved();
    } else {
      setStatus(current.id, "attempted");
      showVerdict("fail", "✗ Wrong answer", cmp.html +
        (mock ? ""
              : '<span class="diag-footer">Compare the two tabs below — or take a ' +
                '<a href="#" id="verdictHintLink" style="color:inherit">hint</a>.</span>'));
      const link = document.getElementById("verdictHintLink");
      if (link) link.addEventListener("click", (e) => { e.preventDefault(); revealNextHint(); });
    }
  }

  function switchTab(which) {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === which);
    });
    byId("resultYours").classList.toggle("hidden", which !== "yours");
    byId("resultExpected").classList.toggle("hidden", which !== "expected");
  }

  /* ---------------- mock interview ---------------- */
  const MOCK_MINUTES = 30;
  const MOCK_POINTS = { Easy: 10, Medium: 20, Hard: 30 };
  const LS_MOCKS = "sqlforge_mock_history";
  let mock = null; // {ids, idx, perQ, deadline, timer, qStart, startedAt}

  function pickMockQuestions() {
    const p = loadProgress();
    const pick = (diff) => {
      const unsolved = QUESTIONS.filter((q) => q.difficulty === diff && p[q.id] !== "solved");
      const pool = unsolved.length ? unsolved : QUESTIONS.filter((q) => q.difficulty === diff);
      return pool[Math.floor(Math.random() * pool.length)].id;
    };
    return [pick("Easy"), pick("Medium"), pick("Hard")];
  }

  function startMock() {
    if (mock) return;
    if (!SQL) { alert("The SQL engine is still loading — try again in a second."); return; }
    if (!confirm(`Start a ${MOCK_MINUTES}-minute mock interview?\n\n3 questions (easy → medium → hard), no hints, no solutions. You can skip a question or end early.`)) return;
    mock = {
      ids: pickMockQuestions(),
      idx: 0,
      perQ: [],
      startedAt: Date.now(),
      qStart: Date.now(),
      deadline: Date.now() + MOCK_MINUTES * 60 * 1000,
    };
    mock.perQ = mock.ids.map((id) => {
      const q = QUESTIONS.find((x) => x.id === id);
      return { id, title: q.title, difficulty: q.difficulty, attempts: 0, status: "pending", seconds: 0 };
    });
    document.body.classList.add("mock-active");
    byId("mockBanner").classList.remove("hidden");
    mock.timer = setInterval(tickMock, 1000);
    updateMockBanner();
    openQuestion(mock.ids[0]);
  }

  function tickMock() {
    if (!mock) return;
    const left = mock.deadline - Date.now();
    if (left <= 0) { endMock(true); return; }
    const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
    const el = byId("mockTimer");
    el.textContent = `${m}:${String(s).padStart(2, "0")}`;
    el.classList.toggle("low", left < 5 * 60 * 1000);
  }

  function updateMockBanner() {
    byId("mockProgress").textContent =
      `Question ${mock.idx + 1} of ${mock.ids.length} · ` +
      mock.perQ.map((q) => (q.status === "solved" ? "✓" : q.status === "skipped" ? "→" : "·")).join(" ");
    tickMock();
  }

  function mockRecordSolved() {
    const q = mock.perQ[mock.idx];
    if (q.status !== "pending") return;
    q.status = "solved";
    q.seconds = Math.round((Date.now() - mock.qStart) / 1000);
    setTimeout(advanceMock, 1400);
  }

  function mockSkip() {
    const q = mock.perQ[mock.idx];
    if (q.status !== "pending") return;
    q.status = "skipped";
    q.seconds = Math.round((Date.now() - mock.qStart) / 1000);
    advanceMock();
  }

  function advanceMock() {
    if (!mock) return;
    if (mock.idx + 1 >= mock.ids.length) { endMock(false); return; }
    mock.idx++;
    mock.qStart = Date.now();
    updateMockBanner();
    openQuestion(mock.ids[mock.idx]);
  }

  function endMock(expired) {
    if (!mock) return;
    clearInterval(mock.timer);
    mock.perQ.forEach((q) => {
      if (q.status === "pending") {
        q.status = "unsolved";
        q.seconds = Math.round((Date.now() - mock.qStart) / 1000);
      }
    });
    const score = mock.perQ.reduce((s, q) => s + (q.status === "solved" ? MOCK_POINTS[q.difficulty] : 0), 0);
    const maxScore = mock.perQ.reduce((s, q) => s + MOCK_POINTS[q.difficulty], 0);
    const usedSec = Math.min(Math.round((Date.now() - mock.startedAt) / 1000), MOCK_MINUTES * 60);
    const record = {
      date: new Date().toISOString(),
      score, maxScore, expired,
      usedSec,
      detail: mock.perQ.map((q) => ({
        title: q.title, difficulty: q.difficulty, status: q.status,
        attempts: q.attempts, seconds: q.seconds,
      })),
    };
    try {
      const hist = JSON.parse(localStorage.getItem(LS_MOCKS)) || [];
      hist.unshift(record);
      localStorage.setItem(LS_MOCKS, JSON.stringify(hist.slice(0, 20)));
    } catch (e) { /* storage full/blocked — scorecard still shows */ }

    document.body.classList.remove("mock-active");
    byId("mockBanner").classList.add("hidden");
    mock = null;
    showScorecard(record);
    renderMockHistory();
  }

  function fmtDuration(sec) {
    return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
  }

  function showScorecard(rec) {
    const verdictLine =
      rec.score === rec.maxScore ? "Flawless — you're interview-ready at this level." :
      rec.score >= rec.maxScore / 2 ? "Solid. Review the ones that got away below." :
      "Rough one — that's what practice is for. Read the solutions for the misses.";
    const rows = rec.detail.map((d) => {
      const icon = d.status === "solved" ? "✅" : d.status === "skipped" ? "⏭" : "❌";
      return `<tr>
        <td>${icon} ${escapeHtml(d.title)}</td>
        <td class="diff-${d.difficulty}">${d.difficulty}</td>
        <td>${d.status}</td>
        <td>${d.attempts}</td>
        <td>${fmtDuration(d.seconds)}</td>
      </tr>`;
    }).join("");
    byId("scorecardBody").innerHTML = `
      <div class="score-headline">${rec.score} <span class="score-max">/ ${rec.maxScore}</span></div>
      <p class="score-verdict">${rec.expired ? "⏰ Time expired. " : ""}${verdictLine}</p>
      <table class="data-table score-table">
        <thead><tr><th>Question</th><th>Level</th><th>Result</th><th>Submits</th><th>Time</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="score-meta">Total time: ${fmtDuration(rec.usedSec)} of ${MOCK_MINUTES}m · solved questions also count toward your overall progress.</p>`;
    byId("scorecardModal").classList.remove("hidden");
  }

  function renderMockHistory() {
    const host = byId("mockHistory");
    if (!host) return;
    let hist = [];
    try { hist = JSON.parse(localStorage.getItem(LS_MOCKS)) || []; } catch (e) { /* ignore */ }
    if (!hist.length) { host.innerHTML = ""; return; }
    host.innerHTML = `<h3>🎤 Your mock interviews</h3>` +
      `<div class="mock-history-list">` +
      hist.slice(0, 5).map((r) => {
        const d = new Date(r.date);
        const solved = r.detail.filter((x) => x.status === "solved").length;
        return `<div class="mock-history-item">
          <span class="mh-date">${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          <span class="mh-score">${r.score}/${r.maxScore}</span>
          <span class="mh-detail">${solved}/${r.detail.length} solved · ${fmtDuration(r.usedSec)}</span>
        </div>`;
      }).join("") + `</div>`;
  }

  /* ---------------- question view ---------------- */
  function renderSchemaTables(q) {
    const host = byId("schemaTables");
    hintTables = {};
    try {
      const db = freshDb(q.schema);
      const tables = db.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      );
      let html = "";
      if (tables.length) {
        tables[0].values.forEach(([name]) => {
          const res = db.exec(`SELECT * FROM "${name}"`);
          const r = res[0] || { columns: [], values: [] };
          hintTables[name] = r.columns;
          html += '<div class="table-card"><div class="table-card-head">' +
            escapeHtml(name) +
            ` <span class="row-count">· ${r.values.length} rows</span></div>` +
            '<div class="table-scroll"><table class="data-table"><thead><tr>' +
            r.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("") +
            "</tr></thead><tbody>" +
            r.values.map((row) =>
              "<tr>" + row.map((v) =>
                v === null ? '<td class="null-val">NULL</td>' : `<td>${escapeHtml(String(v))}</td>`
              ).join("") + "</tr>"
            ).join("") +
            "</tbody></table></div></div>";
        });
      }
      host.innerHTML = html;
      db.close();
    } catch (e) {
      host.innerHTML = `<div class="result-placeholder">Could not render schema: ${escapeHtml(String(e))}</div>`;
    }
  }

  let hintsShown = 0;
  function revealNextHint() {
    if (!current || mock) return;
    if (hintsShown >= current.hints.length) return;
    hintsShown++;
    const list = byId("hintList");
    list.innerHTML = current.hints
      .slice(0, hintsShown)
      .map((h) => `<li>${escapeHtml(h)}</li>`)
      .join("");
    updateHintButton();
  }
  function updateHintButton() {
    const left = current ? current.hints.length - hintsShown : 0;
    byId("hintCount").textContent = left > 0 ? `(${left} left)` : "(none left)";
    byId("hintBtn").disabled = left === 0;
  }

  function starterSql(q) {
    return `-- ${q.title} (${q.difficulty})\n-- Write your query below, then Run (⌘/Ctrl+Enter) and Submit.\n\n`;
  }

  function openQuestion(qid) {
    const q = QUESTIONS.find((x) => x.id === qid);
    if (!q) return;
    // save draft of previous question
    if (current && editor) {
      localStorage.setItem(LS_DRAFT + current.id, editor.getValue());
    }
    current = q;
    hintsShown = 0;
    lastExpected = null;

    byId("welcomePanel").classList.add("hidden");
    byId("workspace").classList.remove("hidden");
    // CodeMirror was created while the workspace was display:none and
    // mis-measures its gutter; re-measure now that it's visible.
    setTimeout(() => editor.refresh(), 0);

    byId("qTitle").textContent = q.title;
    const p = loadProgress();
    byId("qMeta").innerHTML =
      `<span class="badge badge-${q.difficulty}">${q.difficulty}</span>` +
      `<span class="badge badge-cat">${escapeHtml(q.category)}</span>` +
      q.companies.map((c) => `<span class="badge badge-company">${escapeHtml(c)}</span>`).join("") +
      (p[q.id] === "solved" ? '<span class="badge badge-solved">✔ Solved</span>' : "");
    byId("qDescription").innerHTML = q.description;

    renderSchemaTables(q);
    byId("schemaSql").textContent = q.schema.trim();
    byId("schemaSql").classList.add("hidden");
    byId("toggleSchemaSql").textContent = "View CREATE / INSERT SQL";

    byId("hintList").innerHTML = "";
    updateHintButton();
    byId("solutionBlock").classList.add("hidden");
    byId("solutionBtn").textContent = "🔓 Show solution";
    byId("solutionSql").textContent = q.solution.trim();
    byId("solutionExplanation").innerHTML = q.explanation;

    byId("verdict").classList.add("hidden");
    byId("resultTabs").classList.add("hidden");
    byId("resultYours").classList.remove("hidden");
    byId("resultYours").innerHTML =
      '<div class="result-placeholder">Run your query to see output here.</div>';
    byId("resultExpected").innerHTML = "";
    byId("resultExpected").classList.add("hidden");

    const draft = localStorage.getItem(LS_DRAFT + q.id);
    editor.setValue(draft != null && draft.trim() !== "" ? draft : starterSql(q));
    editor.focus();
    const lastLine = editor.lineCount() - 1;
    editor.setCursor({ line: lastLine, ch: editor.getLine(lastLine).length });

    renderList();
    if (location.hash !== "#" + q.id) history.replaceState(null, "", "#" + q.id);
    // on small screens, scroll to workspace
    if (window.innerWidth < 800) byId("workspace").scrollIntoView({ behavior: "smooth" });
  }

  /* ---------------- filters ---------------- */
  function setDiffFilter(d) {
    filters.diff = d;
    document.querySelectorAll("#difficultyFilters .chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.diff === d);
    });
    renderList();
  }

  function initFilters() {
    document.querySelectorAll("#difficultyFilters .chip").forEach((c) => {
      c.addEventListener("click", () => setDiffFilter(c.dataset.diff));
    });
    const cats = [...new Set(QUESTIONS.map((q) => q.category))].sort();
    const sel = byId("categoryFilter");
    cats.forEach((c) => {
      const o = document.createElement("option");
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
    sel.addEventListener("change", () => { filters.cat = sel.value; renderList(); });
    byId("statusFilter").addEventListener("change", (e) => {
      filters.status = e.target.value; renderList();
    });
    byId("searchBox").addEventListener("input", (e) => {
      filters.search = e.target.value; renderList();
    });
    byId("randomBtn").addEventListener("click", () => {
      const p = loadProgress();
      const pool = QUESTIONS.filter((q) => p[q.id] !== "solved");
      const pick = (pool.length ? pool : QUESTIONS)[Math.floor(Math.random() * (pool.length ? pool.length : QUESTIONS.length))];
      openQuestion(pick.id);
    });
    byId("resetProgressBtn").addEventListener("click", () => {
      if (confirm("Clear all solved/attempted progress and saved drafts?")) {
        localStorage.removeItem(LS_PROGRESS);
        QUESTIONS.forEach((q) => localStorage.removeItem(LS_DRAFT + q.id));
        renderStats(); renderList();
        if (current) openQuestion(current.id);
      }
    });
  }

  /* ---------------- wire up ---------------- */
  function initEditor() {
    editor = CodeMirror(byId("editorHost"), {
      mode: "text/x-sql",
      theme: cmTheme(),
      lineNumbers: true,
      lineWrapping: true,
      matchBrackets: true,
      autoCloseBrackets: true,
      indentUnit: 2,
      tabSize: 2,
      placeholder: "SELECT ...",
      extraKeys: {
        "Cmd-Enter": handleRun,
        "Ctrl-Enter": handleRun,
        "Shift-Cmd-Enter": handleSubmit,
        "Shift-Ctrl-Enter": handleSubmit,
        "Ctrl-Space": triggerHint,
      },
    });
    editor.on("change", () => {
      if (current) localStorage.setItem(LS_DRAFT + current.id, editor.getValue());
    });
    // live suggestions: pop the hint list while typing identifiers (if enabled)
    editor.on("inputRead", (cm, change) => {
      if (!autocompleteOn) return;
      if (cm.state.completionActive) return;
      const ch = change.text && change.text.length === 1 ? change.text[0] : "";
      if (/^[a-zA-Z_.]$/.test(ch)) triggerHint(cm);
    });
  }

  const SQL_KEYWORDS = [
    "SELECT", "FROM", "WHERE", "GROUP BY", "ORDER BY", "HAVING", "LIMIT", "OFFSET",
    "JOIN", "LEFT JOIN", "INNER JOIN", "CROSS JOIN", "ON", "AS", "AND", "OR", "NOT",
    "IN", "IS NULL", "IS NOT NULL", "DISTINCT", "BETWEEN", "LIKE", "EXISTS",
    "CASE", "WHEN", "THEN", "ELSE", "END", "WITH", "RECURSIVE",
    "UNION", "UNION ALL", "INTERSECT", "EXCEPT",
    "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "ABS", "COALESCE", "IFNULL",
    "CAST", "LOWER", "UPPER", "LENGTH", "SUBSTR", "TRIM", "REPLACE",
    "OVER", "PARTITION BY", "ROW_NUMBER", "RANK", "DENSE_RANK", "NTILE",
    "LAG", "LEAD", "FIRST_VALUE", "LAST_VALUE",
    "ROWS BETWEEN", "UNBOUNDED PRECEDING", "PRECEDING", "CURRENT ROW", "FOLLOWING",
    "STRFTIME", "JULIANDAY", "DATE", "DATETIME", "ASC", "DESC", "NULL",
  ];

  // Custom hint: SQL keywords + the current question's tables and columns.
  // After "tablename." only that table's columns are offered.
  function queryLabHint(cm) {
    const cur = cm.getCursor();
    const line = cm.getLine(cur.line);
    let start = cur.ch;
    while (start > 0 && /\w/.test(line.charAt(start - 1))) start--;
    const word = line.slice(start, cur.ch).toLowerCase();
    const before = line.slice(0, start);

    let candidates;
    const dotMatch = before.match(/(\w+)\.$/);
    if (dotMatch && hintTables[dotMatch[1]]) {
      candidates = hintTables[dotMatch[1]].slice();
    } else {
      const schema = new Set();
      Object.keys(hintTables).forEach((t) => {
        schema.add(t);
        hintTables[t].forEach((c) => schema.add(c));
      });
      candidates = [...schema, ...SQL_KEYWORDS];
    }

    const seen = new Set();
    const list = candidates.filter((x) => {
      const k = x.toLowerCase();
      if (!k.startsWith(word) || k === word || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    return {
      list: list,
      from: CodeMirror.Pos(cur.line, start),
      to: CodeMirror.Pos(cur.line, cur.ch),
    };
  }

  function triggerHint(cm) {
    cm = cm || editor;
    // don't pop suggestions inside a -- comment
    const cur = cm.getCursor();
    const line = cm.getLine(cur.line);
    if (/--/.test(line.slice(0, cur.ch))) return;
    cm.showHint({ hint: queryLabHint, completeSingle: false });
  }

  function updateAutocompleteBtn() {
    byId("autocompleteBtn").textContent = autocompleteOn ? "✨ Suggestions: On" : "✨ Suggestions: Off";
    byId("autocompleteBtn").classList.toggle("toggle-off", !autocompleteOn);
  }

  function initButtons() {
    applyTheme();
    byId("themeBtn").addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem("sqlforge_theme", theme);
      applyTheme();
    });
    updateAutocompleteBtn();
    byId("autocompleteBtn").addEventListener("click", () => {
      autocompleteOn = !autocompleteOn;
      localStorage.setItem("sqlforge_autocomplete", autocompleteOn ? "1" : "0");
      updateAutocompleteBtn();
      editor.focus();
    });
    byId("runBtn").addEventListener("click", handleRun);
    byId("submitBtn").addEventListener("click", handleSubmit);
    byId("mockBtn").addEventListener("click", startMock);
    byId("mockSkipBtn").addEventListener("click", mockSkip);
    byId("mockEndBtn").addEventListener("click", () => {
      if (mock && confirm("End the interview now and see your scorecard?")) endMock(false);
    });
    byId("scorecardCloseBtn").addEventListener("click", () => {
      byId("scorecardModal").classList.add("hidden");
    });
    byId("hintBtn").addEventListener("click", revealNextHint);
    byId("solutionBtn").addEventListener("click", () => {
      if (mock) return;
      const block = byId("solutionBlock");
      const hidden = block.classList.toggle("hidden");
      byId("solutionBtn").textContent = hidden ? "🔓 Show solution" : "🔒 Hide solution";
    });
    byId("copySolutionBtn").addEventListener("click", () => {
      editor.setValue(current.solution.trim());
      editor.focus();
    });
    byId("toggleSchemaSql").addEventListener("click", () => {
      const sqlEl = byId("schemaSql");
      const hidden = sqlEl.classList.toggle("hidden");
      byId("toggleSchemaSql").textContent = hidden ? "View CREATE / INSERT SQL" : "Hide SQL";
    });
    byId("formatResetBtn").addEventListener("click", () => {
      if (current) { editor.setValue(starterSql(current)); editor.focus(); }
    });
    document.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => switchTab(t.dataset.tab));
    });
  }

  async function init() {
    renderStats();
    renderWelcome();
    renderMockHistory();
    initFilters();
    initEditor();
    initButtons();
    renderList();

    try {
      SQL = await initSqlJs({
        locateFile: (f) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${f}`,
      });
    } catch (e) {
      showVerdictGlobal("Could not load the SQL engine (network issue?). Refresh to retry.");
      return;
    }

    // if a question was opened before the engine finished loading, its
    // schema tables couldn't render — fill them in now
    if (current) renderSchemaTables(current);

    // deep link (#qid)
    const hash = location.hash.replace("#", "");
    if (hash && QUESTIONS.some((q) => q.id === hash)) openQuestion(hash);
  }

  function showVerdictGlobal(msg) {
    const w = byId("welcomePanel");
    const div = document.createElement("div");
    div.className = "verdict fail";
    div.style.margin = "16px 0";
    div.textContent = msg;
    w.prepend(div);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
