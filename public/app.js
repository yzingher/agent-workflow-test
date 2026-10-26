"use strict";

(function () {
  const KEY = "checklist.v1";
  const BACKUP_KEY = "checklist.v1.backup";
  const MAX_LEN = 200;

  const form = document.getElementById("add-form");
  const input = document.getElementById("new-item");
  const list = document.getElementById("list");
  const empty = document.getElementById("empty");
  const counter = document.getElementById("counter");
  const notice = document.getElementById("notice");

  let items = [];
  let loadNotice = "";
  let saveFailed = false;

  function newId() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function isValidItem(x, seen) {
    return x !== null && typeof x === "object" &&
      typeof x.id === "string" && x.id !== "" && !seen.has(x.id) &&
      typeof x.text === "string" && x.text.trim() !== "" &&
      typeof x.done === "boolean";
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(KEY);
    } catch (e) {
      loadNotice = "Storage is unavailable, so changes won't be saved in this browser.";
      return [];
    }
    if (raw === null) return [];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      parsed = undefined;
    }
    if (!Array.isArray(parsed)) {
      let backedUp = true;
      try { localStorage.setItem(BACKUP_KEY, raw); } catch (e) { backedUp = false; }
      loadNotice = backedUp
        ? "Saved data couldn't be read, so the list was reset. A backup was kept."
        : "Saved data couldn't be read, so the list was reset. It could not be backed up.";
      return [];
    }

    const seen = new Set();
    const valid = [];
    for (const x of parsed) {
      if (!isValidItem(x, seen)) continue;
      seen.add(x.id);
      valid.push({
        id: x.id,
        text: x.text.trim().slice(0, MAX_LEN),
        done: x.done,
        createdAt: typeof x.createdAt === "number" ? x.createdAt : 0,
      });
    }
    if (valid.length !== parsed.length) {
      loadNotice = "Some saved items couldn't be read and were skipped.";
    }
    return valid;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      saveFailed = false;
    } catch (e) {
      saveFailed = true;
    }
  }

  function renderNotice() {
    const msg = saveFailed ? "Changes aren't being saved in this browser." : loadNotice;
    notice.textContent = msg;
    notice.hidden = msg === "";
  }

  function render() {
    list.replaceChildren();
    for (const item of items) {
      const li = document.createElement("li");
      li.className = "item" + (item.done ? " done" : "");
      li.dataset.id = item.id;

      const label = document.createElement("label");
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = item.done;
      const text = document.createElement("span");
      text.className = "text";
      text.textContent = item.text;
      label.append(box, text);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete";
      del.setAttribute("aria-label", `Delete "${item.text}"`);
      del.textContent = "×";

      li.append(label, del);
      list.append(li);
    }

    const done = items.filter((i) => i.done).length;
    counter.textContent = items.length ? `${done} of ${items.length} done` : "";
    empty.hidden = items.length > 0;
    renderNotice();
  }

  function commit() {
    save();
    render();
  }

  function focusCheckbox(id) {
    const li = list.querySelector(`li[data-id="${CSS.escape(id)}"]`);
    if (li) li.querySelector("input").focus();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, MAX_LEN);
    if (!text) {
      input.value = "";
      input.focus();
      return;
    }
    items.push({ id: newId(), text, done: false, createdAt: Date.now() });
    input.value = "";
    commit();
    input.focus();
  });

  list.addEventListener("change", (e) => {
    if (!(e.target instanceof HTMLInputElement) || e.target.type !== "checkbox") return;
    const id = e.target.closest("li").dataset.id;
    const item = items.find((i) => i.id === id);
    if (!item) return;
    item.done = e.target.checked;
    commit();
    focusCheckbox(id);
  });

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("button.delete");
    if (!btn) return;
    const id = btn.closest("li").dataset.id;
    const index = items.findIndex((i) => i.id === id);
    if (index === -1) return;
    items.splice(index, 1);
    commit();
    const next = items[index] || items[index - 1];
    if (next) focusCheckbox(next.id);
    else input.focus();
  });

  items = load();
  render();
})();
