// Doomstar - serveur du jeu : fichiers statiques + relais WebSocket des parties en ligne.
const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");
const { jsonStore, pgStore, makeAccounts } = require("./accounts");

const PORT = +(process.env.PORT || 8080);
const PUBLIC = path.join(__dirname, "public");
const DATA = process.env.DATA_FILE || path.join(__dirname, "data", "duels.json");
const MAX_AGE = 24 * 3600 * 1000;            // une partie est oubliée après 24 h
const PATH_OK = /^duels\/[A-Z]{4}$/;           // seuls les documents de partie sont acceptés

const TYPES = { ".html":"text/html; charset=utf-8", ".js":"text/javascript", ".css":"text/css",
  ".webp":"image/webp", ".png":"image/png", ".jpg":"image/jpeg", ".woff2":"font/woff2", ".json":"application/json", ".ico":"image/x-icon", ".svg":"image/svg+xml", ".mp3":"audio/mpeg", ".css":"text/css; charset=utf-8" };

// ---------- documents de partie (en mémoire + sauvegarde disque) ----------
let docs = {};
try { docs = JSON.parse(fs.readFileSync(DATA, "utf8")); } catch (e) { docs = {}; }
let dirty = false;
setInterval(() => {
  const now = Date.now();
  for (const k of Object.keys(docs)) if (now - (docs[k]._t || 0) > MAX_AGE) { delete docs[k]; dirty = true; }
  if (!dirty) return;
  dirty = false;
  fs.mkdir(path.dirname(DATA), { recursive: true }, () => fs.writeFile(DATA, JSON.stringify(docs), () => {}));
}, 5000);

// ---------- comptes / scores ----------
const store = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : jsonStore(process.env.ACCOUNTS_FILE || path.join(__dirname, "data", "accounts.json"));
store.init().then(() => console.log("Comptes : stockage", store.kind)).catch(e => console.error("Comptes : erreur d'init", e.message));
const accounts = makeAccounts({ store, getDuel: code => docs["duels/" + code] || null });

// ---------- HTTP : fichiers du jeu ----------
const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api/")) return accounts.handle(req, res);
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
      "Cache-Control": p.endsWith(".html") ? "no-cache" : "public, max-age=86400" });
    res.end(buf);
  });
});

// ---------- WebSocket : relais des parties ----------
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 512 * 1024 });
const subs = new Map(); // path -> Set(ws)
function snap(p) { const d = docs[p]; if (!d) return { exists: false }; const { _t, ...data } = d; return { exists: true, data }; }
function broadcast(p) { const msg = JSON.stringify({ op: "snap", path: p, ...snap(p) }); for (const ws of subs.get(p) || []) if (ws.readyState === 1) ws.send(msg); }

wss.on("connection", ws => {
  ws.mine = new Set(); ws.count = 0; ws.since = Date.now();
  ws.on("message", raw => {
    // limite simple : 40 messages par seconde
    const now = Date.now(); if (now - ws.since > 1000) { ws.since = now; ws.count = 0; }
    if (++ws.count > 40) return;
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    const reply = o => ws.readyState === 1 && ws.send(JSON.stringify({ id: m.id, ...o }));
    if (typeof m.path !== "string" || !PATH_OK.test(m.path)) return reply({ op: "err", code: "invalid_argument" });
    const p = m.path;
    if (m.op === "sub") {
      if (!subs.has(p)) subs.set(p, new Set());
      subs.get(p).add(ws); ws.mine.add(p);
      return ws.send(JSON.stringify({ op: "snap", path: p, ...snap(p) }));
    }
    if (m.op === "unsub") { subs.get(p)?.delete(ws); ws.mine.delete(p); return; }
    if (m.op === "get") return reply({ op: "ok", ...snap(p) });
    if ((m.op === "set" || m.op === "update") && m.data && typeof m.data === "object") {
      if (m.op === "update" && !docs[p]) return reply({ op: "err", code: "invalid_argument" });
      docs[p] = m.op === "set" ? { ...m.data, _t: Date.now() } : { ...docs[p], ...m.data, _t: Date.now() };
      dirty = true;
      reply({ op: "ok" });
      return broadcast(p);
    }
    reply({ op: "err", code: "invalid_argument" });
  });
  ws.on("close", () => { for (const p of ws.mine) subs.get(p)?.delete(ws); });
});

server.listen(PORT, () => console.log(`Doomstar sur http://localhost:${PORT}`));
