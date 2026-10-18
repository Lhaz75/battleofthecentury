// Chat global du jeu : passe par le WebSocket /ws (ops "chat*"), 50 derniers messages en mémoire + en base (réglage "chat").
// Messages système (sys) : envoyés par le serveur, traduits côté client à partir de leur clé et de leurs arguments.
const https = require("https");

const KEEP = 50, MAX_LEN = 200, GAP_MS = 3000;

function makeChat({ store, ready, auth, isAdmin }) {
  let msgs = [], mutes = {}, seq = Date.now(), saveT = null;
  const clients = new Set();
  const last = new Map();   // uid -> horodatage du dernier message

  Promise.resolve(ready).then(async () => {
    const v = await store.getSetting("chat"); if (v && Array.isArray(v.msgs)) msgs = v.msgs.slice(-KEEP);
    const m = await store.getSetting("chatMute"); if (m && typeof m === "object") mutes = m;
  }).catch(e => console.error("chat load", e.message));

  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.setSetting("chat", { msgs }).catch(e => console.error("chat save", e.message)), 1500); };
  const out = o => JSON.stringify(o);
  const all = o => { const s = out(o); for (const ws of clients) if (ws.readyState === 1) ws.send(s); };
  const muted = uid => { const t = mutes[uid]; if (!t) return 0; if (t < Date.now()) { delete mutes[uid]; return 0; } return t; };

  function push(m) { msgs.push(m); if (msgs.length > KEEP) msgs = msgs.slice(-KEEP); save(); all({ op: "chatMsg", m }); }

  // relais optionnel vers un salon Discord (variable DISCORD_WEBHOOK sur Render)
  function relay(name, txt) {
    const url = process.env.DISCORD_WEBHOOK; if (!url) return;
    let u; try { u = new URL(url); } catch (e) { return; }
    const body = JSON.stringify({ username: String(name).slice(0, 32) + " (jeu)", content: txt, allowed_mentions: { parse: [] } });
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: "POST", headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } }, res => res.resume());
    r.on("error", () => {}); r.end(body);
  }

  // message système : k = clé de texte côté client, a = arguments
  function sys(k, a) { push({ id: (++seq).toString(36), t: Date.now(), sys: k, a: (a || []).map(x => typeof x === "number" ? x : String(x).slice(0, 60)) }); }

  // renvoie true si le message WebSocket était pour le chat
  async function onMessage(ws, m) {
    if (typeof m.op !== "string" || !m.op.startsWith("chat")) return false;
    const reply = o => ws.readyState === 1 && ws.send(out({ id: m.id, ...o }));
    if (m.op === "chatSub") {
      clients.add(ws);
      ws.chatUser = null;
      if (typeof m.tok === "string" && /^[0-9a-f]{64}$/.test(m.tok)) {
        const u = await auth({ headers: { authorization: "Bearer " + m.tok, "x-forwarded-for": ws.ip || "" }, socket: {} }).catch(() => null);
        if (u && !u.banned) ws.chatUser = { id: u.id, name: u.name, admin: isAdmin(u) };
      }
      const me = ws.chatUser;
      ws.send(out({ op: "chatList", msgs, me: me ? { id: me.id, admin: me.admin, muted: muted(me.id) } : null }));
      return true;
    }
    if (m.op === "chatUnsub") { clients.delete(ws); return true; }
    const me = ws.chatUser; if (!me) { reply({ op: "err", code: "auth" }); return true; }
    if (m.op === "chatSend") {
      const until = muted(me.id); if (until) { reply({ op: "err", code: "muted", until }); return true; }
      const now = Date.now(); if (now - (last.get(me.id) || 0) < GAP_MS) { reply({ op: "err", code: "slow" }); return true; }
      const txt = String(m.txt || "").replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
      if (!txt) { reply({ op: "err", code: "empty" }); return true; }
      last.set(me.id, now);
      push({ id: (++seq).toString(36), t: now, uid: me.id, name: me.name, txt, ...(me.admin ? { adm: 1 } : {}) });
      reply({ op: "ok" }); relay(me.name, txt); return true;
    }
    if (!me.admin) { reply({ op: "err", code: "admin" }); return true; }
    if (m.op === "chatDel") {
      const n = msgs.length; msgs = msgs.filter(x => x.id !== m.mid);
      if (msgs.length !== n) { save(); all({ op: "chatDel", mid: m.mid }); }
      reply({ op: "ok" }); return true;
    }
    if (m.op === "chatMute") {
      const uid = +m.uid, min = Math.max(0, Math.min(7 * 1440, Math.floor(+m.min || 0)));
      if (!uid) { reply({ op: "err", code: "invalid_argument" }); return true; }
      if (min) mutes[uid] = Date.now() + min * 60e3; else delete mutes[uid];
      store.setSetting("chatMute", mutes).catch(() => {});
      for (const ws2 of clients) if (ws2.chatUser && ws2.chatUser.id === uid && ws2.readyState === 1) ws2.send(out({ op: "chatMuted", until: muted(uid) }));
      if (min) msgs.filter(x => x.uid === uid).slice(-1).forEach(x => all({ op: "chatInfo", k: "chatMutedBy", a: [x.name, min] }));
      reply({ op: "ok" }); return true;
    }
    reply({ op: "err", code: "invalid_argument" }); return true;
  }
  const drop = ws => clients.delete(ws);
  return { onMessage, drop, sys };
}

module.exports = { makeChat };
