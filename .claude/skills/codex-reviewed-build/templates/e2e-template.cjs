// Playwright end-to-end skeleton. Copy to tests/e2e.cjs and replace the example tests.
//   node tests/e2e.cjs                         -> serves STATIC_DIR locally and tests it
//   BASE_URL=https://... node tests/e2e.cjs    -> tests a running or deployed app
//   SCREENSHOTS=docs/screenshots node tests/e2e.cjs -> also saves screenshots
// For apps with a dev server (Next, Vite, ...), start it yourself and pass BASE_URL.
const assert = require("assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium, devices } = require("playwright");

const STATIC_DIR = path.join(__dirname, "..", "public"); // adjust per project

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- tests: derive these from the plan's acceptance criteria ---------------

test("page and assets load", async (page, base) => {
  const res = await page.request.get(base + "/");
  assert.equal(res.status(), 200);
});

test("example: state survives reload", async (page) => {
  // await page.fill("#input", "hello"); await page.press("#input", "Enter");
  // await page.reload();
  // assert.equal(await page.textContent("#list li"), "hello");
});

// ---- screenshots: choose the views that matter for this project ------------

const SHOTS = [
  ["mobile", { ...devices["iPhone 13"], defaultBrowserType: undefined }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
  // ["mobile-dark", { ...devices["iPhone 13"], defaultBrowserType: undefined, colorScheme: "dark" }],
];

async function prepareScreenshot(page) {
  // Seed realistic data here (e.g. localStorage) so the screenshot shows a real state.
}

// ---- runner ----------------------------------------------------------------

function serveStatic(root) {
  const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png" };
  const server = http.createServer((req, res) => {
    let p;
    try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { p = "\0"; }
    const file = path.resolve(root, "." + (p === "/" ? "/index.html" : p));
    if (p.includes("\0") || !file.startsWith(root + path.sep)) return res.writeHead(400).end();
    fs.readFile(file, (err, data) => {
      if (err) return res.writeHead(404).end();
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" }).end(data);
    });
  });
  return new Promise((r) => server.listen(0, "127.0.0.1", () => r(server)));
}

(async () => {
  let server;
  let base = process.env.BASE_URL;
  if (!base) {
    server = await serveStatic(STATIC_DIR);
    base = `http://127.0.0.1:${server.address().port}`;
  }
  base = base.replace(/\/$/, "");
  const browser = await chromium.launch();
  let failed = 0;
  for (const t of tests) {
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
  if (process.env.SCREENSHOTS) {
    fs.mkdirSync(process.env.SCREENSHOTS, { recursive: true });
    for (const [name, opts] of SHOTS) {
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.goto(base + "/");
      await prepareScreenshot(page);
      await page.reload();
      await page.screenshot({ path: path.join(process.env.SCREENSHOTS, `${name}.png`), fullPage: true });
      await ctx.close();
    }
  }
  await browser.close();
  if (server) server.close();
  console.log(`\n${tests.length - failed}/${tests.length} passed against ${base}`);
  process.exit(failed ? 1 : 0);
})();
