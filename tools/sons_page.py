# Génère public/sons.html : la liste de tous les sons et musiques du jeu, avec leur usage, pour les écouter un par un.
# Appelé par export_public.py ; peut aussi se lancer seul : python3 tools/sons_page.py
import os, re, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "public")

USE = {"hitLight": "Coup léger / moyen (au hasard)", "hitMid": "Coup léger / moyen (au hasard)", "hitHeavy": "Gros coup, 10 dégâts et plus (au hasard)",
       "guard": "Garde", "dodge": "Esquive", "counter": "Contre", "ko": "KO d'un perso", "trap": "Piège déclenché", "card": "Carte jouée",
       "event": "Événement affiché", "horde": "Horde de pillards", "relay": "Relais / étourdi", "ultstart": "Début d'ultime", "click": "Clic de menu",
       "unequip": "Terres désolées : retirer un équipement", "equip": "Terres désolées : équiper un objet", "finalhit": "Coup final (avec l'annonce KO)", "heal": "Soin"}
ANN = {"fight": "« Fight » au début du combat", "combo": "Combo complet", "critical": "Coup critique", "event": "Événement", "ko": "KO",
       "finalko": "KO final", "special": "Ultime", "win": "Victoire", "lose": "Défaite", "turn": "Ton tour"}


def dur(p):
    try:
        return round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip()), 2)
    except Exception:
        return None


def build():
    h = open(os.path.join(PUB, "index.html"), encoding="utf-8").read()
    groups = {k: re.findall(r'"([^"]+)"', v) for k, v in re.findall(r'(\w+):\[([^\]]*)\]', re.search(r"const GROUPS=\{(.*?)\};", h, re.S).group(1))}
    alls = set(re.findall(r'"([^"]+)"', re.search(r"const ALL=\[(.*?)\]\)\)\];", h, re.S).group(1)))
    uses = {}
    for g, names in groups.items():
        for n in names:
            uses.setdefault(n, [])
            if USE.get(g, g) not in uses[n]: uses[n].append(USE.get(g, g))
    out = []
    for f in sorted(os.listdir(os.path.join(PUB, "sfx"))):
        if not f.endswith(".mp3"): continue
        n = f[:-4]
        if n in uses: cat, use = "Bruitages", " · ".join(uses[n])
        elif n.startswith("ann_"): cat, use = "Commentateur", ANN.get(n[4:], "Annonce")
        elif n.endswith("_death"): cat, use = "Voix", "Cri de mort"
        elif n in alls: cat, use = "Voix", "Voix de perso (ultime / entrée en jeu)"
        else: cat, use = "Pas utilisés", "Fichier présent mais le jeu ne le joue pas"
        out.append({"f": "sfx/" + f, "n": n, "c": cat, "u": use, "d": dur(os.path.join(PUB, "sfx", f))})
    for f in sorted(os.listdir(os.path.join(PUB, "music"))):
        if f.endswith(".mp3"):
            n = f[:-4]
            u = "Musique de combat" if n.startswith("combat") else {"menu": "Musique du menu", "tournoi": "Musique de tournoi", "halloffame": "Panthéon"}.get(n, "Musique")
            out.append({"f": "music/" + f, "n": n, "c": "Musiques", "u": u, "d": dur(os.path.join(PUB, "music", f))})
    t = open(os.path.join(ROOT, "tools", "sons_template.html"), encoding="utf-8").read()
    open(os.path.join(PUB, "sons.html"), "w", encoding="utf-8", newline="\n").write(t.replace("/*DATA*/[]", json.dumps(out, ensure_ascii=False)))
    return len(out)


if __name__ == "__main__":
    print("sons.html :", build(), "sons")
