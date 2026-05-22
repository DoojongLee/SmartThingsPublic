const STORAGE_KEY = 'daily_todo_v1';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return {
    todos: [],
    completed: [],
    goal: 10,
    nextId: 1,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// DOM refs
const briefingDate   = document.getElementById('briefingDate');
const briefingSummary= document.getElementById('briefingSummary');
const totalCompleted = document.getElementById('totalCompleted');
const todayCompleted = document.getElementById('todayCompleted');
const remainingEl    = document.getElementById('remaining');
const goalInput      = document.getElementById('goalInput');
const goalPercent    = document.getElementById('goalPercent');
const progressFill   = document.getElementById('progressFill');
const goalDetail     = document.getElementById('goalDetail');
const todoInput      = document.getElementById('todoInput');
const addBtn         = document.getElementById('addBtn');
const todoList       = document.getElementById('todoList');
const emptyState     = document.getElementById('emptyState');
const historyToggle  = document.getElementById('historyToggle');
const historyCount   = document.getElementById('historyCount');
const historyList    = document.getElementById('historyList');

// ── Date helpers ──────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function todayKo() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

// ── Computed values ───────────────────────────────────────────
function todayCompletedCount() {
  const today = todayStr();
  return state.completed.filter(c => c.completedAt.startsWith(today)).length;
}

function totalCompletedCount() {
  return state.completed.length;
}

function progressPercent() {
  const pct = Math.min(100, Math.round((totalCompletedCount() / state.goal) * 100));
  return pct;
}

// ── Briefing text ─────────────────────────────────────────────
function buildBriefing() {
  const todoCnt = state.todos.length;
  const todayCnt = todayCompletedCount();
  const totalCnt = totalCompletedCount();
  const pct = progressPercent();

  let msg = '';
  if (todoCnt === 0 && todayCnt === 0) {
    msg = '오늘 할일을 추가해 보세요. 작은 시작이 큰 변화를 만듭니다!';
  } else if (todoCnt === 0) {
    msg = `대단해요! 오늘 ${todayCnt}개를 모두 완료했어요. 목표 달성률 ${pct}%.`;
  } else {
    msg = `오늘 ${todayCnt}개 완료 · 남은 할일 ${todoCnt}개 · 전체 완료 ${totalCnt}개 · 목표 ${pct}% 달성`;
  }
  return msg;
}

// ── Render ────────────────────────────────────────────────────
function render() {
  // Briefing
  briefingDate.textContent = todayKo();
  briefingSummary.textContent = buildBriefing();

  // Stats
  totalCompleted.textContent = totalCompletedCount();
  todayCompleted.textContent = todayCompletedCount();
  remainingEl.textContent = state.todos.length;

  // Goal
  goalInput.value = state.goal;
  const pct = progressPercent();
  goalPercent.textContent = pct + '%';
  progressFill.style.width = pct + '%';
  const needed = Math.max(0, state.goal - totalCompletedCount());
  goalDetail.textContent = needed > 0
    ? `목표 ${state.goal}개까지 ${needed}개 남았어요`
    : `목표 ${state.goal}개 달성 완료! 🎉`;

  // Todo list
  todoList.innerHTML = '';
  if (state.todos.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    state.todos.forEach(todo => {
      const item = createTodoEl(todo);
      todoList.appendChild(item);
    });
  }

  // History
  const completedToday = state.completed.filter(c => c.completedAt.startsWith(todayStr()));
  const allCompleted = state.completed;
  historyCount.textContent = allCompleted.length;

  historyList.innerHTML = '';
  [...allCompleted].reverse().forEach(c => {
    const el = document.createElement('div');
    el.className = 'history-item';
    el.innerHTML = `
      <div class="check-icon">${checkSvg()}</div>
      <span class="history-text">${escHtml(c.text)}</span>
      <span class="history-date">${formatDate(c.completedAt)}</span>
    `;
    historyList.appendChild(el);
  });
}

function checkSvg() {
  return `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="2,6 5,9 10,3"/>
  </svg>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function createTodoEl(todo) {
  const item = document.createElement('div');
  item.className = 'todo-item';
  item.dataset.id = todo.id;
  item.innerHTML = `
    <div class="todo-check" data-id="${todo.id}" title="완료">
      ${checkSvg()}
    </div>
    <span class="todo-text">${escHtml(todo.text)}</span>
    <button class="todo-delete" data-id="${todo.id}" title="삭제">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
      </svg>
    </button>
  `;
  return item;
}

// ── Actions ───────────────────────────────────────────────────
function addTodo(text) {
  text = text.trim();
  if (!text) return;
  state.todos.push({ id: state.nextId++, text });
  saveState();
  render();
}

function completeTodo(id) {
  const idx = state.todos.findIndex(t => t.id === id);
  if (idx === -1) return;

  const [todo] = state.todos.splice(idx, 1);
  state.completed.push({ ...todo, completedAt: new Date().toISOString() });
  saveState();

  // Animate out then re-render
  const el = todoList.querySelector(`[data-id="${id}"]`);
  if (el) {
    el.classList.add('completing');
    setTimeout(() => render(), 300);
  } else {
    render();
  }
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  saveState();
  render();
}

// ── Event listeners ───────────────────────────────────────────
addBtn.addEventListener('click', () => {
  addTodo(todoInput.value);
  todoInput.value = '';
  todoInput.focus();
});

todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    addTodo(todoInput.value);
    todoInput.value = '';
  }
});

todoList.addEventListener('click', e => {
  const checkEl = e.target.closest('.todo-check');
  const deleteEl = e.target.closest('.todo-delete');
  if (checkEl) completeTodo(Number(checkEl.dataset.id));
  if (deleteEl) deleteTodo(Number(deleteEl.dataset.id));
});

goalInput.addEventListener('change', () => {
  const v = parseInt(goalInput.value, 10);
  if (v > 0) {
    state.goal = v;
    saveState();
    render();
  }
});

historyToggle.addEventListener('click', () => {
  historyList.classList.toggle('hidden');
  const isOpen = !historyList.classList.contains('hidden');
  historyToggle.style.borderColor = isOpen ? 'var(--accent)' : '';
  historyToggle.style.color = isOpen ? 'var(--text)' : '';
});

// ── Init ──────────────────────────────────────────────────────
render();
