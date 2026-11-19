# 📚 Project 2 Notes — To-Do App (localStorage)

**Why this project matters:** Project 1 taught you layout. This one teaches you **state** — and state is what separates a website from an application. Everything from here on (React, Node, databases) is about storing and changing state correctly.

Read this after you've clicked around the app. Match the numbers to the comment blocks in `app.js`.

---

## 1. The big idea: the screen is a picture of the data

In Project 1, the HTML *was* the content — you typed the text straight into the page.

In an app, the HTML is **generated from data**. Your entire to-do list lives in one variable:

```js
let todos = [
  { id: 1732091234567, text: 'Buy milk', completed: false },
  { id: 1732091234999, text: 'Finish project 2', completed: true }
];
```

Each task is an **object** with three properties:
- `id` — a unique number so we can find *this specific* task later
- `text` — what the task says
- `completed` — true or false

The flow is always the same three steps:

```
user does something  →  change the array  →  render()
```

**Never** reach into the HTML and edit a task by hand. Change the array, re-draw the screen. That one rule is the whole difference between spaghetti code and maintainable code.

> **A real bug I found by testing:** my first version used `Date.now()` for the id. I wrote a test that added three tasks instantly — and they all got the *same* id, so deleting one deleted all three. A human can't click twice in one millisecond, but automated tests, imports, and fast scripts absolutely can. The fix is a counter:
> ```js
> let idSeed = Date.now();
> function makeId() { return idSeed++; }
> ```
> **Lesson:** "it works when I click slowly" is not the same as "it's correct." That's the entire reason tests exist — and it's a great story to tell in an interview.

---

## 2. localStorage: making data survive a refresh

Open the app, add tasks, refresh the page — they're still there. That's `localStorage`.

**The catch:** `localStorage` only stores **strings**. A JavaScript array isn't a string. So we convert both ways:

| Direction | Method | What it does |
|---|---|---|
| Saving | `JSON.stringify(todos)` | array → JSON string |
| Loading | `JSON.parse(raw)` | JSON string → array |

```js
localStorage.setItem('keaton-todos-v1', JSON.stringify(todos));  // save
const todos = JSON.parse(localStorage.getItem('keaton-todos-v1')); // load
```

**Try this to really get it** — in DevTools (F12) → **Application** tab → **Local Storage** → your site. You'll see the raw string, starting with `[{"id":...`. That's your array as text.

**Why `try/catch` around the load?** If the stored string is ever corrupted (or someone edits it by hand), `JSON.parse` throws an error and would kill the whole app before it starts. `try/catch` says: "if this fails, start with an empty list instead of crashing." Defensive coding — worth mentioning in an interview.

**The `-v1` in the key** is deliberate. If you later change the shape of a task object, old saved data will break your app. Bumping to `-v2` gives you a clean slate without crashing existing users. Small habit, real production concern.

---

## 3. The array methods you'll use for the rest of your career

Four methods do 95% of the work in this file. Learn these cold.

### `.map()` — transform every item
Takes an array, returns a **new array of the same length**, each item transformed.

```js
todos.map(todo => todo.text)        // ['Buy milk', 'Finish project 2']
```
In our app: turn each task object into an HTML string.

### `.filter()` — keep only matching items
Returns a **new array, shorter or equal** — items where the test is `true`.

```js
todos.filter(t => !t.completed)     // only unfinished tasks
todos.filter(t => t.id !== 5)       // everything except id 5 → that's "delete"
```
Deleting by filtering is a big deal: we don't *remove* an item, we build a new array without it. That's how modern frameworks think.

### `.find()` — get ONE item
Returns the first match, or `undefined`. Used to locate a task before changing it.

```js
const todo = todos.find(t => t.id === 5);
todo.completed = !todo.completed;   // objects are references — this mutates the real one
```

### `.forEach()` — just loop, don't return
Used for side effects, like attaching listeners to the 3 filter buttons.

**All four take a callback** — a function you pass in, which the method calls for you. `t => t.completed` is an arrow function. `t` is just the parameter name (short for "todo").

> **`.forEach()` vs `.map()`** in one line: `forEach` = "do something with each", `map` = "give me a new array".

---

## 4. Event delegation — the professional pattern

Every task has a checkbox and a delete button. Naively, you'd attach a listener to each one:

```js
// ❌ doesn't work anyway — these elements don't exist yet!
document.querySelectorAll('.btn-delete').forEach(...)
```

Two problems: the elements are created *after* page load, and you leak memory as tasks come and go.

**The fix — one listener on the parent:**

```js
list.addEventListener('click', event => {
  if (event.target.classList.contains('btn-delete')) { ... }
});
```

Clicks on children **bubble up** to the `<ul>`. One listener handles every task, forever, including ones that don't exist yet.

**Why `data-id`?** The listener knows *what* was clicked, but not *which task* it belongs to. So each element carries its id as an attribute:

```html
<button class="btn-delete" data-id="1732091234567">✕</button>
```
Read in JS with `element.dataset.id`. Note it comes back as a **string** — hence `Number(...)` before comparing with `===`.

**Why `closest()` isn't used for the li but is useful generally:** `event.target` can be a nested element. `event.target.closest('.todo-item')` walks up to the nearest matching ancestor — handy when you don't know exactly which child was clicked.

---

## 5. Escaping user input (XSS) — a real security lesson

Here's what a naive version would do:

```js
list.innerHTML = `<span>${todo.text}</span>`;   // ❌ DANGEROUS
```

Now a user types this as a task:
```html
<img src=x onerror="alert('your site is hacked')">
```
The browser doesn't display it as text — it **executes** it. That's **XSS (cross-site scripting)**. In a real app it's how session cookies get stolen.

Our `escapeHtml()` converts the dangerous characters into harmless entities:

| Character | Becomes | Result |
|---|---|---|
| `<` | `&lt;` | shown as a `<` symbol, never a tag |
| `>` | `&gt;` | — |
| `&` | `&amp;` | — |
| `"` `'` | `&quot;` `&#39;` | can't break out of an attribute |

**Try it in your app right now** — add a task called `<b>bold?</b>` and watch it appear literally, not bold. Then imagine removing the `escapeHtml()` call and see what happens. That experiment is worth more than reading this paragraph.

> Rule for the rest of your career: **any string that came from a user is untrusted.** Framework escape functions (React, Vue) handle this for you — which is one of the reasons teams use frameworks.

---

## 6. The `blur` listener and the `true` argument

```js
list.addEventListener('blur', handler, true);
```

`blur` (losing focus) **doesn't bubble** — unlike `click`. Without that third argument, the listener on the `<ul>` would never fire for an input inside it.

`true` = listen during the **capture phase**, which travels top-down *before* the event reaches the element. That's how you catch non-bubbling events on a parent. Slightly advanced — mention it as "capture phase" in an interview and you'll sound like you know your stuff.

---

## 7. Why this is secretly React practice

| This app | React equivalent |
|---|---|
| `todos` array | `useState` |
| `render()` | re-render on state change |
| `currentFilter` | `useState` |
| `el.addEventListener` | `onClick={...}` |
| `.map()` building HTML | `.map()` returning JSX |
| `escapeHtml()` | automatic (React escapes by default) |

You're already doing the mental work of React. When you meet `useState` in Week 3, it'll feel like a shorter way to write what you already wrote.

---

## 8. Test it properly (don't skip)

- [ ] Add a task → appears at the **top**
- [ ] Refresh the page → task **still there**
- [ ] Tick it → strikethrough, counter decreases
- [ ] Double-click the text → edit → Enter → saved
- [ ] Double-click → Escape → change discarded
- [ ] Click away mid-edit → saved (that's the blur handler)
- [ ] Try saving an **empty** edit → old text kept
- [ ] Filter **Active** / **Completed** → correct subsets
- [ ] **Clear completed** → only finished ones vanish
- [ ] Add `<b>test</b>` → shows literally, not bold
- [ ] DevTools → Application → Local Storage → see the JSON
- [ ] Resize to phone width → still usable

---

## 9. Concepts checklist (interview-ready)

- [ ] Arrays of objects as application state
- [ ] `.map()` vs `.filter()` vs `.find()` vs `.forEach()`
- [ ] Arrow functions and callbacks
- [ ] `JSON.stringify` / `JSON.parse`
- [ ] `localStorage` limits (strings only, ~5MB, per-browser, not secure — never store tokens there)
- [ ] Event delegation + `event.target` + `dataset`
- [ ] `preventDefault()` on form submit
- [ ] XSS and output escaping
- [ ] State-driven rendering
- [ ] `try/catch` for defensive loading

---

## 10. Ship it

1. Create repo `todo-project-2` on GitHub (public, no README tick)
2. Upload `index.html`, `style.css`, `app.js`, `README.md`, `NOTES.md`, `.gitignore`
3. Netlify → Import from Git → pick the repo → no build settings → deploy
4. Rename the site: `keaton-todo`
5. ⚠️ **Project configuration → General → Visitor access → Project visibility → Public** (same trap as last time — check in incognito!)
6. Repo **About** → Website = live URL, topics: `javascript`, `todo-app`, `localstorage`, `vanilla-js`
7. In your portfolio's `index.html`, replace Project Card #02's placeholder links with the real ones
8. Tracker: Project 2 → **Deployed** ✅
9. LinkedIn post: build → push → deploy → link → announce

**Next (Project 3):** Weather App — your first taste of `fetch()` and a third-party API. That's where the web stops being self-contained.
