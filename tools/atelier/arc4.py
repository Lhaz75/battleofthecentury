# construit l'arc 4 « Le Dernier Général » dans public/index.html et accounts.js (données : arc4_data.py)
# usage : python3 tools/atelier/arc4.py <dossier de travail avec clean/<id>.png, eyes.json, decors/*.png>
import sys, json, re, os
sys.path.insert(0, os.path.dirname(__file__))
from arc4_data import F, T, ARC, DONE, C
from PIL import Image
SP = sys.argv[1]
P = 'public/index.html'
s = open(P, encoding='utf-8').read()
def rep(a, b, n=1):
    global s
    c = s.count(a); assert c == n, (a[:80], c); s = s.replace(a, b)
js = lambda v: json.dumps(v, ensure_ascii=False)
def tech(t):
    fx = ''
    if len(t) > 4: fx = ', {' + ','.join(f'{k}:{v}' for k, v in t[4].items()) + '}'
    return f'[{js(t[0])}, {t[1]}, {t[2]}, {t[3]}{fx}]'
ids = list(F)
for i in ids: assert f'\n  {i}:{{' not in s, i
# 1. noms et images
names = ''.join(f', {i}:{js(F[i][0])}' for i in ids)
imgs = ''.join(f', {i}:"assets/{i}.webp"' for i in ids)
rep(', shoki:"Shoki" },', ', shoki:"Shoki"' + names + ' },')
rep(', shoki:"assets/shoki.webp" }', ', shoki:"assets/shoki.webp"' + imgs + ' }')
# 2. combattants (après Garo)
block = ''
for i in ids:
    nm, ka, sig, hp, npc, clan, cost, pas, techs, ult, ud, bonus = F[i]
    npcs = f',npc:"{npc}"' if npc else ''
    block += f'  {i}:{{sigil:"{sig}",hp:{hp}{npcs},passive:{js(pas)},\n    techs:[{", ".join(tech(t) for t in techs)}],\n    ult:{{name:{js(ult)},dmg:{ud}}}}},\n'
rep('    ult:{name:"La lame fidèle",dmg:14}},\n', '    ult:{name:"La lame fidèle",dmg:14}},\n' + block)
# 3. coûts et clans
rep('const COST={biao:3,', 'const COST={biao:3,' + ''.join(f'{i}:{F[i][6]},' for i in ids))
rep('const CLAN={biao:"nanto",', 'const CLAN={biao:"nanto",' + ''.join(f'{i}:"{F[i][5]}",' for i in ids))
# 4. bonus par perso
bl = ''
for i in ids:
    b = F[i][11]
    if b: bl += f' if(act(s).id==="{i}" && c.lvl==={b[0]}) d+={b[1]};'
bl += ' if(act(s).id==="jemoni" && act(s).hp<act(s).max/2) d+=2;'
rep('if(act(s).id==="garo" && c.lvl===0) d+=1;', 'if(act(s).id==="garo" && c.lvl===0) d+=1;' + bl)
# 5. meutes : les soldats de Ken-Oh comptent aussi Raoh ; les hommes de Rihaku comptent Rihaku ; les moines comptent Genshō (même npc)
rep('(np==="kenoh" && t.id==="colo")', '(np==="kenoh" && (t.id==="colo"||t.id==="raoh")) || (np==="rihaku" && t.id==="rihaku")')
# 6. décors d'histoire
D = {'shuren': 'chateau-shuren', 'nanto': 'forteresse-nantogoshasei', 'raohfort': 'forteresse-raoh'}
for k, f in D.items():
    Image.open(f'{SP}/decors/{f}.png').convert('RGB').resize((900, 1350), Image.LANCZOS).save(f'public/assets/story-{k}.webp', 'WEBP', quality=84, method=6)
rep('pyramide:"story-pyramide"};', 'pyramide:"story-pyramide"' + ''.join(f',{k}:"story-{k}"' for k in D) + '};')
rep('body[data-terr="pyramide"]{--terrbg:url("assets/story-pyramide.webp")}', 'body[data-terr="pyramide"]{--terrbg:url("assets/story-pyramide.webp")}' + ''.join(f'body[data-terr="{k}"]{{--terrbg:url("assets/story-{k}.webp")}}' for k in D))
# 7. chapitres
i0 = s.index('const STORY_CH=['); j0 = s.index('];', i0)
arr = json.loads(s[i0 + len('const STORY_CH='):j0 + 1])
assert not any(c['id'].startswith('arc4') for c in arr)
for cid, cfg, _ in C:
    c = {'id': cid}; c.update(cfg); c['arc'] = 4; c.setdefault('unlock', []); arr.append(c)
s = s[:i0] + 'const STORY_CH=' + json.dumps(arr, ensure_ascii=False) + s[j0 + 1:]
rep('const ST_TEST=[3];', 'const ST_TEST=[3,4];')
# 8. textes : noms, passifs, techniques (TX = en/it, TXJA = ja), puis l'interface et les chapitres
tx = {}; txja = {}
for i in ids:
    nm, ka = F[i][0], F[i][1]; tx[nm] = [nm, nm]; txja[nm] = ka
for fr, (en, it, ja) in T.items(): tx[fr] = [en, it]; txja[fr] = ja
miss = [x for i in ids for x in [F[i][7], F[i][9]] + [t[0] for t in F[i][8]] if x not in T]
assert not miss, miss
ui = {l: {'stArc4': ARC[l], 'stArcDone4': DONE[l]} for l in ARC}
for cid, cfg, tr in C:
    for l in ui:
        t, a, o = tr[l]; ui[l]['st_t_' + cid] = t; ui[l]['st_i_' + cid] = a; ui[l]['st_o_' + cid] = o
anchor = 'Object.assign(UI.ja,{"stArc3"'
k = s.index(anchor); e = s.index('\n', k)
add = '\nObject.assign(TX,' + js(tx) + ');\nObject.assign(TXJA,' + js(txja) + ');\n' + ''.join(f'Object.assign(UI.{l},{js(ui[l])});\n' for l in ui)
s = s[:e] + add.rstrip('\n') + s[e:]
open(P, 'w', encoding='utf-8').write(s)
# 9. serveur
a = open('accounts.js', encoding='utf-8').read()
x = 'const STORY_TEST = /^arc3-/;'; assert a.count(x) == 1; a = a.replace(x, 'const STORY_TEST = /^arc3-|^arc4-/;')
x = '"arc3-13", "arc3-14"];'; assert a.count(x) == 1; a = a.replace(x, '"arc3-13", "arc3-14", ' + ', '.join(f'"{c[0]}"' for c in C) + '];')
open('accounts.js', 'w', encoding='utf-8').write(a)
# 10. illustrations (540x810, buste, miniature, cadrage PZ / EYES)
from art import put
E = json.load(open(f'{SP}/eyes.json'))
put(SP, {i: tuple(E[i]) for i in ids})
print('ok', len(ids), 'persos,', len(C), 'chapitres')
