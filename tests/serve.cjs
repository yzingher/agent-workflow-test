// Minimal static file server for local testing: node tests/serve.cjs [port]
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "public");
const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

function start(port) {
  const server = http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
    } catch (e) {
      urlPath = "\0";
    }
    if (urlPath.includes("\0")) {
      res.writeHead(400).end();
      return;
    }
    const file = path.resolve(root, "." + (urlPath === "/" ? "/index.html" : urlPath));
    if (!file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end("not found");
        return;
      }
      res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

module.exports = { start };

if (require.main === module) {
  const port = Number(process.argv[2] || 4173);
  start(port).then(() => console.log(`serving public/ on http://127.0.0.1:${port}`));
}
