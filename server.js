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
const ready = store.init().then(() => console.log("Comptes : stockage", store.kind)).catch(e => console.error("Comptes : erreur d'init", e.message));
const VERSION = (() => { try { return require("./package.json").version; } catch (e) { return "0"; } })();
const accounts = makeAccounts({ version: VERSION, ready, store, getDuel: code => docs["duels/" + code] || null, hasDuel: code => !!docs["duels/" + code] });

// ---------- messages vocaux du chat versus (en mémoire, 2 h) ----------
const voices = new Map(); let voiceBytes = 0; const voiceRate = new Map();
const VOICE_MAX = 400 * 1024, VOICE_TOTAL = 60 * 1024 * 1024, VOICE_TTL = 2 * 3600e3;
const VOICE_TYPES = /^audio\/(webm|ogg|mp4|aac|mpeg)(;.*)?$/;
setInterval(() => { const now = Date.now(); for (const [id, v] of voices) if (now - v.t > VOICE_TTL) { voiceBytes -= v.buf.length; voices.delete(id); } }, 60000);
function voiceApi(req, res, url) {
  const send = (c, o) => { res.writeHead(c, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); };
  const g = /^\/api\/voice\/([a-z0-9]{16})$/.exec(url.pathname);
  if (req.method === "GET" && g) {
    const v = voices.get(g[1]); if (!v) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": v.type, "Content-Length": v.buf.length, "Cache-Control": "private, max-age=7200", "X-Content-Type-Options": "nosniff" }); return res.end(v.buf);
  }
  if (req.method !== "POST" || url.pathname !== "/api/voice") return send(404, { error: "notfound" });
  const code = url.searchParams.get("code") || "", type = String(req.headers["content-type"] || "");
  if (!/^[A-Z]{4}$/.test(code) || !docs["duels/" + code]) return send(404, { error: "room" });
  if (!VOICE_TYPES.test(type)) return send(400, { error: "type" });
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const now = Date.now(), r = voiceRate.get(ip) || { n: 0, t: now }; if (now - r.t > 60000) { r.n = 0; r.t = now; } r.n++; voiceRate.set(ip, r);
  if (r.n > 15) return send(429, { error: "slow" });
  const chunks = []; let size = 0, big = false;
  req.on("data", c => { size += c.length; if (size > VOICE_MAX) { big = true; req.destroy(); } else chunks.push(c); });
  req.on("end", () => {
    if (big || size < 200) return send(400, { error: "size" });
    const buf = Buffer.concat(chunks);
    while (voiceBytes + buf.length > VOICE_TOTAL && voices.size) { const [k, v] = voices.entries().next().value; voiceBytes -= v.buf.length; voices.delete(k); }
    const id = require("crypto").randomBytes(8).toString("hex");
    voices.set(id, { buf, type: type.split(";")[0], t: Date.now() }); voiceBytes += buf.length;
    send(200, { id });
  });
}

// ---------- HTTP : fichiers du jeu ----------
const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api/voice")) return voiceApi(req, res, new URL(req.url, "http://x"));
  if ((req.url || "").startsWith("/api/")) return accounts.handle(req, res);
  let p = decodeURIComponent((req.url || "/").split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  // les images et sons sont revalidés à chaque chargement (ETag) : une illustration mise à jour s'affiche tout de suite
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("Not found"); }
    const etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    const head = { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-cache", "ETag": etag };
    if (req.headers["if-none-match"] === etag) { res.writeHead(304, head); return res.end(); }
    fs.readFile(file, (e2, buf) => {
      if (e2) { res.writeHead(404); return res.end("Not found"); }
      res.writeHead(200, head); res.end(buf);
    });
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

server.listen(PORT, () => console.log(`Battle of the Century v${VERSION} sur http://localhost:${PORT}`));
