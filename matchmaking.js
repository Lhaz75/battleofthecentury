// Recherche rapide : file d'attente en mémoire, appariement par Elo (fenêtre qui s'élargit avec l'attente).
const crypto = require("crypto");
const TEAM_RE = /^[a-z]{2,12}$/;
const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";

function makeMatchmaking({ docs, markDirty, broadcast, auth }) {
  const queue = new Map();     // ticket -> { uid, name, team, elo, t, seen, ip }
  const results = new Map();   // ticket -> { code, role, opp, t }
  const code4 = () => { for (let i = 0; i < 500; i++) { const c = Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join(""); if (!docs["duels/" + c]) return c; } return "ZZZZ"; };

  function pair() {
    const now = Date.now();
    for (const [k, q] of queue) if (now - q.seen > 15000) queue.delete(k);   // onglet fermé
    const list = [...queue.entries()].sort((a, b) => a[1].t - b[1].t);
    const used = new Set();
    for (let i = 0; i < list.length; i++) {
      const [ka, a] = list[i]; if (used.has(ka)) continue;
      let best = null, bestGap = Infinity;
      for (let j = i + 1; j < list.length; j++) {
        const [kb, b] = list[j]; if (used.has(kb) || a.uid === b.uid || (a.ip && a.ip === b.ip && a.uid === b.uid)) continue;
        const gap = Math.abs(a.elo - b.elo);
        const tol = 150 + Math.min(now - a.t, now - b.t) / 1000 * 25;   // +25 Elo de tolérance par seconde d'attente
        if (gap <= tol && gap < bestGap) { best = [kb, b]; bestGap = gap; }
      }
      if (!best) continue;
      const [kb, b] = best; used.add(ka); used.add(kb); queue.delete(ka); queue.delete(kb);
      const code = code4();
      docs["duels/" + code] = { code, hostId: a.uid, hostName: a.name, hostTeam: a.team, guestId: b.uid, guestName: b.name, guestTeam: b.team, status: "ready", seq: 0, created: now, quick: true, _t: now };
      markDirty(); broadcast("duels/" + code);
      results.set(ka, { code, role: "host", opp: b.name, t: now }); results.set(kb, { code, role: "guest", opp: a.name, t: now });
    }
    for (const [k, r] of results) if (now - r.t > 60000) results.delete(k);
  }
  setInterval(pair, 1000);

  async function handle(req, res, url) {
    const send = (c, o) => { res.writeHead(c, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(o)); };
    const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
    if (req.method === "GET" && url.pathname === "/api/mm/poll") {
      const t = url.searchParams.get("t") || "";
      const r = results.get(t); if (r) { results.delete(t); return send(200, { status: "matched", code: r.code, role: r.role, opp: r.opp }); }
      const q = queue.get(t); if (!q) return send(200, { status: "gone" });
      q.seen = Date.now(); return send(200, { status: "waiting", n: queue.size, wait: Math.round((Date.now() - q.t) / 1000) });
    }
    if (req.method === "GET" && url.pathname === "/api/mm/count") return send(200, { n: queue.size });
    if (req.method !== "POST") return send(404, { error: "notfound" });
    let raw = ""; req.on("data", c => { raw += c; if (raw.length > 8000) req.destroy(); });
    req.on("end", async () => {
      let b = {}; try { b = JSON.parse(raw || "{}"); } catch (e) { return send(400, { error: "json" }); }
      if (url.pathname === "/api/mm/leave") { queue.delete(String(b.t || "")); return send(200, { ok: true }); }
      if (url.pathname !== "/api/mm/join") return send(404, { error: "notfound" });
      const uid = String(b.uid || ""); if (!/^[a-z0-9]{6,40}$/i.test(uid)) return send(400, { error: "uid" });
      const team = Array.isArray(b.team) ? b.team.filter(x => typeof x === "string" && TEAM_RE.test(x)).slice(0, 5) : [];
      if (team.length < 2) return send(400, { error: "team" });
      const u = await auth(req).catch(() => null);
      const name = u ? u.name : String(b.name || "").trim().slice(0, 16) || "Joueur";
      for (const [k, q] of queue) if (q.uid === uid) queue.delete(k);   // une seule recherche par joueur
      const t = crypto.randomBytes(12).toString("hex"), now = Date.now();
      queue.set(t, { uid, name, team, elo: u ? (u.stats.elo || 1000) : 1000, t: now, seen: now, ip });
      send(200, { t, n: queue.size });
    });
  }
  return { handle };
}
module.exports = { makeMatchmaking };
