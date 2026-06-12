/* ============================================================================
   QueryLab Modern - Main Application
   ============================================================================ */

let editor = null;
let database = null;
let currentQuestion = null;
let allQuestions = [];
let filteredQuestions = [];
let userProgress = {}; // { questionId: { status, solution, timestamp } }
let currentUser = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
  // Check for user session
  checkUserSession();
  
  // Initialize CodeMirror
  initializeEditor();
  
  // Load questions
  window.QUESTIONS = window.QUESTIONS || [];
  allQuestions = window.QUESTIONS;
  
  // Load user progress from localStorage
  loadUserProgress();
  
  // Initialize database
  await initializeDatabase();
  
  // Render question list
  renderQuestionList();
  
  // Setup event listeners
  setupEventListeners();
  
  // Update stats
  updateStats();
  
  console.log('QueryLab initialized:', allQuestions.length, 'questions loaded');
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

function checkUserSession() {
  // Check if user is logged in (localStorage for now, will integrate backend later)
  const user = localStorage.getItem('ql_user');
  if (user) {
    currentUser = JSON.parse(user);
    showAuthenticatedUI();
  } else {
    showAnonymousUI();
  }
}

function showAnonymousUI() {
  document.getElementById('authBtn').textContent = 'Sign In';
  document.getElementById('authBtn').onclick = () => openLoginModal();
  currentUser = null;
}

function showAuthenticatedUI() {
  const authBtn = document.getElementById('authBtn');
  authBtn.textContent = currentUser.username;
  authBtn.onclick = () => logout();
}

function openLoginModal() {
  document.getElementById('registerModal').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
}

function openRegisterModal() {
  document.getElementById('loginModal').classList.add('hidden');
  document.getElementById('registerModal').classList.remove('hidden');
}

function logout() {
  localStorage.removeItem('ql_user');
  currentUser = null;
  resetProgress();
  showAnonymousUI();
  location.reload();
}

// ============================================================================
// USER PROGRESS
// ============================================================================

function loadUserProgress() {
  const saved = localStorage.getItem('ql_progress');
  userProgress = saved ? JSON.parse(saved) : {};
}

function saveUserProgress() {
  localStorage.setItem('ql_progress', JSON.stringify(userProgress));
}

function resetProgress() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    userProgress = {};
    saveUserProgress();
    updateStats();
    renderQuestionList();
  }
}

function markSolved(questionId) {
  if (!userProgress[questionId]) {
    userProgress[questionId] = {};
  }
  userProgress[questionId].status = 'solved';
  userProgress[questionId].timestamp = new Date().toISOString();
  saveUserProgress();
  updateStats();
  renderQuestionList();
}

function markAttempted(questionId) {
  if (!userProgress[questionId]) {
    userProgress[questionId] = {};
  }
  userProgress[questionId].status = 'attempted';
  userProgress[questionId].timestamp = new Date().toISOString();
  saveUserProgress();
  renderQuestionList();
}

function updateStats() {
  const solved = Object.values(userProgress).filter(p => p.status === 'solved').length;
  const total = allQuestions.length;
  document.getElementById('solvedCount').textContent = `${solved}/${total}`;
}

// ============================================================================
// DATABASE & SQL EXECUTION
// ============================================================================

async function initializeDatabase() {
  // sql.js is loaded from CDN in HTML
  // Database is created per question when needed
}

async function executeSQL(sql, questionId) {
  try {
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) throw new Error('Question not found');
    
    // Create fresh database for this question
    const DB = await initSqlJs();
    const db = new DB.Database();
    
    // Load schema
    try {
      db.run(question.schema);
    } catch (e) {
      return { error: 'Schema error: ' + e.message };
    }
    
    // Execute user query
    try {
      const stmt = db.prepare(sql);
      const rows = [];
      const columns = stmt.getColumnNames();
      
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      
      return { columns, rows, error: null };
    } catch (e) {
      return { error: 'SQL Error: ' + e.message };
    }
  } catch (e) {
    return { error: 'Error: ' + e.message };
  }
}

async function runQuery() {
  if (!currentQuestion) return;
  
  const sql = editor.getValue();
  const results = await executeSQL(sql, currentQuestion.id);
  
  displayResults(results);
  if (!results.error) {
    markAttempted(currentQuestion.id);
  }
}

async function submitQuery() {
  if (!currentQuestion) return;
  
  const sql = editor.getValue();
  const userResults = await executeSQL(sql, currentQuestion.id);
  
  if (userResults.error) {
    displayResults(userResults);
    return;
  }
  
  // Get reference solution
  const refResults = await executeSQL(currentQuestion.solution, currentQuestion.id);
  
  // Compare results
  const match = compareResults(userResults, refResults);
  
  if (match) {
    markSolved(currentQuestion.id);
    displayResults({
      ...userResults,
      message: '✓ Correct! Great job!',
      correct: true
    });
  } else {
    displayResults({
      ...userResults,
      message: '✗ Not quite right. Check your output.',
      correct: false
    });
  }
}

function compareResults(userResult, refResult) {
  // Simple comparison: same columns and same rows
  if (userResult.error || refResult.error) return false;
  
  if (userResult.columns.length !== refResult.columns.length) return false;
  
  if (userResult.rows.length !== refResult.rows.length) return false;
  
  // Check if rows match (order may or may not matter)
  const userRows = userResult.rows.map(r => JSON.stringify(r)).sort();
  const refRows = refResult.rows.map(r => JSON.stringify(r)).sort();
  
  return userRows.every((row, i) => row === refRows[i]);
}

function displayResults(results) {
  const container = document.getElementById('resultsContent');
  
  if (results.error) {
    container.innerHTML = `<div class="error-message">${results.error}</div>`;
    return;
  }
  
  let html = '';
  
  if (results.message) {
    const className = results.correct ? 'success' : 'error';
    html += `<div class="${className}-message">${results.message}</div>`;
  }
  
  if (results.rows.length === 0) {
    html += '<p>No rows returned.</p>';
    container.innerHTML = html;
    return;
  }
  
  // Build table
  html += '<table class="results-table"><thead><tr>';
  results.columns.forEach(col => {
    html += `<th>${col}</th>`;
  });
  html += '</tr></thead><tbody>';
  
  results.rows.forEach(row => {
    html += '<tr>';
    results.columns.forEach(col => {
      const value = row[col] === null ? 'NULL' : row[col];
      html += `<td>${escapeHtml(value)}</td>`;
    });
    html += '</tr>';
  });
  
  html += '</tbody></table>';
  container.innerHTML = html;
}

function escapeHtml(text) {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============================================================================
// EDITOR
// ============================================================================

function initializeEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById('sqlEditor'), {
    mode: 'text/x-sql',
    lineNumbers: true,
    theme: localStorage.getItem('sqlforge_theme') === 'dark' ? 'material-darker' : 'default',
    indentWithTabs: false,
    indentUnit: 2,
    lineWrapping: true,
    extraKeys: {
      'Ctrl-Enter': runQuery,
      'Cmd-Enter': runQuery
    }
  });
}

// ============================================================================
// QUESTION RENDERING
// ============================================================================

function renderQuestionList() {
  const container = document.getElementById('questionList');
  container.innerHTML = '';
  
  // Filter questions based on current filters
  filterQuestions();
  
  filteredQuestions.forEach(q => {
    const progress = userProgress[q.id];
    const status = progress?.status || 'todo';
    
    const div = document.createElement('div');
    div.className = `question-item ${status === 'solved' ? 'solved' : ''}`;
    div.onclick = () => selectQuestion(q.id);
    
    div.innerHTML = `
      <div class="question-item-title">${q.title}</div>
      <div class="question-item-meta">
        <span class="badge badge-${q.difficulty.toLowerCase()}">${q.difficulty}</span>
        <span>${status === 'solved' ? '✓' : status === 'attempted' ? '◐' : '○'}</span>
      </div>
    `;
    
    container.appendChild(div);
  });
}

function filterQuestions() {
  const difficulty = document.querySelector('.filter-btn.active')?.dataset.value || 'All';
  const category = document.getElementById('categoryFilter')?.value || 'All';
  const status = document.getElementById('statusFilter')?.value || 'All';
  const search = document.getElementById('searchBox')?.value || '';
  
  filteredQuestions = allQuestions.filter(q => {
    if (difficulty !== 'All' && q.difficulty !== difficulty) return false;
    if (category !== 'All' && q.category !== category) return false;
    
    const progress = userProgress[q.id];
    const qStatus = progress?.status || 'todo';
    if (status !== 'All' && qStatus !== status) return false;
    
    if (search && !q.title.toLowerCase().includes(search.toLowerCase())) return false;
    
    return true;
  });
}

function selectQuestion(questionId) {
  currentQuestion = allQuestions.find(q => q.id === questionId);
  if (!currentQuestion) return;
  
  displayQuestion();
  showWorkspace();
}

function displayQuestion() {
  if (!currentQuestion) return;
  
  // Update header
  document.getElementById('questionTitle').textContent = currentQuestion.title;
  document.getElementById('difficultyBadge').textContent = currentQuestion.difficulty;
  document.getElementById('difficultyBadge').className = `badge badge-${currentQuestion.difficulty.toLowerCase()}`;
  document.getElementById('categoryBadge').textContent = currentQuestion.category;
  
  // Display description
  document.getElementById('questionDescription').innerHTML = currentQuestion.description;
  
  // Display schema
  document.getElementById('schemaDisplay').textContent = currentQuestion.schema;
  
  // Display hints
  const hintsContainer = document.getElementById('hintsContainer');
  hintsContainer.innerHTML = '';
  currentQuestion.hints.forEach((hint, i) => {
    const div = document.createElement('div');
    div.className = 'hint';
    div.textContent = `${i + 1}. ${hint}`;
    hintsContainer.appendChild(div);
  });
  
  // Reset solution
  document.getElementById('solutionBox').classList.add('hidden');
  document.getElementById('toggleSolutionBtn').textContent = 'Show solution';
  
  // Load saved code
  const saved = userProgress[currentQuestion.id]?.solution || '';
  editor.setValue(saved || '');
  editor.focus();
  
  // Clear results
  document.getElementById('resultsContent').innerHTML = '<p class="text-dim">Run a query to see results...</p>';
}

function showWorkspace() {
  document.getElementById('welcomePanel').classList.add('hidden');
  document.getElementById('workspacePanel').classList.remove('hidden');
}

function showWelcome() {
  document.getElementById('workspacePanel').classList.add('hidden');
  document.getElementById('welcomePanel').classList.remove('hidden');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Auth
  document.getElementById('authBtn').addEventListener('click', () => {
    if (!currentUser) openLoginModal();
  });
  
  document.getElementById('switchToRegisterBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openRegisterModal();
  });
  
  document.getElementById('switchToLoginBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openLoginModal();
  });
  
  document.getElementById('loginModalOverlay').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('hidden');
  });
  
  document.getElementById('registerModalOverlay').addEventListener('click', () => {
    document.getElementById('registerModal').classList.add('hidden');
  });
  
  document.getElementById('loginCloseBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('hidden');
  });
  
  document.getElementById('registerCloseBtn').addEventListener('click', () => {
    document.getElementById('registerModal').classList.add('hidden');
  });
  
  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // TODO: Call backend API
    // For now, just simulate login
    const user = { username: email.split('@')[0], email };
    localStorage.setItem('ql_user', JSON.stringify(user));
    currentUser = user;
    showAuthenticatedUI();
    document.getElementById('loginModal').classList.add('hidden');
  });
  
  // Register form
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    
    // TODO: Call backend API
    const user = { username, email };
    localStorage.setItem('ql_user', JSON.stringify(user));
    currentUser = user;
    showAuthenticatedUI();
    document.getElementById('registerModal').classList.add('hidden');
  });
  
  // Editor
  document.getElementById('runBtn').addEventListener('click', runQuery);
  document.getElementById('submitBtn').addEventListener('click', submitQuery);
  document.getElementById('clearResultsBtn').addEventListener('click', () => {
    document.getElementById('resultsContent').innerHTML = '<p class="text-dim">Run a query to see results...</p>';
  });
  
  // Sidebar
  document.getElementById('searchBox').addEventListener('input', renderQuestionList);
  document.getElementById('categoryFilter').addEventListener('change', renderQuestionList);
  document.getElementById('statusFilter').addEventListener('change', renderQuestionList);
  document.getElementById('randomBtn').addEventListener('click', selectRandomQuestion);
  document.getElementById('resetBtn').addEventListener('click', resetProgress);
  
  // Difficulty filters
  document.querySelectorAll('[data-filter="difficulty"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('[data-filter="difficulty"]').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      renderQuestionList();
    });
  });
  
  // Navigation
  document.getElementById('getStartedBtn').addEventListener('click', () => {
    selectQuestion(filteredQuestions[0]?.id || allQuestions[0].id);
  });
  
  // Theme
  document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
  
  // Mock interview
  document.getElementById('mockBtn').addEventListener('click', startMockInterview);
}

function selectRandomQuestion() {
  if (filteredQuestions.length === 0) {
    alert('No questions match your filters');
    return;
  }
  const random = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
  selectQuestion(random.id);
}

function toggleTheme() {
  const current = localStorage.getItem('sqlforge_theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('sqlforge_theme', next);
  document.documentElement.setAttribute('data-theme', next);
  
  // Update CodeMirror theme
  if (editor) {
    const theme = next === 'dark' ? 'material-darker' : 'default';
    editor.setOption('theme', theme);
  }
}

// Initialize categories filter
function initializeCategoryFilter() {
  const categories = [...new Set(allQuestions.map(q => q.category))].sort();
  const select = document.getElementById('categoryFilter');
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function startMockInterview() {
  alert('Mock interview mode coming soon!');
  // TODO: Implement mock interview mode
}

// ============================================================================
// STARTUP
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeCategoryFilter();
  init();
});

// Save editor state periodically
window.addEventListener('beforeunload', () => {
  if (currentQuestion && editor) {
    if (!userProgress[currentQuestion.id]) {
      userProgress[currentQuestion.id] = {};
    }
    userProgress[currentQuestion.id].solution = editor.getValue();
    saveUserProgress();
  }
});

// Auto-save every 30 seconds
setInterval(() => {
  if (currentQuestion && editor) {
    if (!userProgress[currentQuestion.id]) {
      userProgress[currentQuestion.id] = {};
    }
    userProgress[currentQuestion.id].solution = editor.getValue();
    saveUserProgress();
  }
}, 30000);
