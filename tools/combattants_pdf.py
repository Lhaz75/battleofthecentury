# Génère public/combattants-<langue>.pdf : la fiche de tous les combattants, à télécharger et consulter hors ligne.
# Appelé par export_public.py (seulement si fighters.json a changé) ; ou seul : python3 tools/combattants_pdf.py [--force]
import os, sys, json, html, hashlib, socket, subprocess, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")
LANGS = ["fr", "en", "it", "ja"]
T = {
    "fr": dict(title="Les combattants", sub="Battle of the Century · fiche des combattants", hp="PV", cost="Coût", passive="Passif", techs="Techniques", ult="Ultime", spec="Spéciale", trap="Piège", lv=["Léger", "Moyen", "Lourd"], dmg="dégâts", end="end.", n="combattants", ver="Version"),
    "en": dict(title="The fighters", sub="Battle of the Century · fighter sheet", hp="HP", cost="Cost", passive="Passive", techs="Techniques", ult="Ultimate", spec="Special", trap="Trap", lv=["Light", "Medium", "Heavy"], dmg="dmg", end="end.", n="fighters", ver="Version"),
    "it": dict(title="I combattenti", sub="Battle of the Century · scheda dei combattenti", hp="PV", cost="Costo", passive="Passiva", techs="Tecniche", ult="Ultima", spec="Speciale", trap="Trappola", lv=["Leggero", "Medio", "Pesante"], dmg="danni", end="res.", n="combattenti", ver="Versione"),
    "ja": dict(title="ファイター一覧", sub="Battle of the Century · ファイターシート", hp="HP", cost="コスト", passive="パッシブ", techs="技", ult="奥義", spec="スペシャル", trap="罠", lv=["弱", "中", "強"], dmg="ダメージ", end="スタミナ", n="人", ver="バージョン"),
}
CSS = """
@page{size:A4;margin:12mm 10mm}
*{box-sizing:border-box}
body{margin:0;font:9.2pt/1.32 "Segoe UI",system-ui,"Noto Sans","Noto Sans CJK JP",sans-serif;color:#1d1410}
.cover{text-align:center;padding:60mm 0 0;page-break-after:always}
.cover h1{font-size:30pt;margin:0 0 6mm;color:#8c1d10;letter-spacing:1px}
.cover p{color:#6b5848;font-size:11pt;margin:2mm 0}
h2{font-size:13pt;color:#8c1d10;border-bottom:1.5pt solid #c8442a;padding-bottom:1.5mm;margin:5mm 0 3mm;break-after:avoid}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.card{display:flex;gap:3mm;border:0.6pt solid #d8c6ad;border-radius:2.5mm;padding:2.5mm;break-inside:avoid;background:#fffaf2}
.card img{width:22mm;height:27.5mm;object-fit:cover;border-radius:1.5mm;flex:none;background:#2a1c14}
.b{flex:1;min-width:0}
.hd{display:flex;justify-content:space-between;gap:2mm;align-items:baseline}
.nm{font-weight:700;font-size:11pt}
.st{white-space:nowrap;font-size:8.5pt;color:#6b5848}.st b{color:#1d1410}
.lb{font-weight:700;color:#8c1d10;font-size:7.6pt;text-transform:uppercase;letter-spacing:.3px;margin-top:1.2mm}
.tx{font-size:8.5pt}
table{width:100%;border-collapse:collapse;font-size:8pt;margin-top:.6mm}
td{padding:.35mm 0;border-bottom:0.3pt solid #eadfcd;vertical-align:top}
td.l{color:#6b5848;white-space:nowrap;width:12mm}td.c{text-align:right;white-space:nowrap;color:#6b5848;width:16mm}
.ult{margin-top:1mm;font-size:8.5pt}.ult b{color:#8c1d10}
"""


def page(lang, data):
    t, e = T[lang], html.escape
    tr = lambda o: (o or {}).get(lang) or (o or {}).get("en") or (o or {}).get("fr") or ""
    clans = data["clans"]
    order = list(clans.keys())
    fs = sorted(data["fighters"], key=lambda f: (order.index(f["clan"]) if f["clan"] in order else 99, -f["cost"], tr(f["name"])))
    out = [f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>{CSS}</style></head><body>',
           f'<div class="cover"><h1>{e(t["title"])}</h1><p>{e(t["sub"])}</p><p>{len(fs)} {e(t["n"])} · {e(t["ver"])} {e(data["v"])} · {time.strftime("%d/%m/%Y")}</p><p>battle-of-the-century.onrender.com</p></div>']
    for c in order:
        grp = [f for f in fs if f["clan"] == c]
        if not grp: continue
        out.append(f'<h2>{e(tr(clans[c]))}</h2><div class="grid">')
        for f in grp:
            rows = "".join(f'<tr><td class="l">{e(t["lv"][x["lvl"]])}</td><td>{e(tr(x["name"]))}</td><td class="c">{x["dmg"]} {e(t["dmg"])} · {x["cost"]} {e(t["end"])}</td></tr>' for x in f["techs"])
            extra = ""
            if f.get("spec"): extra += f'<div class="lb">{e(t["spec"])} · {e(tr(f["spec"]["name"]))}</div><div class="tx">{e(tr(f["spec"]["text"]))}</div>'
            if f.get("trap"): extra += f'<div class="lb">{e(t["trap"])} · {e(tr(f["trap"]["name"]))}</div><div class="tx">{e(tr(f["trap"]["text"]))}</div>'
            out.append(f'''<div class="card"><img src="_pdfimg/{e(f["id"])}.jpg" alt=""><div class="b">
<div class="hd"><span class="nm">{e(tr(f["name"]))}</span><span class="st">{e(t["hp"])} <b>{f["hp"]}</b> · {e(t["cost"])} <b>{f["cost"]}</b></span></div>
<div class="lb">{e(t["passive"])}</div><div class="tx">{e(tr(f["passive"]))}</div>
<div class="lb">{e(t["techs"])}</div><table>{rows}</table>{extra}
<div class="ult"><b>{e(t["ult"])} :</b> {e(tr(f["ult"]["name"]))} · {f["ult"]["dmg"]} {e(t["dmg"])}</div></div></div>''')
        out.append("</div>")
    out.append("</body></html>")
    return "".join(out)


def build(force=False):
    src = open(os.path.join(PUB, "fighters.json"), "rb").read()
    h = hashlib.sha1(src + open(__file__, "rb").read()).hexdigest()
    hf = os.path.join(ROOT, "tools", ".combattants-pdf.hash")
    if not force and os.path.exists(hf) and open(hf).read().strip() == h and all(os.path.exists(os.path.join(PUB, f"combattants-{l}.pdf")) for l in LANGS):
        return "inchangé"
    data = json.loads(src)
    from playwright.sync_api import sync_playwright
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    srv = subprocess.Popen([sys.executable, "-m", "http.server", str(port)], cwd=PUB, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tmp = os.path.join(PUB, "_combattants_print.html")
    # portraits réduits en JPEG (sinon chaque PDF pèse ~12 Mo)
    from PIL import Image
    imgd = os.path.join(PUB, "_pdfimg"); os.makedirs(imgd, exist_ok=True)
    for f in data["fighters"]:
        try:
            im = Image.open(os.path.join(PUB, f["bust"])).convert("RGBA"); bg = Image.new("RGB", im.size, (42, 28, 20)); bg.paste(im, mask=im.split()[3])
            bg.resize((132, 165), Image.LANCZOS).save(os.path.join(imgd, f["id"] + ".jpg"), "JPEG", quality=72, optimize=True)
        except Exception as er: print("portrait", f["id"], er)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(); pg = b.new_page()
            for l in LANGS:
                open(tmp, "w", encoding="utf-8").write(page(l, data))
                pg.goto(f"http://127.0.0.1:{port}/_combattants_print.html"); pg.wait_for_load_state("networkidle")
                pg.pdf(path=os.path.join(PUB, f"combattants-{l}.pdf"), format="A4", print_background=True,
                       display_header_footer=True, header_template="<span></span>",
                       footer_template='<div style="font-size:7pt;color:#8a7766;width:100%;text-align:center">Battle of the Century · <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
                       margin={"top": "12mm", "bottom": "14mm", "left": "10mm", "right": "10mm"})
            b.close()
    finally:
        srv.terminate()
        if os.path.exists(tmp): os.remove(tmp)
        import shutil; shutil.rmtree(os.path.join(PUB, "_pdfimg"), ignore_errors=True)
    open(hf, "w").write(h)
    return "ok"


if __name__ == "__main__":
    print("PDF combattants :", build("--force" in sys.argv))
