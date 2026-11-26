// Local test server that mimics the Vercel setup: cleanUrls, vercel.json redirects and the
// api/gcc-rates function. For testing only — production runs on Vercel.
//   node scripts/serve.mjs [port]      (GCC_RATES_FAIL=1 makes /api/gcc-rates fail)
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const port = Number(process.argv[2] || 5300);
const { redirects } = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".xml": "application/xml", ".txt": "text/plain", ".json": "application/json" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let path = url.pathname;
  const hit = redirects.find((r) => r.source === path);
  if (hit) { res.writeHead(308, { Location: hit.destination + url.search }); return res.end(); }
  if (path === "/api/gcc-rates") {
    if (process.env.GCC_RATES_FAIL) { res.writeHead(502, { "content-type": "application/json" }); return res.end('{"error":"down"}'); }
    return require(join(root, "api/gcc-rates.js"))(req, res);
  }
  if (path.endsWith(".html")) { res.writeHead(308, { Location: path.replace(/(index)?\.html$/, "") || "/" }); return res.end(); }
  if (path === "/") path = "/index.html";
  else if (!extname(path)) path += ".html";
  const file = normalize(join(root, path));
  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`http://localhost:${port}`));
