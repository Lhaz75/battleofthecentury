# Battle of the Century — CLAUDE.md

Fan game gratuit et non monétisé de **Hokuto no Ken / Soten no Ken** : jeu de baston en cartes dans le navigateur, versus en ligne, comptes joueurs. Créé par David (alias **Lhaz** / **Dave**, admin de hokutolegacy.com) avec Claude. Nom de travail historique : **Doomstar**.

Version actuelle : **v0.99.13** (10 oct. 2026). Bêta de test (0.x), la 1.0 = sortie officielle.

Les idées en cours et le backlog sont dans :
- `docs/idees-en-attente.md` — état du mode histoire, magasin, testeurs, boss mondial, déjà-faits à ne plus proposer
- `docs/journal-claude-code.md` — journal complet de la session Claude Code des 9 et 10 oct. (v0.99.0 à v0.99.11) : à lire pour reprendre
- `docs/nouveaux-modes.md` — Dojo (fait en v0.98.0), mode RPG/Voyage (zone 1 en test depuis v0.99.0), Survie v2, objets, Raid du soir, 2V2 (pas encore codés)

---

## Comment travailler avec David

- Il parle français argotique, réponses courtes et directes, pas de blabla. Rapports de bug en rafale, un par un.
- **Chaque modif = une version** : nouvelle entrée en tête de `CHANGELOG` dans `public/index.html`, textes en **FR / EN / IT / JA**, puis `python3 tools/export_public.py`, commit, push sur `main` (Render redéploie tout seul).
- **Vérifier soi-même avant de dire « c'est fait »** : captures Playwright (PC, mobile portrait, mobile paysage).
- Crédite les testeurs dans le changelog quand l'idée/le bug vient d'eux (maxGfive, Jérôme R., Mordikar).
- Envoie les fichiers en vrac, **pas de zip**.
- Ses images de persos (fond transparent, générées avec ChatGPT, pas Midjourney) sont dans `D:\Doomstar` sur son PC. C'est le jeu qui ajoute bordure et fond.

## Règles de design fixées par David

- Vrais noms des persos (fan game, pas d'écran de renommage). Macrons, pas d'accents circonflexes (Ryūken, Kōken…). « Ken-Oh » et pas Raoh dans les textes.
- Noms de techniques/ultimes : **nom japonais d'origine seulement s'il existe dans le canon** (manga, anime, jeux officiels). Jamais de japonais inventé ; les coups génériques/inventés restent en français.
- Disclaimers obligatoires : non monétisé, illustrations générées par IA, version de test.
- Navigateur uniquement (pas d'exe). Compte obligatoire pour jouer.
- Pas de sons ripés de Ken's Rage dans le jeu public.
- Les objets du futur mode RPG ne marchent **que** dans ce mode, jamais en versus.
- Testeurs (Jérôme R., maxGfive, Mordikar) restent testeurs après la 1.0 : ils voient les arcs en test, sans récompenses ni trophées de ces arcs.
- À la 1.0 : verrouillage des persos activé, tout le monde repart à zéro (petit cadeau possible aux testeurs), persos verrouillés interdits en versus.

## Stack et hébergement

- Dépôt : **github.com/Lhaz75/battleofthecentury** (branche `main`, déploiement auto).
- Hébergement : **Render** (offre gratuite, `render.yaml`, s'endort après 15 min) → https://battle-of-the-century.onrender.com
- Base : **Postgres Neon** via `DATABASE_URL` (tables `boc_users`, `boc_sessions`, `boc_tourneys`… créées au démarrage). Sans `DATABASE_URL` → fichier local `data/accounts.json`.
- Variables d'env : `DATABASE_URL`, `ADMINS` (pseudos séparés par des virgules, ex. `Dave`), `MAINTENANCE=1`, `PORT`, `ASSET_CDN`, `ACCOUNTS_FILE`, `DATA_FILE`.
- Node 18+, dépendances : `ws`, `pg`. Lancer : `npm install && npm start` → http://localhost:8080
- Communauté : hokutolegacy.com, facebook.com/hokutolegacy, Discord https://discord.gg/TfZEBzT9vg

## Structure du code

```
server.js        serveur HTTP + WebSocket (versus en ligne, /api/ch/, /api/mm/, /api/voice, fichiers statiques)
accounts.js      comptes, scores, Elo, admin, maintenance, magasin, histoire côté serveur
matchmaking.js   file d'attente / lobby versus
tourney.js       tournois (4 ou 8 places, code à 5 lettres)
public/index.html  ~1,2 Mo : TOUT le client (données, moteur de combat, IA, UI, i18n)
public/assets/   illustrations (<id>.webp, bust-<id>.webp, assets/hd pour les ultimes)
public/music, public/sfx   sons
public/fighters.json, rules.json, changelog.json   générés, lus par hokutolegacy.com (CORS ouvert)
public/sw.js     service worker (version du cache générée)
tools/export_public.py   régénère package.json, CHANGELOG.md, sw.js et les JSON publics (Playwright + Chromium)
tools/atelier/   scripts de la session Claude Code (nettoyage des images, cadrage, banc de test du serveur) : chemins à adapter, voir docs/journal-claude-code.md
```

Repères dans `public/index.html` (numéros de ligne approximatifs, v0.97.16) :
- `FIGHTERS` (~2324), `TRAPS` (~2724), `TERRAINS` (~2863)
- `RAGE_MAX = 8, HAND = 6, ENDURANCE = 5` (~3047)
- `CHANGELOG` (~4823) — sa première entrée donne `APP_VERSION`
- `DC_CHAT` (~5846) — chat Discord WidgetBot
- `ST_TEST` (arcs en test), `ST_UNLOCK_ALL` (false en bêta, true pour la 1.0), `CHAR_START`, `CHAR_SHOP`, `STORY_CH` (~5966-5986)
- `SURV` (~6110) — mode Survie ; `DOJO` juste après (`DOJO_T`, `dojoPrep`, `/api/dojo` côté serveur)
- `RPG` — mode Voyage, juste avant `quitPress` (`RPG_ITEMS`, `RPG_ZONE`, `rpgPrep`, `/api/rpg` côté serveur) ; visible des admins et testeurs seulement (`rpgOpen()`)

Côté serveur (`accounts.js`) : `STORY_TEST` (regex `/^arc2-/`), `SHOP_START`, `SHOP_LIST`, `SHOP_COST`, `STORY_ORDER` (ajouter chaque nouveau chapitre ici, dans l'ordre).

⚠️ Les ids internes des persos ne sont pas leurs noms (ex. `maitre`, `sage`, `linh`…) : toujours vérifier dans `FIGHTERS`.

## Boucle de dev qui marche

```bash
git clone https://github.com/Lhaz75/battleofthecentury && cd battleofthecentury
cd public && python3 -m http.server 8811 &   # le client tourne sans le serveur Node pour les tests solo
```

- Éditer `index.html` avec des remplacements **qui vérifient le nombre d'occurrences avant de remplacer** (beaucoup de chaînes se répètent) — pattern `rep(s, a, b, n=1)` : `assert s.count(a)==n`.
- Tests Playwright (Python, Chromium) : simuler la connexion dans la page (`ACC.on=true; ACC.user={admin:true,stats:{...}}`), puis `MODE="solo"; ME="p"` et lancer un combat direct avec `newGame(team, foe, prep)`.
- Après la modif : entrée `CHANGELOG` (fr/en/it/ja) → `python3 tools/export_public.py` → commit → push.
- Une seule session à la fois qui pousse sur `main` (il y a déjà eu un conflit entre deux sessions).

## Ce que contient le jeu (résumé)

- **Combat** : équipes de 2 à 5 persos en relais, budget de 10 points (coût 1 à 5 par perso). Cartes Légère/Moyenne/Lourde propres à chaque perso, combos (Enchaînement) avec bonus, barre de rage à 8 segments → ultime, cartes terrain et pièges liés au lore, passifs, spéciales et **liens** entre persos (ex. Frères de sang Toki/Ken-Oh, Kenshiro/Hyō). Relais gratuit au premier tour.
- **Modes** : Entraînement contre l'IA (4 niveaux, choix de l'adversaire), Versus en ligne (matchmaking + code d'invitation, « Here comes a new challenger »), Tournoi, Survie, **Dojo** (combats sans fin, grades novice → Maître), **Voyage** (mode RPG, zone 1 en test : carte, butin, équipement), Arcade (tour), Défi du jour, Défi de la semaine, **Boss mondial** hebdo (PV partagés, essais limités, Devil Rebirth en premier), **Mode histoire** (arc 1 « KING » 9 chapitres avec 3 étoiles, arc 2 « Les frères de Hokuto », 16 chapitres jusqu'à Ken-Oh, en test réservé admins/testeurs).
- **Comptes** : profil, avatar, decks sauvegardés, points/Elo/rang, succès, Hall of Fame, ryō + magasin de persos (prêt, coupé pour les joueurs en bêta), « Mes cartes » (3 terrains + 3 pièges).
- **Admin** : gestion des comptes, rôle testeur, maintenance, outil de cadrage des illus (miniature + combat + ultime), « Boss : +1 essai ».
- **Divers** : ~90+ persos (dont Soten no Ken), voix d'ultime par perso, sons, vibrations mobile, appui long pour inspecter un réserviste, chat Discord intégré, tutoriel, pages Nouveautés/Codex, interface FR/EN/IT/JA.

## Prochaines étapes probables

Lire d'abord `docs/journal-claude-code.md` : tout ce qui a été fait du 9 au 10 oct. (v0.99.0 à v0.99.11), les décisions de David, ce qui n'a pas été vérifié et les retours de testeurs en attente.

Fait depuis : mode Voyage zone 1 (butin côté serveur, qualité des objets, guide de la zone), arc 2 chapitres 10 à 16 (Cassandra puis Ken-Oh), Airi, 16 punks, soldats de Ken-Oh / Galf / Cassandra. À venir : retours Discord en attente (ceintures du Dojo), autres zones du Voyage, Survie v2, placer Galf, couronne de l'arc 2, Raoh en récompense d'un chapitre futur, illustrations fournies mais pas intégrées.
