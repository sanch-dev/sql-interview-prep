/* SQLForge — app logic.
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

  function compareResults(user, expected, orderMatters) {
    if (expected.columns.length !== user.columns.length) {
      return {
        pass: false,
        reason: `Wrong number of columns: your query returned ${user.columns.length} ` +
                `(${user.columns.join(", ") || "none"}), expected ${expected.columns.length} ` +
                `(${expected.columns.join(", ")}).`,
      };
    }
    if (user.values.length !== expected.values.length) {
      return {
        pass: false,
        reason: `Wrong number of rows: your query returned ${user.values.length}, ` +
                `expected ${expected.values.length}. Check your filters, joins (duplicates?), and grouping.`,
      };
    }
    let uRows = user.values, eRows = expected.values;
    if (!orderMatters) {
      uRows = [...uRows].sort((a, b) => (rowKey(a) < rowKey(b) ? -1 : 1));
      eRows = [...eRows].sort((a, b) => (rowKey(a) < rowKey(b) ? -1 : 1));
    }
    for (let i = 0; i < eRows.length; i++) {
      for (let j = 0; j < eRows[i].length; j++) {
        if (!cellsEqual(uRows[i][j], eRows[i][j])) {
          const colName = expected.columns[j] || `column ${j + 1}`;
          return {
            pass: false,
            reason: orderMatters
              ? `Row ${i + 1}, column "${colName}": got ${fmtVal(uRows[i][j])}, expected ${fmtVal(eRows[i][j])}. ` +
                `(Row order is checked for this question — verify your ORDER BY.)`
              : `Mismatch in column "${colName}": got ${fmtVal(uRows[i][j])} where ${fmtVal(eRows[i][j])} was expected ` +
                `(rows compared order-insensitively).`,
          };
        }
      }
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
        "Fix the syntax/runtime error and run again.");
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
    let db;
    let userRes;
    try {
      db = freshDb(current.schema);
      userRes = runSql(db, sql);
    } catch (e) {
      if (db) db.close();
      setStatus(current.id, "attempted");
      showVerdict("fail", "SQL error", `<pre>${escapeHtml(String(e.message || e))}</pre>`);
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
        "Nice work. Try the next one, or read the solution to compare approaches.");
    } else {
      setStatus(current.id, "attempted");
      showVerdict("fail", "✗ Wrong answer", escapeHtml(cmp.reason) +
        ' Compare the two tabs below — or take a <a href="#" id="verdictHintLink" style="color:inherit">hint</a>.');
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

  /* ---------------- question view ---------------- */
  function renderSchemaTables(q) {
    const host = byId("schemaTables");
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
    if (!current) return;
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
      theme: "material-darker",
      lineNumbers: true,
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
      },
    });
    editor.on("change", () => {
      if (current) localStorage.setItem(LS_DRAFT + current.id, editor.getValue());
    });
  }

  function initButtons() {
    byId("runBtn").addEventListener("click", handleRun);
    byId("submitBtn").addEventListener("click", handleSubmit);
    byId("hintBtn").addEventListener("click", revealNextHint);
    byId("solutionBtn").addEventListener("click", () => {
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
