// Tournois en ligne : tableau à élimination directe (2 à 8 joueurs), matchs joués en versus.
const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const rnd = n => Math.floor(Math.random() * n);
const code = n => Array.from({ length: n }, () => A[rnd(A.length)]).join("");
const TEAM_RE = /^[a-z]{2,12}$/;
const NAME_MAX = 32;
const WIN_BONUS = 100;

function install(x) {
  const { routes, auth, pubUser, store, hasDuel, onSettle, settle, matches } = x;
  const cache = new Map();            // code -> tournoi (copie de travail)
  const byMatch = new Map();          // code de duel -> code de tournoi
  const locks = new Map();

  async function get(c) {
    if (cache.has(c)) return cache.get(c);
    const t = await store.getTourney(c); if (!t) return null;
    cache.set(c, t); t.matches.forEach(m => m.code && byMatch.set(m.code, c)); return t;
  }
  async function save(t) { t.updated = Date.now(); cache.set(t.code, t); await store.saveTourney(t); }
  // une seule modification à la fois par tournoi
  async function withLock(c, fn) {
    const prev = locks.get(c) || Promise.resolve(); let release;
    const p = new Promise(r => release = r); locks.set(c, prev.then(() => p));
    await prev; try { return await fn(); } finally { release(); if (locks.get(c) === p) locks.delete(c); }
  }
  const view = t => ({ code: t.code, name: t.name, size: t.size, host: t.host, status: t.status, winner: t.winner || null, created: t.created,
    players: t.players.map(p => ({ uid: p.uid, name: p.name, avatar: p.avatar, team: p.team })), matches: t.matches });
  const validTeam = team => Array.isArray(team) && team.length >= 2 && team.length <= 5 && team.every(id => typeof id === "string" && TEAM_RE.test(id));
  function freeCode() { for (let i = 0; i < 500; i++) { const c = code(4); if (!hasDuel(c) && !byMatch.has(c)) return c; } return code(4); }

  // prépare les matchs jouables et fait avancer les byes
  function advance(t) {
    let moved = true;
    while (moved) {
      moved = false;
      for (const m of t.matches) {
        if (m.winner) continue;
        const firstRound = m.round === 0;
        // bye : au premier tour, un seul joueur dans le match
        if (firstRound && (m.a == null) !== (m.b == null)) { m.winner = m.a ?? m.b; m.bye = true; moved = true; }
        // au tour suivant, un adversaire ne viendra jamais si son match source n'a aucun joueur
        if (!firstRound && !m.winner) {
          const src = t.matches.filter(s => s.round === m.round - 1 && Math.floor(s.slot / 2) === m.slot);
          const dead = src.filter(s => s.a == null && s.b == null);
          if (dead.length === 1 && (m.a != null || m.b != null) && src.find(s => s !== dead[0] && s.winner)) { m.winner = m.a ?? m.b; m.bye = true; moved = true; }
        }
        if (m.winner) {
          const nx = t.matches.find(n => n.round === m.round + 1 && n.slot === Math.floor(m.slot / 2));
          if (nx) { if (m.slot % 2 === 0) nx.a = m.winner; else nx.b = m.winner; }
        }
      }
    }
    for (const m of t.matches) if (!m.winner && m.a != null && m.b != null && !m.code) { m.code = freeCode(); byMatch.set(m.code, t.code); }
    const final = t.matches.find(m => m.round === Math.log2(t.size) - 1);
    if (final && final.winner && t.status !== "done") { t.status = "done"; t.winner = final.winner; return final.winner; }
    return null;
  }
  async function crown(t, uid) {
    const u = await store.byId(uid); if (!u) return;
    u.stats.tW = (u.stats.tW || 0) + 1; u.stats.pts += WIN_BONUS; await store.saveStats(u.id, u.stats);
  }
  async function setWinner(t, m, uid) {
    if (m.winner) return;
    m.winner = uid;
    const nx = t.matches.find(n => n.round === m.round + 1 && n.slot === Math.floor(m.slot / 2));
    if (nx) { if (m.slot % 2 === 0) nx.a = uid; else nx.b = uid; }
    const champ = advance(t); if (champ) await crown(t, champ);
  }

  // un match de tournoi réglé par le système versus (fin de partie ou abandon)
  onSettle(async (duelCode, loserRole) => {
    const tc = byMatch.get(duelCode); if (!tc) return;
    await withLock(tc, async () => {
      const t = await get(tc); if (!t) return;
      const m = t.matches.find(z => z.code === duelCode); if (!m || m.winner) return;
      await setWinner(t, m, loserRole === "host" ? m.b : m.a); await save(t);
    });
  });

  routes["POST /api/tourney"] = async (req, body) => {
    const u = await auth(req); if (!u) return [401, { error: "auth" }];
    const size = [2, 4, 8].includes(+body.size) ? +body.size : 8;
    const name = String(body.name || "").trim().slice(0, NAME_MAX) || `Tournoi de ${u.name}`;
    let c; for (let i = 0; i < 50; i++) { c = code(5); if (!(await get(c))) break; }
    const t = { code: c, name, size, host: u.id, status: "open", players: [], matches: [], created: Date.now() };
    if (validTeam(body.team)) t.players.push({ uid: u.id, name: u.name, avatar: pubUser(u).avatar, team: body.team.slice(0, 5) });
    await save(t);
    return [200, { tourney: view(t) }];
  };
  routes["GET /api/tourneys"] = async () => {
    const list = await store.openTourneys();
    return [200, { list: list.filter(t => t.status === "open").map(t => ({ code: t.code, name: t.name, size: t.size, n: t.players.length, host: (t.players.find(p => p.uid === t.host) || {}).name || null })) }];
  };
  routes["GET /api/tourney/:code"] = async (req, body, ip, url, c) => {
    const t = await get(c); if (!t) return [404, { error: "notfound" }];
    return [200, { tourney: view(t) }];
  };
  routes["POST /api/tourney/:code/join"] = async (req, body, ip, url, c) => {
    const u = await auth(req); if (!u) return [401, { error: "auth" }];
    if (!validTeam(body.team)) return [400, { error: "team" }];
    return withLock(c, async () => {
      const t = await get(c); if (!t) return [404, { error: "notfound" }];
      if (t.status !== "open") return [409, { error: "started" }];
      const me = t.players.find(p => p.uid === u.id);
      if (me) { me.team = body.team.slice(0, 5); me.avatar = pubUser(u).avatar; }
      else { if (t.players.length >= t.size) return [409, { error: "full" }]; t.players.push({ uid: u.id, name: u.name, avatar: pubUser(u).avatar, team: body.team.slice(0, 5) }); }
      await save(t); return [200, { tourney: view(t) }];
    });
  };
  routes["POST /api/tourney/:code/leave"] = async (req, body, ip, url, c) => {
    const u = await auth(req); if (!u) return [401, { error: "auth" }];
    return withLock(c, async () => {
      const t = await get(c); if (!t) return [404, { error: "notfound" }];
      if (t.status !== "open") return [409, { error: "started" }];
      t.players = t.players.filter(p => p.uid !== u.id); await save(t); return [200, { tourney: view(t) }];
    });
  };
  routes["POST /api/tourney/:code/kick"] = async (req, body, ip, url, c) => {
    const u = await auth(req); if (!u) return [401, { error: "auth" }];
    return withLock(c, async () => {
      const t = await get(c); if (!t) return [404, { error: "notfound" }];
      if (t.host !== u.id) return [403, { error: "host" }]; if (t.status !== "open") return [409, { error: "started" }];
      t.players = t.players.filter(p => p.uid !== +body.uid); await save(t); return [200, { tourney: view(t) }];
    });
  };
  routes["POST /api/tourney/:code/start"] = async (req, body, ip, url, c) => {
    const u = await auth(req); if (!u) return [401, { error: "auth" }];
    return withLock(c, async () => {
      const t = await get(c); if (!t) return [404, { error: "notfound" }];
      if (t.host !== u.id) return [403, { error: "host" }];
      if (t.status !== "open") return [409, { error: "started" }];
      if (t.players.length < 2) return [409, { error: "few" }];
      let size = 2; while (size < t.players.length) size *= 2; t.size = size;
      const ps = t.players.map(p => p.uid).sort(() => Math.random() - .5);
      const slots = Array(size).fill(null);
      ps.forEach((uid, i) => { const half = size / 2; slots[i < half ? i * 2 : (i - half) * 2 + 1] = uid; });
      const rounds = Math.log2(size); t.matches = [];
      for (let r = 0; r < rounds; r++) for (let k = 0; k < size >> (r + 1); k++) t.matches.push({ round: r, slot: k, a: r === 0 ? slots[k * 2] : null, b: r === 0 ? slots[k * 2 + 1] : null, winner: null, code: null });
      t.status = "running"; const champ = advance(t); if (champ) await crown(t, champ);
      await save(t); return [200, { tourney: view(t) }];
    });
  };
  // l'organisateur désigne un vainqueur (joueur absent, partie plantée…)
  routes["POST /api/tourney/:code/award"] = async (req, body, ip, url, c) => {
    const u = await auth(req); if (!u) return [401, { error: "auth" }];
    return withLock(c, async () => {
      const t = await get(c); if (!t) return [404, { error: "notfound" }];
      if (t.host !== u.id) return [403, { error: "host" }];
      const m = t.matches.find(z => z.round === +body.round && z.slot === +body.slot);
      if (!m || m.winner || m.a == null || m.b == null || (+body.winner !== m.a && +body.winner !== m.b)) return [400, { error: "bad" }];
      const mm = m.code && matches.get(m.code); if (mm) mm.done = true;   // le match versus ne compte plus
      await setWinner(t, m, +body.winner); await save(t); return [200, { tourney: view(t) }];
    });
  };
}

module.exports = { install };
