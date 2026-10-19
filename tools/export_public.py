"""Régénère les fichiers publics à partir du jeu (public/index.html) :
public/fighters.json, public/rules.json, public/changelog.json, CHANGELOG.md,
la version de public/sw.js et de package.json.
Usage : python3 tools/export_public.py   (nécessite Playwright + Chromium)"""
import json, re, subprocess, sys, time, os, socket
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
from playwright.sync_api import sync_playwright
s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port)], cwd=PUB, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(); pg.goto(f"http://127.0.0.1:{port}/index.html"); pg.wait_for_timeout(1500)
        live = pg.evaluate("""()=>{
          const t=(s)=>({fr:s,en:(TX[s]||[])[0]??s,it:(TX[s]||[])[1]??s,ja:TXJA[s]??(TX[s]||[])[0]??s});
          const fighters=ROSTER().map(id=>{ const f=FIGHTERS[id], o={id,name:t(CONFIG.names[id]),clan:CLAN[id],cost:COST[id],hp:f.hp,npc:f.npc??null,img:CONFIG.imgs[id],bust:`assets/bust-${id}.webp`,passive:t(f.passive),
              ult:{name:t(f.ult.name),dmg:f.ult.dmg},techs:f.techs.map(x=>({name:t(x[0]),lvl:x[1],cost:x[2],dmg:x[3]}))};
            if(SPECS[id]) o.spec={name:t(SPECS[id].name),text:t(SPECS[id].text),cost:SPECS[id].cost};
            const tp=Object.values(TRAPS).find(v=>v.own===id); if(tp) o.trap={name:t(tp.name),text:t(tp.text)};
            return o; });
          const clans={}; for(const c of CLANS) clans[c]={fr:UI.fr["clan_"+c],en:UI.en["clan_"+c],it:UI.it["clan_"+c],ja:UI.ja["clan_"+c]};
          const rules={}; for(const l of ["fr","en","it","ja"]) rules[l]=UI[l].rulesHTML;
          return {fighters,clans,rules,ver:APP_VERSION,log:CHANGELOG};
        }""")
        b.close()
finally:
    srv.terminate()
v = live["ver"]
dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
open(os.path.join(PUB, "fighters.json"), "w", encoding="utf-8").write(dump({"v": v, "clans": live["clans"], "fighters": live["fighters"]}))
open(os.path.join(PUB, "rules.json"), "w", encoding="utf-8").write(dump({"v": v, "rules": live["rules"]}))
cj = os.path.join(PUB, "changelog.json"); old = json.load(open(cj, encoding="utf-8"))
old["version"] = v; old["versions"] = live["log"]
open(cj, "w", encoding="utf-8").write(dump(old))
md = "# Journal des modifications\n\nGénéré depuis le jeu (`CHANGELOG` dans public/index.html). Visible en jeu via le bouton de version.\n\n"
md += "".join(f"## v{e['v']} — {e['d']}\n\n" + "".join(f"- {x}\n" for x in e["fr"]) + "\n" for e in live["log"])
open(os.path.join(ROOT, "CHANGELOG.md"), "w", encoding="utf-8").write(md.rstrip("\n") + "\n")
sw = os.path.join(PUB, "sw.js"); t = open(sw, encoding="utf-8").read()
# empreinte du contenu des images et sons : le cache du navigateur est vidé dès qu'un fichier change (nouvelle illustration, nouveau son)
import hashlib
_h = hashlib.sha1()
for d in ("assets", "sfx", "fonts"):
    for r, _, fs in sorted(os.walk(os.path.join(PUB, d))):
        for f in sorted(fs):
            fp = os.path.join(r, f); _h.update(os.path.relpath(fp, PUB).encode()); _h.update(hashlib.md5(open(fp, "rb").read()).digest())
astamp = _h.hexdigest()[:10]
t = re.sub(r'const VERSION = "[^"]*"', f'const VERSION = "{v}"', t, count=1)
t = re.sub(r'const ASTAMP = "[^"]*"', f'const ASTAMP = "{astamp}"', t, count=1) if "const ASTAMP" in t else t.replace(f'const VERSION = "{v}";', f'const VERSION = "{v}";\nconst ASTAMP = "{astamp}";   // empreinte des images / sons (écrite par tools/export_public.py)', 1)
open(sw, "w", encoding="utf-8").write(t)
pk = os.path.join(ROOT, "package.json"); t = open(pk, encoding="utf-8").read()
t = re.sub(r'"version": "[^"]*"', f'"version": "{v}"', t, count=1)
# build : change à chaque mise en ligne, même quand la version reste la même (une version par jour)
build = time.strftime("%Y%m%d%H%M%S", time.gmtime())
t = re.sub(r'"build": "[^"]*"', f'"build": "{build}"', t, count=1) if '"build"' in t else t.replace(f'"version": "{v}"', f'"version": "{v}",\n  "build": "{build}"', 1)
open(pk, "w", encoding="utf-8").write(t)
ix = os.path.join(PUB, "index.html"); h = open(ix, encoding="utf-8").read()
open(ix, "w", encoding="utf-8", newline="\n").write(re.sub(r'APP_BUILD="[^"]*"', f'APP_BUILD="{build}"', h, count=1))
try:
    import importlib.util as _u; _s=_u.spec_from_file_location("sons_page", os.path.join(ROOT, "tools", "sons_page.py")); _m=_u.module_from_spec(_s); _s.loader.exec_module(_m); _m.build()
except Exception as e: print("sons.html : erreur", e)
print("export ok, version", v, "build", build, "-", len(live["fighters"]), "combattants")
