/* ============================================================
   PROJECT 2: TO-DO APP — app.js
   This file is where the real learning is. Read it top to bottom.
   Every numbered block matches a section in NOTES.md.
   ============================================================ */

/* ------------------------------------------------------------
   1. STATE — the single source of truth
   ------------------------------------------------------------
   `todos` is an ARRAY of OBJECTS. Each object is one task:
     { id: 1732091234567, text: 'Buy milk', completed: false }

   RULE OF THUMB: the screen is a *picture* of this array.
   Change the array → call render() → screen updates.
   Never edit the HTML by hand. This is exactly how React works,
   which is why we're practising it now.
   ------------------------------------------------------------ */
const STORAGE_KEY = 'keaton-todos-v1';

let todos = loadTodos();      // filled from localStorage on page load
let currentFilter = 'all';    // 'all' | 'active' | 'completed'
let editingId = null;         // id of the task being edited, or null

/* ID GENERATOR
   Date.now() alone is NOT safe: two tasks added in the same millisecond get
   the same id, and then deleting one deletes both. So we keep a counter and
   increment it. (I found this by writing a test that added 3 tasks instantly.) */
let idSeed = Date.now();
function makeId() {
  return idSeed++;
}

/* ------------------------------------------------------------
   2. GRAB THE ELEMENTS ONCE
   ------------------------------------------------------------
   document.getElementById looks through the page for that id.
   We do it once at the top instead of repeatedly inside functions —
   cheaper and easier to read.
   ------------------------------------------------------------ */
const form         = document.getElementById('todoForm');
const input        = document.getElementById('todoInput');
const list         = document.getElementById('todoList');
const emptyState   = document.getElementById('emptyState');
const countEl      = document.getElementById('count');
const itemsLeftEl  = document.getElementById('itemsLeft');
const clearBtn     = document.getElementById('clearCompleted');
const filterBtns   = document.querySelectorAll('.filter-btn');

/* ------------------------------------------------------------
   3. PERSISTENCE — localStorage
   ------------------------------------------------------------
   localStorage can ONLY store strings. So we convert:
     array  → string  with JSON.stringify()   (saving)
     string → array   with JSON.parse()       (loading)

   try/catch: if the stored data is corrupted, we don't crash the
   whole app — we just start with an empty list.
   ------------------------------------------------------------ */
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('Could not read saved tasks, starting fresh.', error);
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

/* ------------------------------------------------------------
   4. ACTIONS — the only places `todos` gets changed
   ------------------------------------------------------------ */

function addTodo(text) {
  const clean = text.trim();       // .trim() removes spaces at both ends
  if (!clean) return;              // ignore empty submissions

  todos.unshift({                  // unshift = add to the START of the array
    id: makeId(),                  // guaranteed unique id
    text: clean,
    completed: false,
  });

  saveTodos();
  render();
}

function toggleTodo(id) {
  // .find() returns the FIRST item matching the test, or undefined
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  todo.completed = !todo.completed;  // flip true ↔ false
  saveTodos();
  render();
}

function deleteTodo(id) {
  // .filter() returns a NEW array keeping items where the test is true.
  // Here: keep everything whose id is NOT the one we're deleting.
  todos = todos.filter(t => t.id !== id);
  saveTodos();
  render();
}

function startEditing(id) {
  editingId = id;   // render() will now show an <input> for this task
  render();
}

function commitEdit(id, newText) {
  const clean = newText.trim();
  const todo = todos.find(t => t.id === id);

  if (todo && clean) todo.text = clean;   // empty input = keep the old text

  editingId = null;
  saveTodos();
  render();
}

function cancelEdit() {
  editingId = null;
  render();
}

function clearCompleted() {
  todos = todos.filter(t => !t.completed);
  saveTodos();
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  render();
}

/* ------------------------------------------------------------
   5. RENDER — build the HTML from the state
   ------------------------------------------------------------ */

// Which tasks should be on screen right now?
function getVisibleTodos() {
  if (currentFilter === 'active')    return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t => t.completed);
  return todos;                                   // 'all'
}

// SECURITY: never drop raw user text into innerHTML.
// Someone could type <img src=x onerror="alert('hacked')"> and it would RUN.
// Escaping the characters below turns HTML into harmless plain text.
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render() {
  const visible = getVisibleTodos();

  /* .map() turns an array of task objects into an array of HTML strings.
     { ... } inside a template literal = interpolation (insert a value).
     .join('') glues the array into one big HTML string. */
  list.innerHTML = visible.map(todo => {
    const isDone = todo.completed ? 'completed' : '';

    // If this task is being edited, show an input instead of the text
    const body = editingId === todo.id
      ? `<input class="edit-input" data-id="${todo.id}" value="${escapeHtml(todo.text)}">`
      : `<span class="todo-text" data-id="${todo.id}" title="Double-click to edit">${escapeHtml(todo.text)}</span>`;

    return `
      <li class="todo-item ${isDone}" data-id="${todo.id}">
        <input type="checkbox" class="todo-check" data-id="${todo.id}"
               ${todo.completed ? 'checked' : ''}
               aria-label="Mark task complete">
        ${body}
        <button class="btn-delete" data-id="${todo.id}" aria-label="Delete task">✕</button>
      </li>`;
  }).join('');

  /* Update the counters */
  const remaining = todos.filter(t => !t.completed).length;
  countEl.textContent = remaining;
  itemsLeftEl.textContent = `${remaining} item${remaining === 1 ? '' : 's'} left`;

  /* Show the empty state only when the visible list is empty */
  emptyState.classList.toggle('hidden', visible.length > 0);

  /* Highlight the active filter button */
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });

  /* If we just entered edit mode, focus the input and select its text */
  if (editingId !== null) {
    const editInput = list.querySelector('.edit-input');
    if (editInput) {
      editInput.focus();
      editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    }
  }
}

/* ------------------------------------------------------------
   6. EVENTS — one listener per thing the user can do
   ------------------------------------------------------------ */

// Adding a task: the form's "submit" fires on button click OR Enter key
form.addEventListener('submit', event => {
  event.preventDefault();   // stop the page reloading (forms reload by default)
  addTodo(input.value);
  input.value = '';         // clear the box
  input.focus();            // keep cursor ready for the next task
});

/* EVENT DELEGATION — the important idea in this file.
   Instead of attaching a click listener to every single task (they're
   created and destroyed constantly), we attach ONE listener to the <ul>
   and work out which child was clicked using event.target.closest().
   One listener, unlimited tasks. Professional pattern, less memory. */
list.addEventListener('click', event => {
  const target = event.target;

  if (target.classList.contains('todo-check')) {
    toggleTodo(Number(target.dataset.id));   // dataset values are strings → convert
  }

  if (target.classList.contains('btn-delete')) {
    deleteTodo(Number(target.dataset.id));
  }
});

// Double-click a task's text → edit it
list.addEventListener('dblclick', event => {
  if (event.target.classList.contains('todo-text')) {
    startEditing(Number(event.target.dataset.id));
  }
});

// Save or cancel the edit
list.addEventListener('keydown', event => {
  if (!event.target.classList.contains('edit-input')) return;

  const id = Number(event.target.dataset.id);

  if (event.key === 'Enter')  commitEdit(id, event.target.value);
  if (event.key === 'Escape') cancelEdit();
});

// Clicking away from the edit input also saves
list.addEventListener('blur', event => {
  if (event.target.classList.contains('edit-input')) {
    commitEdit(Number(event.target.dataset.id), event.target.value);
  }
}, true);   // the `true` makes this listener fire during the capture phase,
            // which is needed because blur doesn't bubble. (Advanced — see NOTES.)

// Filter buttons
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

// Clear completed
clearBtn.addEventListener('click', clearCompleted);

/* ------------------------------------------------------------
   7. START THE APP
   ------------------------------------------------------------ */
render();   // draw whatever was loaded from localStorage

// Handy for debugging — open DevTools Console and inspect the state:
window.showState = () => console.log(todos);
