import { exportSingleIcs, exportAllIcs, parseIcs } from './calendar.js';

const STORAGE_KEY = 'daily_todo_v1';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState();
  } catch {
    return defaultState();
  }
}

function defaultState() {
  return { todos: [], completed: [], goal: 10, nextId: 1 };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

// ── DOM refs ──────────────────────────────────────────────────
const briefingDate    = document.getElementById('briefingDate');
const briefingSummary = document.getElementById('briefingSummary');
const totalCompleted  = document.getElementById('totalCompleted');
const todayCompleted  = document.getElementById('todayCompleted');
const remainingEl     = document.getElementById('remaining');
const goalInput       = document.getElementById('goalInput');
const goalPercent     = document.getElementById('goalPercent');
const progressFill    = document.getElementById('progressFill');
const goalDetail      = document.getElementById('goalDetail');
const todoInput       = document.getElementById('todoInput');
const dueDateInput    = document.getElementById('dueDateInput');
const addBtn          = document.getElementById('addBtn');
const todoList        = document.getElementById('todoList');
const emptyState      = document.getElementById('emptyState');
const historyToggle   = document.getElementById('historyToggle');
const historyCount    = document.getElementById('historyCount');
const historyList     = document.getElementById('historyList');
const exportAllBtn    = document.getElementById('exportAllBtn');
const importIcsInput  = document.getElementById('importIcsInput');
const importBtn       = document.getElementById('importBtn');
const importToast     = document.getElementById('importToast');

// ── Date helpers ──────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDueDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const today = todayStr();
  if (dateStr === today) return '오늘';
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === tomorrow.toISOString().slice(0, 10)) return '내일';
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function todayKo() {
  return new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
}

// ── Computed ──────────────────────────────────────────────────
function todayCompletedCount() {
  return state.completed.filter(c => c.completedAt.startsWith(todayStr())).length;
}

function totalCompletedCount() { return state.completed.length; }

function progressPercent() {
  return Math.min(100, Math.round((totalCompletedCount() / state.goal) * 100));
}

// ── Briefing ──────────────────────────────────────────────────
function buildBriefing() {
  const todoCnt  = state.todos.length;
  const todayCnt = todayCompletedCount();
  const totalCnt = totalCompletedCount();
  const pct      = progressPercent();

  if (todoCnt === 0 && todayCnt === 0)
    return '오늘 할일을 추가해 보세요. 작은 시작이 큰 변화를 만듭니다!';
  if (todoCnt === 0)
    return `대단해요! 오늘 ${todayCnt}개를 모두 완료했어요. 목표 달성률 ${pct}%.`;
  return `오늘 ${todayCnt}개 완료 · 남은 할일 ${todoCnt}개 · 전체 완료 ${totalCnt}개 · 목표 ${pct}% 달성`;
}

// ── Render ────────────────────────────────────────────────────
function render() {
  briefingDate.textContent    = todayKo();
  briefingSummary.textContent = buildBriefing();

  totalCompleted.textContent = totalCompletedCount();
  todayCompleted.textContent = todayCompletedCount();
  remainingEl.textContent    = state.todos.length;

  goalInput.value = state.goal;
  const pct = progressPercent();
  goalPercent.textContent    = pct + '%';
  progressFill.style.width   = pct + '%';
  const needed = Math.max(0, state.goal - totalCompletedCount());
  goalDetail.textContent = needed > 0
    ? `목표 ${state.goal}개까지 ${needed}개 남았어요`
    : `목표 ${state.goal}개 달성 완료! 🎉`;

  todoList.innerHTML = '';
  if (state.todos.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    state.todos.forEach(todo => todoList.appendChild(createTodoEl(todo)));
  }

  exportAllBtn.disabled = state.todos.length === 0 && state.completed.length === 0;

  historyCount.textContent = state.completed.length;
  historyList.innerHTML = '';
  [...state.completed].reverse().forEach(c => {
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

function calSvg() {
  return `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1" y="2" width="14" height="13" rx="2"/>
    <line x1="1" y1="6" x2="15" y2="6"/>
    <line x1="5" y1="1" x2="5" y2="4"/>
    <line x1="11" y1="1" x2="11" y2="4"/>
    <circle cx="5.5" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/>
    <circle cx="10.5" cy="10" r="1" fill="currentColor" stroke="none"/>
  </svg>`;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function createTodoEl(todo) {
  const item = document.createElement('div');
  item.className = 'todo-item';
  item.dataset.id = todo.id;

  const dueBadge = todo.dueDate
    ? `<span class="due-badge ${todo.dueDate < todayStr() ? 'overdue' : ''}">${formatDueDate(todo.dueDate)}</span>`
    : '';

  item.innerHTML = `
    <div class="todo-check" data-id="${todo.id}" title="완료">${checkSvg()}</div>
    <div class="todo-body">
      <span class="todo-text">${escHtml(todo.text)}</span>
      ${dueBadge}
    </div>
    <button class="todo-cal" data-id="${todo.id}" title="Apple Calendar에 추가">${calSvg()}</button>
    <button class="todo-delete" data-id="${todo.id}" title="삭제">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
      </svg>
    </button>
  `;
  return item;
}

// ── Actions ───────────────────────────────────────────────────
function addTodo(text, dueDate) {
  text = text.trim();
  if (!text) return;
  state.todos.push({ id: state.nextId++, text, dueDate: dueDate || null });
  saveState();
  render();
}

function completeTodo(id) {
  const idx = state.todos.findIndex(t => t.id === id);
  if (idx === -1) return;
  const [todo] = state.todos.splice(idx, 1);
  state.completed.push({ ...todo, completedAt: new Date().toISOString() });
  saveState();
  const el = todoList.querySelector(`[data-id="${id}"]`);
  if (el) { el.classList.add('completing'); setTimeout(() => render(), 300); }
  else render();
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  saveState();
  render();
}

function showToast(msg, type = 'success') {
  importToast.textContent = msg;
  importToast.className = `toast toast-${type} show`;
  setTimeout(() => importToast.classList.remove('show'), 3000);
}

// ── Event listeners ───────────────────────────────────────────
addBtn.addEventListener('click', () => {
  addTodo(todoInput.value, dueDateInput.value);
  todoInput.value = '';
  dueDateInput.value = '';
  todoInput.focus();
});

todoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    addTodo(todoInput.value, dueDateInput.value);
    todoInput.value = '';
    dueDateInput.value = '';
  }
});

todoList.addEventListener('click', e => {
  const checkEl  = e.target.closest('.todo-check');
  const deleteEl = e.target.closest('.todo-delete');
  const calEl    = e.target.closest('.todo-cal');
  if (checkEl)  completeTodo(Number(checkEl.dataset.id));
  if (deleteEl) deleteTodo(Number(deleteEl.dataset.id));
  if (calEl) {
    const todo = state.todos.find(t => t.id === Number(calEl.dataset.id));
    if (todo) { exportSingleIcs(todo); showToast('ICS 파일을 다운로드했어요. Calendar 앱에서 열어보세요!'); }
  }
});

goalInput.addEventListener('change', () => {
  const v = parseInt(goalInput.value, 10);
  if (v > 0) { state.goal = v; saveState(); render(); }
});

historyToggle.addEventListener('click', () => {
  historyList.classList.toggle('hidden');
  const isOpen = !historyList.classList.contains('hidden');
  historyToggle.style.borderColor = isOpen ? 'var(--accent)' : '';
  historyToggle.style.color       = isOpen ? 'var(--text)' : '';
});

// Calendar: export all
exportAllBtn.addEventListener('click', () => {
  const all = [...state.todos, ...state.completed];
  if (all.length === 0) return;
  exportAllIcs(all);
  showToast(`총 ${all.length}개 항목을 ICS로 내보냈어요!`);
});

// Calendar: import ICS
importBtn.addEventListener('click', () => importIcsInput.click());

importIcsInput.addEventListener('change', () => {
  const file = importIcsInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const parsed = parseIcs(e.target.result);
    if (parsed.length === 0) { showToast('가져올 일정이 없어요.', 'error'); return; }

    let added = 0;
    parsed.forEach(item => {
      if (!item.completed) {
        state.todos.push({ id: state.nextId++, text: item.text, dueDate: item.dueDate });
        added++;
      }
    });
    saveState();
    render();
    showToast(`${added}개 일정을 할일로 가져왔어요!`);
  };
  reader.readAsText(file);
  importIcsInput.value = '';
});

// ── Init ──────────────────────────────────────────────────────
dueDateInput.min = todayStr();
render();
