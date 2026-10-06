// Comptes joueurs, scores et Hall of Fame.
// Stockage : Postgres si DATABASE_URL est défini (Neon), sinon un fichier JSON local (dev / secours).
const crypto = require("crypto");
// ordre des chapitres du mode histoire (king-9 = interlude Barcom, joué avant le combat contre Shin)
const STORY_TEST = /^arc2-/;   // arcs en test (lecture seule pour les joueurs) : vider la regex (/^$/) pour ouvrir
const STORY_ORDER = ["king-0", "king-1", "king-2", "king-3", "king-4", "king-5", "king-6", "king-7", "king-9", "king-8", "arc2-1", "arc2-2", "arc2-3", "arc2-4", "arc2-5", "arc2-6", "arc2-7"];
const fs = require("fs");
const path = require("path");

const NAME_RE = /^[\p{L}\p{N}_\- .]{3,16}$/u;
const AVATAR_MAX = 80 * 1024;
const AVATAR_TYPES = { "image/webp": 1, "image/jpeg": 1, "image/png": 1 };
const SESSION_DAYS = 90;
const DEFAULT_STATS = () => ({ elo: 1000, pts: 0, aiW: 0, aiL: 0, vsW: 0, vsL: 0, streak: 0, best: 0, tW: 0, fav: {} });

const sha = s => crypto.createHash("sha256").update(s).digest("hex");
const scrypt = (pw, salt) => new Promise((ok, ko) => crypto.scrypt(pw, salt, 64, (e, k) => e ? ko(e) : ok(k.toString("hex"))));

// ---------------- stockage ----------------
function jsonStore(file) {
  let db = { users: [], sessions: {}, next: 1, tourneys: {} };
  try { db = JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) {}
  db.tourneys = db.tourneys || {};
  let t = null;
  const save = () => { clearTimeout(t); t = setTimeout(() => fs.mkdir(path.dirname(file), { recursive: true }, () =>
    fs.writeFile(file, JSON.stringify(db), () => {})), 300); };
  const pub = u => u && ({ ...u, avatar: undefined });
  return {
    kind: "json",
    async init() {},
    async createUser(name, pass, salt) {
      const lc = name.toLowerCase();
      if (db.users.some(u => u.name_lc === lc)) return null;
      const u = { id: db.next++, name, name_lc: lc, pass, salt, created: Date.now(), avatar: null, avatar_type: null, avatar_v: 0, stats: DEFAULT_STATS() };
      db.users.push(u); save(); return pub(u);
    },
    async byName(name) { const u = db.users.find(u => u.name_lc === name.toLowerCase()); return u ? { ...u, banned: !!u.banned } : null; },
    async byId(id) { const u = pub(db.users.find(u => u.id === id)); if (u) u.banned = !!u.banned; return u; },
    async addSession(hash, uid) { db.sessions[hash] = { uid, t: Date.now() }; save(); },
    async session(hash) { const s = db.sessions[hash]; if (!s || Date.now() - s.t > SESSION_DAYS * 864e5) return null; return this.byId(s.uid); },
    async dropSession(hash) { delete db.sessions[hash]; save(); },
    async setAvatar(uid, b64, type) { const u = db.users.find(u => u.id === uid); if (!u) return; u.avatar = b64; u.avatar_type = type; u.avatar_v = (u.avatar_v || 0) + 1; save(); return u.avatar_v; },
    async avatar(uid) { const u = db.users.find(u => u.id === uid); return u && u.avatar ? { buf: Buffer.from(u.avatar, "base64"), type: u.avatar_type, v: u.avatar_v } : null; },
    async saveStats(uid, stats) { const u = db.users.find(u => u.id === uid); if (u) { u.stats = stats; save(); } },
    async top(kind, n) {
      const list = db.users.filter(u => !u.banned).filter(u => kind === "elo" ? u.stats.vsW + u.stats.vsL > 0 : kind === "surv" ? (u.stats.surv || 0) > 0 : u.stats.pts > 0)
        .sort((a, b) => kind === "elo" ? b.stats.elo - a.stats.elo : kind === "surv" ? (b.stats.surv || 0) - (a.stats.surv || 0) : b.stats.pts - a.stats.pts).slice(0, n);
      return list.map(pub);
    },
    async getSetting(k) { return (db.settings || {})[k] ?? null; },
    async touch(uid, ip) { const u = db.users.find(u => u.id === uid); if (u) { u.last_ip = ip; u.last_seen = Date.now(); if (!u.first_ip) u.first_ip = ip; save(); } },
    async listUsers() { return db.users.map(u => ({ id: u.id, name: u.name, created: u.created, last_seen: u.last_seen || null, last_ip: u.last_ip || null, first_ip: u.first_ip || null, banned: !!u.banned, avatar_v: u.avatar_v || 0, stats: u.stats })); },
    async setPassword(uid, pass, salt) { const u = db.users.find(u => u.id === uid); if (!u) return; u.pass = pass; u.salt = salt; for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === uid) delete db.sessions[k]; save(); },
    async setBanned(uid, b) { const u = db.users.find(u => u.id === uid); if (!u) return; u.banned = !!b; if (b) for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === uid) delete db.sessions[k]; save(); },
    async deleteUser(uid) { db.users = db.users.filter(u => u.id !== uid); for (const k of Object.keys(db.sessions)) if (db.sessions[k].uid === uid) delete db.sessions[k]; save(); },
    async setSetting(k, v) { db.settings = db.settings || {}; db.settings[k] = v; save(); },
    async getTourney(code) { const t = db.tourneys[code]; return t ? JSON.parse(JSON.stringify(t)) : null; },
    async saveTourney(t) { db.tourneys[t.code] = JSON.parse(JSON.stringify({ ...t, updated: Date.now() })); save(); },
    async openTourneys() { const now = Date.now(); return Object.values(db.tourneys).filter(t => t.status !== "done" && now - (t.updated || 0) < 6 * 3600e3).sort((a, b) => b.created - a.created).slice(0, 30); },
    async rank(uid, kind) {
      const me = db.users.find(u => u.id === uid); if (!me) return null;
      const k = kind === "elo" ? "elo" : "pts";
      if (kind === "elo" && me.stats.vsW + me.stats.vsL === 0) return null;
      if (kind !== "elo" && me.stats.pts === 0) return null;
      return 1 + db.users.filter(u => (kind === "elo" ? u.stats.vsW + u.stats.vsL > 0 : true) && u.stats[k] > me.stats[k]).length;
    }
  };
}

function pgStore(url, PgPool) {
  const { Pool } = PgPool || require("pg");
  const pool = new Pool({ connectionString: url, ssl: /sslmode=disable|localhost/.test(url) ? false : { rejectUnauthorized: false }, max: 4 });
  const q = (sql, args) => pool.query(sql, args);
  const row = r => r && ({ id: r.id, name: r.name, name_lc: r.name_lc, pass: r.pass, salt: r.salt, created: +r.created, avatar_v: r.avatar_v, banned: !!r.banned, stats: { ...DEFAULT_STATS(), ...(r.stats || {}) } });
  const COLS = "id,name,name_lc,pass,salt,created,avatar_v,banned,stats";
  return {
    kind: "postgres",
    async init() {
      await q(`CREATE TABLE IF NOT EXISTS boc_users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, name_lc TEXT NOT NULL UNIQUE, pass TEXT NOT NULL, salt TEXT NOT NULL,
        created BIGINT NOT NULL, avatar TEXT, avatar_type TEXT, avatar_v INT NOT NULL DEFAULT 0, stats JSONB NOT NULL)`);
      await q(`CREATE TABLE IF NOT EXISTS boc_sessions (hash TEXT PRIMARY KEY, uid INT NOT NULL, t BIGINT NOT NULL)`);
      for (const c of ["banned BOOLEAN NOT NULL DEFAULT false", "last_ip TEXT", "first_ip TEXT", "last_seen BIGINT"]) await q(`ALTER TABLE boc_users ADD COLUMN IF NOT EXISTS ${c}`);
      await q(`CREATE TABLE IF NOT EXISTS boc_settings (k TEXT PRIMARY KEY, v JSONB NOT NULL)`);
      await q(`CREATE TABLE IF NOT EXISTS boc_tourneys (code TEXT PRIMARY KEY, status TEXT NOT NULL, created BIGINT NOT NULL, updated BIGINT NOT NULL, data JSONB NOT NULL)`);
    },
    async createUser(name, pass, salt) {
      try {
        const r = await q(`INSERT INTO boc_users (name,name_lc,pass,salt,created,stats) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`,
          [name, name.toLowerCase(), pass, salt, Date.now(), JSON.stringify(DEFAULT_STATS())]);
        return row(r.rows[0]);
      } catch (e) { if (e.code === "23505") return null; throw e; }
    },
    async byName(name) { const r = await q(`SELECT ${COLS} FROM boc_users WHERE name_lc=$1`, [name.toLowerCase()]); return row(r.rows[0]); },
    async byId(id) { const r = await q(`SELECT ${COLS} FROM boc_users WHERE id=$1`, [id]); return row(r.rows[0]); },
    async addSession(hash, uid) { await q(`INSERT INTO boc_sessions (hash,uid,t) VALUES ($1,$2,$3)`, [hash, uid, Date.now()]); },
    async session(hash) {
      const r = await q(`SELECT uid,t FROM boc_sessions WHERE hash=$1`, [hash]); const s = r.rows[0];
      if (!s || Date.now() - +s.t > SESSION_DAYS * 864e5) return null; return this.byId(s.uid);
    },
    async dropSession(hash) { await q(`DELETE FROM boc_sessions WHERE hash=$1`, [hash]); },
    async setAvatar(uid, b64, type) { const r = await q(`UPDATE boc_users SET avatar=$2, avatar_type=$3, avatar_v=avatar_v+1 WHERE id=$1 RETURNING avatar_v`, [uid, b64, type]); return r.rows[0] && r.rows[0].avatar_v; },
    async avatar(uid) { const r = await q(`SELECT avatar,avatar_type,avatar_v FROM boc_users WHERE id=$1`, [uid]); const a = r.rows[0]; return a && a.avatar ? { buf: Buffer.from(a.avatar, "base64"), type: a.avatar_type, v: a.avatar_v } : null; },
    async saveStats(uid, stats) { await q(`UPDATE boc_users SET stats=$2 WHERE id=$1`, [uid, JSON.stringify(stats)]); },
    async top(kind, n) {
      const where = kind === "elo" ? `((stats->>'vsW')::int + (stats->>'vsL')::int) > 0` : kind === "surv" ? `COALESCE((stats->>'surv')::int,0) > 0` : `(stats->>'pts')::int > 0`;
      const ord = kind === "elo" ? `(stats->>'elo')::int` : kind === "surv" ? `COALESCE((stats->>'surv')::int,0)` : `(stats->>'pts')::int`;
      const r = await q(`SELECT ${COLS} FROM boc_users WHERE NOT banned AND ${where} ORDER BY ${ord} DESC, id ASC LIMIT $1`, [n]); return r.rows.map(row);
    },
    async getSetting(k) { const r = await q(`SELECT v FROM boc_settings WHERE k=$1`, [k]); return r.rows[0] ? r.rows[0].v : null; },
    async touch(uid, ip) { await q(`UPDATE boc_users SET last_ip=$2, last_seen=$3, first_ip=COALESCE(first_ip,$2) WHERE id=$1`, [uid, ip, Date.now()]); },
    async listUsers() { const r = await q(`SELECT id,name,created,last_seen,last_ip,first_ip,banned,avatar_v,stats FROM boc_users ORDER BY id DESC`); return r.rows.map(x => ({ id: x.id, name: x.name, created: +x.created, last_seen: x.last_seen ? +x.last_seen : null, last_ip: x.last_ip, first_ip: x.first_ip, banned: !!x.banned, avatar_v: x.avatar_v, stats: { ...DEFAULT_STATS(), ...(x.stats || {}) } })); },
    async setPassword(uid, pass, salt) { await q(`UPDATE boc_users SET pass=$2, salt=$3 WHERE id=$1`, [uid, pass, salt]); await q(`DELETE FROM boc_sessions WHERE uid=$1`, [uid]); },
    async setBanned(uid, b) { await q(`UPDATE boc_users SET banned=$2 WHERE id=$1`, [uid, !!b]); if (b) await q(`DELETE FROM boc_sessions WHERE uid=$1`, [uid]); },
    async deleteUser(uid) { await q(`DELETE FROM boc_sessions WHERE uid=$1`, [uid]); await q(`DELETE FROM boc_users WHERE id=$1`, [uid]); },
    async setSetting(k, v) { await q(`INSERT INTO boc_settings (k,v) VALUES ($1,$2) ON CONFLICT (k) DO UPDATE SET v=$2`, [k, JSON.stringify(v)]); },
    async getTourney(code) { const r = await q(`SELECT data FROM boc_tourneys WHERE code=$1`, [code]); return r.rows[0] ? r.rows[0].data : null; },
    async saveTourney(t) { await q(`INSERT INTO boc_tourneys (code,status,created,updated,data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO UPDATE SET status=$2, updated=$4, data=$5`, [t.code, t.status, t.created, Date.now(), JSON.stringify(t)]); },
    async openTourneys() { const r = await q(`SELECT data FROM boc_tourneys WHERE status<>'done' AND updated>$1 ORDER BY created DESC LIMIT 30`, [Date.now() - 6 * 3600e3]); return r.rows.map(x => x.data); },
    async rank(uid, kind) {
      const me = await this.byId(uid); if (!me) return null;
      if (kind === "elo") {
        if (me.stats.vsW + me.stats.vsL === 0) return null;
        const r = await q(`SELECT COUNT(*)::int AS n FROM boc_users WHERE ((stats->>'vsW')::int + (stats->>'vsL')::int) > 0 AND (stats->>'elo')::int > $1`, [me.stats.elo]); return r.rows[0].n + 1;
      }
      if (me.stats.pts === 0) return null;
      const r = await q(`SELECT COUNT(*)::int AS n FROM boc_users WHERE (stats->>'pts')::int > $1`, [me.stats.pts]); return r.rows[0].n + 1;
    }
  };
}

// ---------------- logique ----------------
function makeAccounts({ store, getDuel, hasDuel, version, ready }) {
  // administrateurs : pseudos listés dans la variable ADMINS (séparés par des virgules)
  const ADMINS = new Set(String(process.env.ADMINS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
  const isAdmin = u => !!u && ADMINS.has(String(u.name).toLowerCase());
  // maintenance : MAINTENANCE=1 la force, sinon réglage stocké en base (modifiable par un admin depuis le jeu)
  let maint = { on: false, msg: "" };
  const maintOn = () => process.env.MAINTENANCE === "1" || maint.on;
  // IP bannies : réglage stocké en base, gardé en mémoire
  let ipBans = [];
  Promise.resolve(ready).then(() => store.getSetting("ipbans")).then(v => { if (Array.isArray(v)) ipBans = v; }).catch(() => {});
  const ipBanned = ip => !!ip && ipBans.some(b => b.ip === ip);
  Promise.resolve(ready).then(() => store.getSetting("maintenance")).then(v => { if (v) maint = { on: !!v.on, msg: String(v.msg || "") }; }).catch(() => {});
  const settleHooks = [];
  const matches = new Map();      // code -> { host: uid, guest: uid, done }
  const lastSolo = new Map();     // uid -> timestamp
  const presence = new Map();     // uid -> {user public, where, t}
  const ONLINE_MS = 75e3;
  function onlineList() { const now = Date.now(), out = [];
    for (const [id, p] of presence) { if (now - p.t > ONLINE_MS) presence.delete(id); else out.push(p); }
    return out.sort((x, y) => (y.stats && y.stats.pts || 0) - (x.stats && x.stats.pts || 0)); }
  const lastSurv = new Map();     // uid -> timestamp (survie)
  const lastArc = new Map();
  const lastStory = new Map();      // uid -> timestamp (arcade)
  const tries = new Map();        // ip -> { n, t }

  const limited = ip => { const now = Date.now(); const e = tries.get(ip) || { n: 0, t: now }; if (now - e.t > 60000) { e.n = 0; e.t = now; } e.n++; tries.set(ip, e); return e.n > 12; };
  const pubUser = u => ({ id: u.id, name: u.name, avatar: u.avatar_v ? `/api/avatar/${u.id}?v=${u.avatar_v}` : null, stats: (({ decks, survRun, arcRun, arcBonusRun, ...r }) => r)(u.stats || {}), created: u.created, ...(isAdmin(u) ? { admin: true } : {}) });
  async function newSession(u) { const tok = crypto.randomBytes(32).toString("hex"); await store.addSession(sha(tok), u.id); return tok; }
  const seen = new Map();
  async function auth(req) { const h = req.headers.authorization || ""; const tok = h.startsWith("Bearer ") ? h.slice(7) : ""; if (!/^[0-9a-f]{64}$/.test(tok)) return null;
    const u = await store.session(sha(tok)); if (!u || u.banned) return null;
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    if (Date.now() - (seen.get(u.id) || 0) > 10 * 60e3) { seen.set(u.id, Date.now()); store.touch(u.id, ip).catch(() => {}); }
    return u; }
  // statistiques d'équilibrage par combattant (vraies parties) : vg/vw = versus, ag/aw = contre l'IA
  let faces = {};
  Promise.resolve(ready).then(() => store.getSetting("faces")).then(v => { if (v && typeof v === "object") faces = v; }).catch(() => {});
  // cadrages des illustrations (combat) et vignettes refaites par l'admin
  let frames = { p: {}, b: {} };
  Promise.resolve(ready).then(() => store.getSetting("frames")).then(v => { if (v && v.p && v.b) frames = v; }).catch(() => {});
  let fstats = { since: Date.now(), f: {}, n: { v: 0, a: 0 } }, fDirty = false;
  Promise.resolve(ready).then(() => store.getSetting("fstats")).then(v => { if (v && v.f) fstats = v; }).catch(() => {});
  setInterval(() => { if (fDirty) { fDirty = false; store.setSetting("fstats", fstats).catch(() => { fDirty = true; }); } }, 30000);
  function fRecord(team, won, kind) {
    const ids = Array.isArray(team) ? [...new Set(team.filter(id => typeof id === "string" && /^[a-z0-9]{2,12}$/.test(id)))].slice(0, 5) : [];
    ids.forEach((id, i) => { const f = fstats.f[id] = fstats.f[id] || { vg: 0, vw: 0, ag: 0, aw: 0, lg: 0, lw: 0 };
      f[kind + "g"]++; if (won) f[kind + "w"]++;
      if (i === 0 && kind === "v") { f.lg++; if (won) f.lw++; } });
    if (ids.length) fDirty = true;
  }
  // succès : t = palier (1 bronze, 2 argent, 3 or), c = condition sur les stats, f = exploit signalé en fin de partie
  const ACH_PTS = { 1: 10, 2: 25, 3: 50 };
  const DAILY_PTS = 40;
  const dayKey = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
  // défi de la semaine : clé = lundi de la semaine (heure de Bruxelles)
  const weekKey = (off = 0) => { const d = new Date(dayKey() + "T12:00:00Z"); const wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd + off * 7); return d.toISOString().slice(0, 10); };
  const wkCache = new Map();
  async function wkGet(k) { if (wkCache.has(k)) return wkCache.get(k); const v = (await store.getSetting("weekly:" + k)) || { foe: null, entries: {}, awarded: false }; wkCache.set(k, v); return v; }
  async function wkSave(k, v) { wkCache.set(k, v); await store.setSetting("weekly:" + k, v); }
  const wkCmp = (a, b) => (a.cost - b.cost) || (a.rounds - b.rounds) || (a.lost - b.lost) || (a.t - b.t);
  const wkRank = w => Object.entries(w.entries || {}).map(([id, e]) => ({ id: +id, ...e })).sort(wkCmp);
  const WK_PRIZE = [100, 60, 40];
  async function wkAward() {
    const pk = weekKey(-1), w = await wkGet(pk); if (w.awarded) return;
    w.awarded = true; await wkSave(pk, w);
    const top = wkRank(w).slice(0, 3);
    for (let i = 0; i < top.length; i++) { const u = await store.byId(top[i].id); if (!u) continue;
      u.stats.pts += WK_PRIZE[i]; u.stats.wkPod = (u.stats.wkPod || 0) + 1; if (i === 0) u.stats.wkWin = (u.stats.wkWin || 0) + 1;
      achCheck(u.stats); await store.saveStats(u.id, u.stats); }
  }
  const lastWk = new Map();
  const ACH = {
    first: { t: 1, c: s => s.aiW >= 1 }, ai10: { t: 1, c: s => s.aiW >= 10 }, ai50: { t: 2, c: s => s.aiW >= 50 }, ai200: { t: 3, c: s => s.aiW >= 200 },
    vs1: { t: 1, c: s => s.vsW >= 1 }, vs10: { t: 2, c: s => s.vsW >= 10 }, vs50: { t: 3, c: s => s.vsW >= 50 },
    elo1200: { t: 2, c: s => s.elo >= 1200 }, elo1400: { t: 3, c: s => s.elo >= 1400 },
    streak5: { t: 2, c: s => s.best >= 5 }, streak10: { t: 3, c: s => s.best >= 10 },
    surv5: { t: 1, c: s => (s.surv || 0) >= 5 }, surv10: { t: 2, c: s => (s.surv || 0) >= 10 }, surv20: { t: 3, c: s => (s.surv || 0) >= 20 },
    tour1: { t: 2, c: s => (s.tW || 0) >= 1 }, tour5: { t: 3, c: s => (s.tW || 0) >= 5 },
    roster15: { t: 1, c: s => Object.keys(s.fav || {}).length >= 15 }, roster30: { t: 2, c: s => Object.keys(s.fav || {}).length >= 30 },
    flawless: { t: 2, f: 1 }, comeback: { t: 2, f: 1 }, ultko: { t: 1, f: 1 }, combo4: { t: 1, f: 1 }, combo5: { t: 2, f: 1 },
    arc1: { t: 2, c: s => (s.arcClears || 0) >= 1 }, arc5: { t: 3, c: s => (s.arcClears || 0) >= 5 }, arcsecret: { t: 2, c: s => (s.arcSecret || 0) >= 1 },
    story1: { t: 2, c: s => s.story && s.story["king-8"] != null }, story27: { t: 3, c: s => s.story && Object.keys(s.story).filter(k => /^king-/.test(k)).reduce((a, k) => a + s.story[k], 0) >= 27 },
    storylegend: { t: 3, c: s => s.storyH && STORY_ORDER.filter(k => /^king-/.test(k)).every(k => s.storyH[k]) },
    weekpod: { t: 2, c: s => (s.wkPod || 0) >= 1 }, weekwin: { t: 3, c: s => (s.wkWin || 0) >= 1 },
    daily1: { t: 1, c: s => (s.dailyN || 0) >= 1 }, daily10: { t: 2, c: s => (s.dailyN || 0) >= 10 }, daily30: { t: 3, c: s => (s.dailyN || 0) >= 30 },
    duo: { t: 1, f: 1 }, quintet: { t: 1, f: 1 }, clanwin: { t: 1, f: 1 }, cheap: { t: 2, f: 1 }
  };
  // débloque ce qui est atteint ; renvoie les nouveaux succès (les points sont ajoutés aux stats)
  function achCheck(st, feats) {
    st.ach = st.ach || {}; const out = [], now = Date.now();
    const fs = new Set(Array.isArray(feats) ? feats.filter(x => typeof x === "string").slice(0, 12) : []);
    for (const [id, a] of Object.entries(ACH)) {
      if (st.ach[id]) continue;
      const ok = a.c ? a.c(st) : fs.has(id);
      if (ok) { st.ach[id] = now; st.pts += ACH_PTS[a.t]; out.push(id); }
    }
    return out;
  }
  function bumpFav(st, team) { (Array.isArray(team) ? team : []).slice(0, 5).forEach(id => { if (typeof id === "string" && /^[a-z0-9]{2,12}$/.test(id)) st.fav[id] = (st.fav[id] || 0) + 1; }); }
  function streak(st, won) { if (won) { st.streak = (st.streak || 0) + 1; st.best = Math.max(st.best || 0, st.streak); } else st.streak = 0; }
  const expect = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));

  async function settle(code, loserRole) {
    const m = matches.get(code); if (!m || m.done) return;
    m.done = true;
    const winRole = loserRole === "host" ? "guest" : "host";
    const W = m[winRole] ? await store.byId(m[winRole]) : null, Lo = m[loserRole] ? await store.byId(m[loserRole]) : null;
    if (W && Lo && W.id !== Lo.id) {
      const e = expect(W.stats.elo, Lo.stats.elo), k = 32, d = Math.max(1, Math.round(k * (1 - e)));
      W.stats.elo += d; Lo.stats.elo = Math.max(100, Lo.stats.elo - d);
    }
    const nc = !!(getDuel(code) || {}).newch;   // défi lancé pendant un combat contre l'IA : +50 % de points
    if (W) { W.stats.vsW++; W.stats.pts += nc ? 38 : 25; streak(W.stats, true); bumpFav(W.stats, m.teams && m.teams[winRole]); achCheck(W.stats); await store.saveStats(W.id, W.stats); }
    if (Lo) { Lo.stats.vsL++; Lo.stats.pts += nc ? 8 : 5; streak(Lo.stats, false); bumpFav(Lo.stats, m.teams && m.teams[loserRole]); achCheck(Lo.stats); await store.saveStats(Lo.id, Lo.stats); }
    { const d = getDuel(code) || {}; const tW = (m.teams && m.teams[winRole]) || d[winRole + "Team"], tL = (m.teams && m.teams[loserRole]) || d[loserRole + "Team"]; fRecord(tW, true, "v"); fRecord(tL, false, "v"); fstats.n = fstats.n || { v: 0, a: 0 }; fstats.n.v++; }
    for (const h of settleHooks) { try { await h(code, loserRole); } catch (e) { console.error("settle hook", e.message); } }
    setTimeout(() => matches.delete(code), 3600e3);
  }
  // perdant lu dans l'état de la partie stocké par le serveur de relais
  function loserFromDuel(code) {
    const d = getDuel(code); if (!d || !d.state) return null;
    let st; try { st = JSON.parse(d.state); } catch (e) { return null; }
    if (!st || !st.over) return null;
    const dead = side => side && side.team && side.team.every(t => t.ko);
    if (dead(st.p)) return "host"; if (dead(st.a)) return "guest"; return null;
  }

  const routes = {
    "POST /api/register": async (req, body, ip) => {
      if (limited(ip)) return [429, { error: "slow" }];
      const name = String(body.name || "").trim().replace(/\s+/g, " "), pw = String(body.password || "");
      if (!NAME_RE.test(name)) return [400, { error: "name" }];
      if (pw.length < 6 || pw.length > 100) return [400, { error: "password" }];
      const salt = crypto.randomBytes(16).toString("hex");
      const u = await store.createUser(name, await scrypt(pw, salt), salt);
      if (!u) return [409, { error: "taken" }];
      await store.touch(u.id, ip);
      return [200, { token: await newSession(u), user: pubUser(u) }];
    },
    "POST /api/login": async (req, body, ip) => {
      if (limited(ip)) return [429, { error: "slow" }];
      const u = await store.byName(String(body.name || "").trim().replace(/\s+/g, " "));
      const pw = String(body.password || "");
      if (!u) { await scrypt(pw, "x".repeat(32)); return [401, { error: "bad" }]; }
      const h = await scrypt(pw, u.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(u.pass, "hex"))) return [401, { error: "bad" }];
      if (u.banned) return [403, { error: "banned" }];
      await store.touch(u.id, ip);
      return [200, { token: await newSession(u), user: pubUser(u) }];
    },
    "POST /api/logout": async req => { const lu = await auth(req).catch(() => null); if (lu) presence.delete(lu.id); const h = (req.headers.authorization || "").slice(7); if (h) await store.dropSession(sha(h)); return [200, { ok: true }]; },
    "GET /api/me": async req => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      if (achCheck(u.stats).length) await store.saveStats(u.id, u.stats);
      return [200, { user: pubUser(u), rank: { elo: await store.rank(u.id, "elo"), pts: await store.rank(u.id, "pts") } }];
    },
    // équipes sauvegardées (privées : jamais renvoyées dans les profils publics)
    // défi du jour : le défi est construit côté jeu à partir de la date (heure belge) ; le serveur garde qui l'a réussi
    "GET /api/weekly": async req => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      await wkAward().catch(e => console.error("weekly award", e.message));
      const k = weekKey(), w = await wkGet(k), r = wkRank(w), mi = r.findIndex(e => e.id === u.id);
      const prev = wkRank(await wkGet(weekKey(-1))).slice(0, 3).map(e => ({ name: e.name, cost: e.cost, rounds: e.rounds, lost: e.lost, team: e.team }));
      return [200, { week: k, ends: weekKey(1), foe: w.foe, n: r.length, top: r.slice(0, 10).map(e => ({ id: e.id, name: e.name, cost: e.cost, rounds: e.rounds, lost: e.lost, team: e.team })), me: mi >= 0 ? { rank: mi + 1, ...r[mi] } : null, prev, prize: WK_PRIZE }];
    },
    "POST /api/weekly/init": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const k = weekKey(), w = await wkGet(k);
      if (body.week !== k) return [409, { error: "week" }];
      if (!w.foe) { const foe = Array.isArray(body.foe) ? body.foe.filter(x => typeof x === "string" && /^[a-z0-9]{2,12}$/.test(x)).slice(0, 5) : []; if (foe.length < 2) return [400, { error: "foe" }]; w.foe = foe; await wkSave(k, w); }
      return [200, { foe: w.foe }];
    },
    "POST /api/weekly/result": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const k = weekKey(), w = await wkGet(k), now = Date.now();
      if (body.week !== k) return [409, { error: "week" }];
      if (now - (lastWk.get(u.id) || 0) < 20000) return [429, { error: "slow" }];
      lastWk.set(u.id, now);
      const cost = Math.floor(+body.cost), rounds = Math.floor(+body.rounds), lost = Math.floor(+body.lost);
      const team = Array.isArray(body.team) ? body.team.filter(x => typeof x === "string" && /^[a-z0-9]{2,12}$/.test(x)).slice(0, 5) : [];
      if (!body.win || !(cost >= 1 && cost <= 10) || !(rounds >= 1 && rounds <= 300) || !(lost >= 0 && lost <= 2000) || team.length < 2) return [400, { error: "bad" }];
      const e = { name: u.name, cost, rounds, lost, team, t: now }, old = w.entries[u.id], better = !old || wkCmp(e, old) < 0;
      if (better) { w.entries[u.id] = e; await wkSave(k, w); }
      const r = wkRank(w), mi = r.findIndex(x => x.id === u.id);
      return [200, { better, rank: mi + 1, n: r.length, best: w.entries[u.id] }];
    },
    "GET /api/daily": async req => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const day = dayKey(); return [200, { day, done: u.stats.daily === day, streak: u.stats.dailyN || 0 }];
    },
    "POST /api/daily/done": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const day = dayKey(), st = u.stats;
      if (body.day !== day) return [409, { error: "day" }];
      if (st.daily === day) return [409, { error: "done" }];
      st.daily = day; st.dailyN = (st.dailyN || 0) + 1; st.pts += DAILY_PTS;
      const ach = achCheck(st); await store.saveStats(u.id, st);
      return [200, { user: pubUser(u), gain: DAILY_PTS, ach }];
    },
    "GET /api/decks": async req => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      return [200, { decks: u.stats.decks || [] }];
    },
    "POST /api/decks": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const list = Array.isArray(body.decks) ? body.decks.slice(0, 12) : null; if (!list) return [400, { error: "bad" }];
      const ok = [];
      for (const d of list) {
        const team = Array.isArray(d && d.team) ? d.team.filter(id => typeof id === "string" && /^[a-z0-9]{2,12}$/.test(id)).slice(0, 5) : [];
        if (team.length < 2 || new Set(team).size !== team.length) continue;
        ok.push({ name: String(d.name || "").trim().slice(0, 24) || "Équipe", team });
      }
      u.stats.decks = ok; await store.saveStats(u.id, u.stats);
      return [200, { decks: ok }];
    },
    "POST /api/password": async (req, body, ip) => {
      if (limited(ip)) return [429, { error: "slow" }];
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const full = await store.byName(u.name); const old = String(body.old || ""), pw = String(body.password || "");
      const h = await scrypt(old, full.salt);
      if (!crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(full.pass, "hex"))) return [400, { error: "oldpw" }];
      if (pw.length < 6 || pw.length > 100) return [400, { error: "password" }];
      const salt = crypto.randomBytes(16).toString("hex"); await store.setPassword(u.id, await scrypt(pw, salt), salt);
      return [200, { token: await newSession(u) }];
    },
    "POST /api/avatar": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const m = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image || ""));
      if (!m || !AVATAR_TYPES[m[1]]) return [400, { error: "image" }];
      const buf = Buffer.from(m[2], "base64");
      if (buf.length > AVATAR_MAX || buf.length < 100) return [400, { error: "size" }];
      const sig = buf.slice(0, 12).toString("binary");
      const okSig = m[1] === "image/png" ? sig.startsWith("\x89PNG") : m[1] === "image/jpeg" ? sig.startsWith("\xff\xd8") : sig.startsWith("RIFF") && sig.slice(8, 12) === "WEBP";
      if (!okSig) return [400, { error: "image" }];
      const v = await store.setAvatar(u.id, m[2], m[1]);
      return [200, { avatar: `/api/avatar/${u.id}?v=${v}` }];
    },
    "POST /api/result": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      if (body.mode !== "solo") return [400, { error: "mode" }];
      const now = Date.now(); if (now - (lastSolo.get(u.id) || 0) < 45000) return [429, { error: "slow" }];
      lastSolo.set(u.id, now);
      const st = u.stats, won = !!body.win;
      const LV = { easy: [5, 1], norm: [10, 2], hard: [15, 3], hokuto: [20, 4] }, lv = LV[body.lv] ? body.lv : "norm", gain = LV[lv][won ? 0 : 1];
      if (won) st.aiW++; else st.aiL++; st.pts += gain;
      streak(st, won); bumpFav(st, body.team);
      if (lv === "norm") { fRecord(body.team, won, "a"); fstats.n = fstats.n || { v: 0, a: 0 }; fstats.n.a++; }   // stats d'équilibrage : niveau normal seulement
      const ach = achCheck(st, won ? body.feats : []);
      await store.saveStats(u.id, st);
      return [200, { user: pubUser(u), ach, gain }];
    },
    // histoire : un chapitre à la fois, dans l'ordre ; 20 pts au premier passage, +10 par nouvelle étoile
    "POST /api/story": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const ch = String(body.ch || ""), idx = STORY_ORDER.indexOf(ch), stars = Math.floor(+body.stars), st = u.stats;
      if (idx < 0 || !(stars >= 1 && stars <= 3)) return [400, { error: "bad" }];
      if (STORY_TEST.test(ch) && !isAdmin(u)) return [403, { error: "test" }];   // arc en test : réservé aux admins
      const prog = st.story = st.story || {};
      if (idx > 0 && prog[STORY_ORDER[idx - 1]] == null && prog[ch] == null) return [409, { error: "bad" }];
      const now = Date.now(); if (now - (lastStory.get(u.id) || 0) < 15000) return [429, { error: "slow" }];
      lastStory.set(u.id, now);
      const had = prog[ch] == null ? -1 : prog[ch];
      // objectifs réussis (bits), cumulés d'une partie à l'autre : 3 étoiles = les deux objectifs, même sur des parties différentes
      const pc = x => (x & 1) + ((x >> 1) & 1), mk = Math.floor(+body.mask) & 3, M = st.storyM = st.storyM || {};
      const easy = body.diff === "e"; if (easy && stars > 2) return [400, { error: "bad" }];
      let best = stars; if (!easy && pc(mk) === stars - 1) { M[ch] = (M[ch] || 0) | mk; best = Math.max(stars, 1 + pc(M[ch])); }
      let gain = 0; if (had < 0) gain += 20; gain += 10 * Math.max(0, best - Math.max(0, had));
      prog[ch] = Math.max(best, had); st.pts += gain;
      if (body.diff === "h" && stars >= 3) { const H = st.storyH = st.storyH || {}; if (!H[ch]) { H[ch] = 1; st.pts += 15; gain += 15; } }
      const ach = achCheck(st, body.feats); await store.saveStats(u.id, st);
      return [200, { user: pubUser(u), gain, ach }];
    },
    // arcade : la tour, un étage à la fois dans l'ordre ; le combat secret (bonus) est facultatif, une fois par montée
    "POST /api/arc": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const floor = Math.floor(+body.floor), won = !!body.win, bonus = !!body.bonus, st = u.stats, N = 8;
      if (!(floor >= 1 && floor <= N)) return [400, { error: "bad" }];
      const now = Date.now();
      if (bonus) {
        if (!won) return [200, { user: pubUser(u), gain: 0 }];
        if (st.arcBonusRun || (st.arcRun || 0) < 2 || now - (lastArc.get(u.id) || 0) < 20000) return [409, { error: "bad" }];
        lastArc.set(u.id, now); st.arcBonusRun = 1; st.arcSecret = (st.arcSecret || 0) + 1; st.pts += 30;
        const ach = achCheck(st, body.feats); await store.saveStats(u.id, st); return [200, { user: pubUser(u), gain: 30, ach }];
      }
      if (!won) { st.arcRun = 0; st.arcBonusRun = 0; await store.saveStats(u.id, st); return [200, { user: pubUser(u), gain: 0 }]; }
      if (now - (lastArc.get(u.id) || 0) < 20000) return [429, { error: "slow" }];
      if (floor !== 1 && floor !== (st.arcRun || 0) + 1) return [409, { error: "bad" }];
      if (floor === 1) st.arcBonusRun = 0;
      lastArc.set(u.id, now);
      let gain = 5 + 3 * floor; if (floor === N) { gain += 40; st.arcClears = (st.arcClears || 0) + 1; }
      st.arcRun = floor === N ? 0 : floor; st.arc = Math.max(st.arc || 0, floor); st.pts += gain; bumpFav(st, body.team);
      const ach = achCheck(st, body.feats);
      await store.saveStats(u.id, st);
      return [200, { user: pubUser(u), gain, ach }];
    },
    // survie : une vague à la fois, dans l'ordre (la vague 1 lance une nouvelle série)
    "POST /api/surv": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const wave = Math.floor(+body.wave), won = !!body.win, st = u.stats;
      if (!(wave >= 1 && wave <= 999)) return [400, { error: "bad" }];
      const now = Date.now();
      if (!won) { st.survRun = 0; await store.saveStats(u.id, st); return [200, { user: pubUser(u), gain: 0 }]; }
      if (now - (lastSurv.get(u.id) || 0) < 20000) return [429, { error: "slow" }];
      if (wave !== 1 && wave !== (st.survRun || 0) + 1) return [409, { error: "bad" }];
      lastSurv.set(u.id, now);
      const gain = 5 + wave;
      st.survRun = wave; st.surv = Math.max(st.surv || 0, wave); st.pts += gain; bumpFav(st, body.team);
      const ach = achCheck(st, body.feats);
      await store.saveStats(u.id, st);
      return [200, { user: pubUser(u), gain, ach }];
    },
    "POST /api/match": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const code = String(body.code || ""), role = body.role;
      if (!/^[A-Z]{4}$/.test(code) || (role !== "host" && role !== "guest")) return [400, { error: "bad" }];
      if (!getDuel(code)) return [404, { error: "nomatch" }];
      const m = matches.get(code) || { teams: {} }; if (m.done) return [409, { error: "done" }];
      if (m[role] && m[role] !== u.id) return [409, { error: "taken" }];
      m[role] = u.id; m.teams[role] = body.team; matches.set(code, m);
      return [200, { ok: true }];
    },
    "POST /api/match/end": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const code = String(body.code || ""); const m = matches.get(code);
      if (!m) return [404, { error: "nomatch" }];
      const role = m.host === u.id ? "host" : m.guest === u.id ? "guest" : null; if (!role) return [403, { error: "role" }];
      if (body.forfeit) { await settle(code, role); return [200, { ok: true }]; }
      const loser = loserFromDuel(code); if (!loser) return [409, { error: "notover" }];
      await settle(code, loser);
      const me = await store.byId(u.id);
      const ach = achCheck(me.stats, loser !== role ? body.feats : []); if (ach.length) await store.saveStats(me.id, me.stats);
      return [200, { user: pubUser(me), ach }];
    },
    // présence : chaque client connecté pingue toutes les 30 s
    "POST /api/ping": async (req, body) => {
      const u = await auth(req); if (!u) return [401, { error: "auth" }];
      const where = ["menu", "ai", "solo", "surv", "arc", "story", "vs", "queue", "tour"].includes(body.where) ? body.where : "menu";
      presence.set(u.id, { ...pubUser(u), where, t: Date.now() });
      return [200, { online: onlineList() }];
    },
    "GET /api/online": async () => [200, { online: onlineList() }],
    "GET /api/status": async () => [200, { version, maintenance: { on: maintOn(), msg: maint.msg, forced: process.env.MAINTENANCE === "1" } }],
    "POST /api/admin/maintenance": async (req, body) => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      maint = { on: !!body.on, msg: String(body.msg || "").slice(0, 400) };
      await store.setSetting("maintenance", maint);
      console.log(`Maintenance ${maint.on ? "activée" : "désactivée"} par ${u.name}`);
      return [200, { maintenance: { on: maintOn(), msg: maint.msg, forced: process.env.MAINTENANCE === "1" } }];
    },
    // pastilles des combattants recadrées par l'admin (stockées en base : le disque de Render est effacé à chaque déploiement)
    "GET /api/faces": async () => [200, { faces: faces }],
    "POST /api/admin/face": async (req, body) => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      const id = String(body.id || ""); if (!/^[a-z0-9]{2,12}$/.test(id)) return [400, { error: "bad" }];
      if (body.reset) { delete faces[id]; await store.setSetting("face:" + id, null); await store.setSetting("faces", faces); return [200, { faces }]; }
      const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image || ""));
      if (!m) return [400, { error: "image" }];
      const buf = Buffer.from(m[2], "base64"); if (buf.length > 90 * 1024 || buf.length < 100) return [400, { error: "size" }];
      await store.setSetting("face:" + id, { type: m[1], data: m[2], crop: body.crop || null });
      faces[id] = Date.now().toString(36); await store.setSetting("faces", faces);
      console.log(`Pastille de ${id} recadrée par ${u.name}`);
      return [200, { faces }];
    },
    "GET /api/frames": async () => [200, { frames }],
    "POST /api/admin/frame": async (req, body) => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      const id = String(body.id || ""), kind = body.kind === "b" ? "b" : "p"; if (!/^[a-z0-9]{2,12}$/.test(id)) return [400, { error: "bad" }];
      if (body.reset) { delete frames[kind][id]; if (kind === "b") await store.setSetting("bust:" + id, null); await store.setSetting("frames", frames); return [200, { frames }]; }
      const c = body.crop || {}, n = v => Math.round(Number(v) || 0), crop = { x: n(c.x), y: n(c.y), w: Math.max(40, Math.min(1200, n(c.w))) };
      if (kind === "b") {
        const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image || ""));
        if (!m) return [400, { error: "image" }];
        const buf = Buffer.from(m[2], "base64"); if (buf.length > 90 * 1024 || buf.length < 100) return [400, { error: "size" }];
        await store.setSetting("bust:" + id, { type: m[1], data: m[2] });
        crop.v = Date.now().toString(36);
      }
      frames[kind][id] = crop; await store.setSetting("frames", frames);
      console.log(`Cadrage ${kind === "b" ? "vignette" : "combat"} de ${id} modifié par ${u.name}`);
      return [200, { frames }];
    },
    "GET /api/admin/face": async (req, body, ip, url) => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      const f = await store.getSetting("face:" + (url.searchParams.get("id") || "")); return [200, { crop: f && f.crop || null }];
    },
    "GET /api/admin/fstats": async req => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      return [200, fstats];
    },
    "POST /api/admin/fstats/reset": async req => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      fstats = { since: Date.now(), f: {}, n: { v: 0, a: 0 } }; await store.setSetting("fstats", fstats); console.log(`Stats d'équilibrage remises à zéro par ${u.name}`);
      return [200, fstats];
    },
    "GET /api/admin/users": async req => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      const list = (await store.listUsers()).map(x => ({ ...x, admin: isAdmin(x), avatar: x.avatar_v ? `/api/avatar/${x.id}?v=${x.avatar_v}` : null, ipBanned: ipBanned(x.last_ip) }));
      return [200, { users: list, ipBans }];
    },
    "POST /api/admin/user": async (req, body) => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      const t = await store.byId(+body.id); if (!t) return [404, { error: "notfound" }];
      if (isAdmin(t) && body.action !== "reset") return [400, { error: "self" }];
      if (body.action === "reset") {
        const A = "abcdefghjkmnpqrstuvwxyz23456789"; const pw = Array.from(crypto.randomBytes(10), b => A[b % A.length]).join("");
        const salt = crypto.randomBytes(16).toString("hex"); await store.setPassword(t.id, await scrypt(pw, salt), salt);
        console.log(`Admin ${u.name} : mot de passe de ${t.name} réinitialisé`); return [200, { password: pw }];
      }
      if (body.action === "ban" || body.action === "unban") { await store.setBanned(t.id, body.action === "ban"); console.log(`Admin ${u.name} : ${body.action} ${t.name}`); return [200, { ok: true }]; }
      if (body.action === "delete") { await store.deleteUser(t.id); console.log(`Admin ${u.name} : compte ${t.name} supprimé`); return [200, { ok: true }]; }
      return [400, { error: "bad" }];
    },
    "POST /api/admin/ipban": async (req, body) => {
      const u = await auth(req); if (!isAdmin(u)) return [403, { error: "admin" }];
      const ip = String(body.ip || "").trim().slice(0, 64); if (!/^[0-9a-fA-F:.]{3,64}$/.test(ip)) return [400, { error: "bad" }];
      const myIp = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      if (body.ban && ip === myIp) return [400, { error: "self" }];
      ipBans = ipBans.filter(b => b.ip !== ip);
      if (body.ban) ipBans.push({ ip, t: Date.now(), who: String(body.who || "").slice(0, 32) });
      await store.setSetting("ipbans", ipBans); console.log(`Admin ${u.name} : IP ${ip} ${body.ban ? "bannie" : "débannie"}`);
      return [200, { ipBans }];
    },
    // lecture publique pour les widgets du site hokutolegacy.com (aucune donnée privée)
    "GET /api/public/board": async () => {
      const slim = u => { const p = pubUser(u); return { id: p.id, name: p.name, avatar: p.avatar || null, elo: p.stats ? p.stats.elo : p.elo, pts: p.stats ? p.stats.pts : p.pts, w: p.stats ? (p.stats.vsW || 0) + (p.stats.aiW || 0) : 0 }; };
      const [elo, pts] = await Promise.all([store.top("elo", 10), store.top("pts", 10)]);
      const k = weekKey(), w = await wkGet(k), r = wkRank(w);
      const prev = wkRank(await wkGet(weekKey(-1))).slice(0, 3).map(e => ({ name: e.name, cost: e.cost, rounds: e.rounds, lost: e.lost, team: e.team }));
      return [200, { at: Date.now(), online: onlineList().length, elo: elo.map(slim), pts: pts.map(slim),
        weekly: { week: k, ends: weekKey(1), foe: w.foe || [], n: r.length, top: r.slice(0, 10).map(e => ({ name: e.name, cost: e.cost, rounds: e.rounds, lost: e.lost, team: e.team })), prev, prize: WK_PRIZE } }];
    },
    "GET /api/top": async (req, body, ip, url) => {
      const k = url.searchParams.get("kind"), kind = k === "pts" || k === "surv" ? k : "elo";
      return [200, { kind, list: (await store.top(kind, 50)).map(pubUser) }];
    }
  };

  // extensions (tournois) : accès aux routes, à l'auth et au règlement des matchs
  const ext = { routes, auth, pubUser, store, getDuel, hasDuel, matches, onSettle: fn => settleHooks.push(fn), settle };
  require("./tourney").install(ext);

  async function handle(req, res) {
    const url = new URL(req.url, "http://x");
    const send = (code, obj, extra) => { res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra }); res.end(JSON.stringify(obj)); };
    const fm = /^\/api\/face\/([a-z0-9]{2,12})$/.exec(url.pathname);
    if (req.method === "GET" && fm) {
      try { const f = await store.getSetting("face:" + fm[1]); if (!f || !f.data) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": f.type || "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" }); return res.end(Buffer.from(f.data, "base64")); }
      catch (e) { res.writeHead(500); return res.end(); }
    }
    const bm = /^\/api\/bust\/([a-z0-9]{2,12})$/.exec(url.pathname);
    if (req.method === "GET" && bm) {
      try { const f = await store.getSetting("bust:" + bm[1]); if (!f || !f.data) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": f.type || "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" }); return res.end(Buffer.from(f.data, "base64")); }
      catch (e) { res.writeHead(500); return res.end(); }
    }
    const am = /^\/api\/avatar\/(\d+)$/.exec(url.pathname);
    if (req.method === "GET" && am) {
      try { const a = await store.avatar(+am[1]); if (!a) { res.writeHead(404); return res.end(); }
        res.writeHead(200, { "Content-Type": a.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" }); return res.end(a.buf); }
      catch (e) { res.writeHead(500); return res.end(); }
    }
    let fn = routes[req.method + " " + url.pathname];
    const tm = /^\/api\/tourney\/([A-Z]{5})(?:\/(join|leave|start|award|kick))?$/.exec(url.pathname);
    if (!fn && tm) { const f = routes[req.method + " /api/tourney/:code" + (tm[2] ? "/" + tm[2] : "")]; if (f) fn = (rq, b, ip, u) => f(rq, b, ip, u, tm[1]); }
    if (!fn) return send(404, { error: "notfound" });
    // pendant la maintenance : seules la connexion, la lecture et l'admin restent ouvertes
    const open = req.method === "GET" || ["/api/login", "/api/logout", "/api/admin/maintenance", "/api/match/end"].includes(url.pathname);
    if (maintOn() && !open) { const u = await auth(req).catch(() => null); if (!isAdmin(u)) return send(503, { error: "maintenance" }); }
    let raw = "", big = false;
    req.on("data", c => { raw += c; if (raw.length > 150 * 1024) { big = true; req.destroy(); } });
    req.on("end", async () => {
      if (big) return;
      let body = {}; if (raw) { try { body = JSON.parse(raw); } catch (e) { return send(400, { error: "json" }); } }
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
      try { const [code, obj] = await fn(req, body, ip, url); send(code, obj, url.pathname.startsWith("/api/public/") ? { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" } : undefined); }
      catch (e) { console.error("api", url.pathname, e.message); send(500, { error: "server" }); }
    });
  }
  return { handle, ipBanned, auth };
}

module.exports = { jsonStore, pgStore, makeAccounts };
