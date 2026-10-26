// End-to-end tests for the checklist.
//   node tests/e2e.cjs                 -> starts a local server and tests it
//   BASE_URL=https://... node tests/e2e.cjs  -> tests a deployed URL
//   SCREENSHOTS=dir node tests/e2e.cjs -> also saves mobile/desktop screenshots
const assert = require("assert/strict");
const path = require("path");
const { chromium, devices } = require("playwright");
const { start } = require("./serve.cjs");

const KEY = "checklist.v1";
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

async function items(page) {
  return page.$$eval("#list li", (lis) =>
    lis.map((li) => ({
      text: li.querySelector(".text").textContent,
      done: li.querySelector("input").checked,
    })),
  );
}

async function add(page, text) {
  await page.fill("#new-item", text);
  await page.press("#new-item", "Enter");
}

test("assets load", async (page, base) => {
  for (const p of ["/", "/styles.css", "/app.js"]) {
    const res = await page.request.get(base + p);
    assert.equal(res.status(), 200, p);
  }
});

test("add persists across reload", async (page) => {
  await add(page, "Buy milk");
  assert.deepEqual(await items(page), [{ text: "Buy milk", done: false }]);
  assert.equal(await page.textContent("#counter"), "0 of 1 done");
  assert.equal(await page.isVisible("#empty"), false);
  await page.reload();
  assert.deepEqual(await items(page), [{ text: "Buy milk", done: false }]);
  assert.equal(await page.textContent("#counter"), "0 of 1 done");
});

test("complete persists across reload", async (page) => {
  await add(page, "A");
  await add(page, "B");
  await page.click("#list li:nth-child(2) label");
  assert.equal(await page.textContent("#counter"), "1 of 2 done");
  await page.reload();
  assert.deepEqual(await items(page), [{ text: "A", done: false }, { text: "B", done: true }]);
  assert.equal(await page.textContent("#counter"), "1 of 2 done");
  const deco = await page.$eval("#list li:nth-child(2) .text", (el) => getComputedStyle(el).textDecorationLine);
  assert.equal(deco, "line-through");
  // un-complete also persists
  await page.click("#list li:nth-child(2) label");
  await page.reload();
  assert.deepEqual(await items(page), [{ text: "A", done: false }, { text: "B", done: false }]);
});

test("delete persists across reload, empty state returns", async (page) => {
  await add(page, "Only item");
  await page.click('button[aria-label="Delete \\"Only item\\""]');
  assert.deepEqual(await items(page), []);
  assert.equal(await page.isVisible("#empty"), true);
  await page.reload();
  assert.deepEqual(await items(page), []);
  assert.equal(await page.isVisible("#empty"), true);
  assert.equal(await page.textContent("#counter"), "");
});

test("whitespace-only input is ignored", async (page) => {
  await add(page, "   ");
  assert.deepEqual(await items(page), []);
});

test("duplicate text items are independent", async (page) => {
  await add(page, "Same");
  await add(page, "Same");
  await page.click("#list li:nth-child(1) label");
  assert.deepEqual(await items(page), [{ text: "Same", done: true }, { text: "Same", done: false }]);
  await page.click("#list li:nth-child(1) button.delete");
  await page.reload();
  assert.deepEqual(await items(page), [{ text: "Same", done: false }]);
});

test("markup is rendered as text (no XSS)", async (page) => {
  const evil = '<img src=x onerror="window.__xss=1">';
  await add(page, evil);
  for (const when of ["before reload", "after reload"]) {
    if (when === "after reload") await page.reload();
    assert.deepEqual(await items(page), [{ text: evil, done: false }], when);
    assert.equal(await page.$("#list img"), null, when);
    await page.waitForTimeout(100); // give a would-be onerror handler time to fire
    assert.equal(await page.evaluate(() => window.__xss), undefined, when);
  }
});

test("corrupt JSON: loads empty, shows notice, keeps backup", async (page) => {
  await page.evaluate((k) => localStorage.setItem(k, "{not json"), KEY);
  await page.reload();
  assert.deepEqual(await items(page), []);
  assert.equal(await page.isVisible("#notice"), true);
  assert.equal(await page.evaluate(() => localStorage.getItem("checklist.v1.backup")), "{not json");
  await add(page, "Fresh");
  await page.reload();
  assert.deepEqual(await items(page), [{ text: "Fresh", done: false }]);
});

test("wrong-shape records are skipped", async (page) => {
  const data = [
    { id: "a", text: "good", done: true, createdAt: 1 },
    { id: "a", text: "dup id", done: false },
    { id: "", text: "no id", done: false },
    { id: "c", text: "   ", done: false },
    { id: "d", text: "bad done", done: "yes" },
    null,
    "str",
  ];
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(data)]);
  await page.reload();
  assert.deepEqual(await items(page), [{ text: "good", done: true }]);
  assert.equal(await page.isVisible("#notice"), true);
});

test("setItem failure keeps app usable and shows notice", async (page) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await add(page, "Unsaved");
  assert.deepEqual(await items(page), [{ text: "Unsaved", done: false }]);
  assert.match(await page.textContent("#notice"), /aren't being saved/);
});

test("keyboard focus rules", async (page) => {
  await page.focus("#new-item");
  await page.keyboard.type("One");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "new-item");
  await add(page, "Two");
  await add(page, "Three");
  // toggle keeps focus on that checkbox
  await page.focus("#list li:nth-child(2) input");
  await page.keyboard.press("Space");
  assert.equal(await page.evaluate(() => document.activeElement.closest("li")?.querySelector(".text").textContent), "Two");
  // delete moves focus to next item
  await page.focus("#list li:nth-child(2) button.delete");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.closest("li")?.querySelector(".text").textContent), "Three");
  // deleting the last remaining item moves focus to input
  await page.click("#list li:nth-child(2) button.delete");
  await page.focus("#list li:nth-child(1) button.delete");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.id), "new-item");
});

test("320px with long unbroken text has no horizontal overflow", async (page) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await add(page, "x".repeat(200));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.equal(overflow, 0);
  const box = await page.$eval("#list li button.delete", (b) => b.getBoundingClientRect().right);
  assert.ok(box <= 320, `delete button off-screen at x=${box}`);
});

test("touch targets are at least 44px", async (page) => {
  await add(page, "Target");
  for (const sel of ["#new-item", "#add-form button", "#list li label", "#list li button.delete"]) {
    const { width, height } = await page.$eval(sel, (el) => el.getBoundingClientRect());
    assert.ok(width >= 44 && height >= 44, `${sel} is ${width}x${height}`);
  }
});

async function screenshots(browser, base, dir) {
  const seed = [
    { id: "1", text: "Pack charger", done: true, createdAt: 1 },
    { id: "2", text: "Print boarding pass", done: true, createdAt: 2 },
    { id: "3", text: "Water the plants before leaving on Friday morning", done: false, createdAt: 3 },
    { id: "4", text: "Book airport taxi", done: false, createdAt: 4 },
  ];
  const shots = [
    ["mobile", { ...devices["iPhone 13"], defaultBrowserType: undefined }],
    ["desktop", { viewport: { width: 1280, height: 800 } }],
    ["mobile-dark", { ...devices["iPhone 13"], defaultBrowserType: undefined, colorScheme: "dark" }],
  ];
  for (const [name, opts] of shots) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(base);
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(seed)]);
    await page.reload();
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    if (name === "mobile") {
      await page.evaluate((k) => localStorage.removeItem(k), KEY);
      await page.reload();
      await page.screenshot({ path: path.join(dir, "mobile-empty.png"), fullPage: true });
    }
    await ctx.close();
  }
}

(async () => {
  let server;
  let base = process.env.BASE_URL;
  if (!base) {
    server = await start(0);
    base = `http://127.0.0.1:${server.address().port}`;
  }
  base = base.replace(/\/$/, "");
  const browser = await chromium.launch();
  let failed = 0;
  for (const t of tests) {
    // mobile emulation (touch + small viewport) for every behavioural test
    const ctx = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    try {
      await page.goto(base + "/");
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await t.fn(page, base);
      assert.deepEqual(errors, [], "uncaught page errors");
      console.log(`PASS  ${t.name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${t.name}\n      ${e.message.split("\n").join("\n      ")}`);
    }
    await ctx.close();
  }
  if (process.env.SCREENSHOTS) await screenshots(browser, base + "/", process.env.SCREENSHOTS);
  await browser.close();
  if (server) server.close();
  console.log(`\n${tests.length - failed}/${tests.length} passed against ${base}`);
  process.exit(failed ? 1 : 0);
})();
