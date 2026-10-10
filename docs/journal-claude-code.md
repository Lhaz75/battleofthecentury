# Journal de la session Claude Code (9 et 10 oct. 2026)

Tout ce qui a été fait avec David dans Claude Code, de la v0.99.0 à la v0.99.11, pour qu'une autre conversation puisse reprendre sans rien perdre. À lire après `CLAUDE.md`. Les réglages détaillés du Voyage sont aussi dans `nouveaux-modes.md`, l'état de l'histoire dans `idees-en-attente.md`.

## Les versions, dans l'ordre

| Version | Contenu |
|---|---|
| 0.99.0 | Mode **Voyage** (le « mode RPG »), zone 1 jouable, réservée aux admins et testeurs |
| 0.99.1 | Nouvelles illustrations des punks 2 à 5 |
| 0.99.2 | punk2 « Le Boucher », punk3 « La Massue », punk4 « Le Corbeau » : noms et coups refaits pour coller aux images |
| 0.99.3 | Voyage : 6 objets en plus, fond de carte, décors (événement, bazar, oasis) ; nouvelles illustrations de Rima et Jackal |
| 0.99.4 | Punks 6 à 11 refaits (images, noms, coups), punks 12 à 16 ajoutés, soldats de Ken-Oh, hommes de Galf, geôliers de Cassandra |
| 0.99.5 | Voyage : bouton « Jeter » (retour de maxGfive) ; Dojo : libellés des points clarifiés (retour de Jérôme R.) |
| 0.99.6 | Histoire, arc 2 : chapitres 10 à 16 (Cassandra puis Ken-Oh), découpage donné par David |
| 0.99.7 | Airi accompagne Rei au chapitre 15 |
| 0.99.8 | Kai, Bukoh et Satora au magasin avec Asam (250 ryō chacun) |
| 0.99.9 | Voyage : butin tiré par le serveur, objet la première fois par étape, qualité des objets ★ / ★★ (idées de maxGfive) |
| 0.99.10 | Voyage : « Guide de la zone » dans le jeu (étapes, adversaires, événement, objets et taux) |
| 0.99.11 | Mobile : la flèche ronde de la main de cartes ne reste plus affichée hors combat (bug vu par Jérôme R.) |

Les v0.98.3 et v0.98.4 ont été faites en parallèle par une autre conversation Claude la nuit du 9 oct. C'est ce qui a rappelé la règle : **une seule session à la fois qui pousse sur `main`**.

## Le mode Voyage

Nom en jeu : « Voyage » (EN Journey, IT Viaggio, JA 旅). Idée de maxGfive. Visible seulement si `rpgOpen()` (admin ou testeur). Tout le code est dans `public/index.html`, bloc « voyage (mode RPG) » juste avant `quitPress`, et dans `accounts.js` (constantes `RPG_*` en haut, route `POST /api/rpg`).

**Zone 1, « Les terres désolées »** (`RPG_ZONE`) : village de Mamiya → pillards de Zeed (combat) → le vieil homme (événement) → meute des Kiba (élite) **ou** route des ruines (combat) → bazar **ou** oasis (depuis v0.99.12) → Jagi (boss, avec 2 punks). Southern Cross et Cassandra sont affichés verrouillés, rien derrière.

**Règles**
- Équipe libre (2 à 5 persos, 10 points). Les PV restent d'un combat à l'autre. Un KO le reste jusqu'à l'oasis (+50 % PV, KO relevés à 30 %).
- Défaite ou abandon : le voyage s'arrête, on garde ses objets. On peut relancer tout de suite, sans limite par jour (demande de maxGfive : le mode doit être rejouable « à l'infini »).
- Le voyage en cours est gardé sur l'appareil (`localStorage`, clé `boc-rpg-run`). Le sac et l'équipement sont sur le compte (`stats.rpg`).
- Événement du vieil homme, 3 choix : combat contre 3 punks pour un objet rare ; perdre 4 PV par perso contre +2 de rage au début de chaque combat de la zone ; passer.
- Bazar : 3 objets tirés au départ du voyage (un commun 20 ryō, un peu commun 40, un rare 80). Les ryō sont ceux du compte (points gagnés moins ryō dépensés).

**Objets** (`RPG_ITEMS`, 16 objets, effets inventés par Claude, à ajuster)

| Objet | Place | Rareté | Effet |
|---|---|---|---|
| Bottes du désert | taille | commun | +2 PV max |
| Bandana | tête | commun | rage +1 au départ |
| Bandages | consommable | commun | 6 PV à un perso |
| Gourde | consommable | commun | 3 PV à toute l'équipe |
| Gants cloutés | mains | peu commun | Légers +1 |
| Épaulettes à pointes | taille | peu commun | +4 PV max |
| Casque de pillard | tête | peu commun | +3 PV max |
| Viande séchée | consommable | peu commun | 10 PV à un perso |
| Talisman de Yuria | mains | rare | rage +2 au départ |
| Masque de fer | tête | rare | +5 PV max |
| Ceinturon clouté | taille | rare | Moyens +1 |
| Carte du puits | consommable | rare | 50 % des PV à toute l'équipe |
| Ceinture de l'ermite | taille | épique | +1 endurance par tour |
| Brassard du Nanto | mains | épique | Moyens +2 |
| Épaulette de Shin | taille | mythique | tous les coups +1 |
| Casque de Jagi | tête | légendaire | Lourds +2 |

- 3 places par perso (tête, taille, mains), sac de 24, bouton « Jeter ». Les objets ne marchent que dans ce mode.
- L'Étoile du Grand Chariot et le fouet de Cassandra ont leur icône mais ne sont pas en jeu : ils attendent leur zone.
- **Qualité** : un objet est noté `id~bonus`. 24 % des équipables sortent ★ (`hp1` / `hp2` : +1 ou +2 PV max), 6 % sortent ★★ (`hp3`, ou `lg1` / `my1` / `ld1` : +1 sur un niveau de coup, ou `rg1` : rage +1). Pas de chiffres à virgule : idée de maxGfive écartée d'un commun accord, le combat est en petits entiers.

**Butin et points** (tirés par le serveur depuis la v0.99.9)
- Chaque étape donne un objet **la première fois** (`stats.rpgSeen`), puis seulement 1 point (2 pour l'élite). Le boss lâche des objets **à chaque victoire**.
- Poids par rareté : combat 60 / 30 / 10 ; événement rare garanti ; élite 48 / 35 / 15 / 2 (jusqu'à mythique) ; boss 92 épique / 8 mythique, plus un tirage « combat », plus 10 % pour le Casque de Jagi.
- Points : 6 / 8 / 10 / 25 la première fois (combat / événement / élite / boss), 1 / 1 / 2 / 5 ensuite. Volontairement bas en rejeu : les points donnent les ryō, qui achètent des persos.
- Le serveur refuse tout sac qui contient un objet qu'il n'a pas donné (`rpgWithin`) : le client peut seulement déplacer, utiliser ou jeter.
- Les tables existent en double (client pour l'affichage, serveur pour le tirage) : **à garder en phase**.

**Pas fait dans le Voyage** : autres zones, règles propres à chaque zone, succès, classement, revente des objets (faisable maintenant que le serveur tient le sac), objets ultra rares à 0,1 % (idée de maxGfive), terres sans fin.

## Histoire, arc 2

Chapitres 10 à 16 ajoutés (ids `arc2-10` à `arc2-16`, aussi dans `STORY_ORDER` côté serveur). L'arc reste en test (admins et testeurs).

| N° | Titre | On joue | Adversaires | Débloque |
|---|---|---|---|---|
| 10 | Sur la piste de Toki | Kenshiro, Rei, Mamiya | Seeker, puis Targel avec Bella | — |
| 11 | Les portes de Cassandra | Kenshiro | Raiga & Fūga | Raiga & Fūga |
| 12 | Uighur | Kenshiro | Uighur (boss) | Uighur |
| 13 | Toki | Kenshiro, Raiga & Fūga | geôliers, puis Sōjin | — |
| 14 | La cité des pleurs | Kenshiro, Toki | deux gardiens de Cassandra | — |
| 15 | L'escouade de Ken-Oh | Rei (avec Airi, Bat, Lin) | 3 soldats de Ken-Oh, puis Gallon | — |
| 16 | Ken-Oh | Rei, puis Kenshiro | Ken-Oh (boss) | Ken-Oh |

Mécaniques ajoutées au moteur d'histoire :
- `flee` : un adversaire quitte le combat à la fin du tour où il a attaqué (Bella au chapitre 10). Ce n'est pas un KO.
- `meW` + `fall` : équipe différente par vague, et défaite prévue à la première vague (chapitre 16 : Rei contre un Ken-Oh à 140 PV et rage pleine, puis Kenshiro contre un Ken-Oh à 90 PV). Un texte `st_m_<id>` s'affiche entre les deux.
- `foeHpW`, `foeRageW`, `meHpW` : réglages par vague.
- Compagnon `airi` : 2 dégâts à l'adversaire à chaque tour du joueur, sans jamais l'achever.

Choix faits par Claude et pas encore validés par David : qui on joue aux chapitres 10 à 14, les textes d'intro et de fin, les étoiles, la difficulté (aucun combat joué en entier). Pas de fond d'histoire dédié : Cassandra utilise la carte terrain, les chapitres 15 et 16 réutilisent `story-mamiya`.

Décisions de David : **Raoh** sera la récompense d'un chapitre plus tard dans l'histoire. **Asam et ses trois fils** sont au magasin, leur arc est trop loin. Reste à placer : **Galf** (illustration `galf.png` prête), la couronne de l'arc 2.

## Persos et illustrations

- **Punks** : 16 maintenant (`punk1` à `punk16`). Noms actuels : Le Bide, Le Boucher, La Massue, Le Corbeau, Le Crochet, Le Marteau, Double Lame, Le Fou peint, Crête verte, Le Borgne, Crinière rouge, Le Masque, Crête rouge, Le Surineur, La Faucille, Le Balafré.
- **Soldats** (`SOLDIERS()`), sans technique particulière, bonus de meute +1 comme les punks : `kenohsol1-3` (Le Cornu, Le Coutelas, Masque d'or ; bonus aussi avec Ken-Oh), `galf1-2` (Le Vieux Dogue, La Laisse), `casssol1-3` (Hache, Sabre et Cimeterre de Cassandra ; bonus aussi avec Uighur). Ils apparaissent en Survie aux vagues 5 et 6 et dans l'histoire. Pas encore dans le Voyage (pas de zone pour eux).
- **Nouvelles illustrations intégrées** : punks 2 à 11, Rima, Jackal.
- **Illustrations fournies mais pas intégrées** (dans `D:\Doomstar` chez David) : nouvelles versions de Souther, Ken-Oh, Shu, Falco, Amiba ; `mantisman`, `snakeman`, `goda`, `southermask`, les quatre `homme-jagi`, `galf`, `toki` ; décors `terrain-souther` (portrait), `terrain-amiba`, `pyramide`.
- Les noms et coups de tous ces persos génériques ont été inventés par Claude, en français (règle du projet : pas de japonais inventé).

**Le problème du faux fond transparent** : beaucoup d'images sorties de ChatGPT ont un damier gris et blanc incrusté au lieu d'une vraie transparence. `tools/atelier/clean.py` le retire (remplissage depuis les bords, puis poches enfermées qui ont les deux tons du damier). Résultat propre en général, quelques miettes sur les cheveux fins. Les versions nettoyées sont dans `D:\Doomstar\nettoye\`.

**Formats** : perso 1024×1536 en portrait, fond transparent. Carte terrain en portrait 2:3 (900×1350 en jeu). Décors du Voyage en paysage 16:9 ou 16:10. Icône d'objet carrée, fond transparent.

**Liste d'images à cocher** (objets et décors du Voyage) : https://claude.ai/artifact/3YmbDm4hBzf7A1iecizJsX. Il manque encore `item-bandes-poing`, les fonds de carte Southern Cross et Cassandra, un légendaire pour le boss de Southern Cross, une affiche « Voyage » pour l'accueil, et quatre fonds d'histoire (`story-cassandra`, `story-cassandra2`, `story-mamiya2`, `story-kenoh`).

## Retours des testeurs (Discord)

Traités :
- maxGfive : le sac se remplit sans fin → plafond de 24 déjà là, bouton « Jeter » ajouté.
- Jérôme R. : « bug » des points au Dojo → ce sont deux compteurs (points généraux et points de grade), libellés clarifiés.
- maxGfive : rendre le Voyage farmable → fait en v0.99.9.
- Jérôme R. : bouton rouge qui traîne sur mobile → corrigé en v0.99.11.
- Jérôme R. : fourche bazar / oasis trop tôt → placée juste avant Jagi en v0.99.12.
- Jérôme R. : Jagi annulait l'ultime du boss mondial au tour 5 → décision de David (v0.99.13) : contre le boss mondial, les Aiguilles crachées divisent l'ultime par deux au lieu de l'annuler (2 dégâts au boss quand même). En versus et ailleurs, rien ne change.

En attente (salon `suggestions` et `tests`, lus le 10 oct.) :
- maxGfive : grades du Dojo avec les couleurs des ceintures et une icône. Petit chantier visuel.
- maxGfive : tsubos sur les cartes (bonus critique) ; cartes « finisher » au moment de l'ultime, avec une rage qui monte en orange puis rouge. Gros chantiers, gardés en idées.

Le Discord se lit sans compte via le widget public : `https://e.widgetbot.io/channels/619101513754869780/<salon>` (tests `1555879664407285801`, suggestions `1555897701189820466`, chat-du-jeu `1557770296080076871`). Il ne montre que les derniers messages.

## Méthode de travail et outils

- Il n'y a **pas de Node** sur le PC de David : le serveur ne peut pas être lancé en local. Le client se teste avec `python -m http.server` dans `public/` et Playwright.
- `tools/atelier/` contient les scripts de cette session. Ils ont été écrits pour un dossier de travail temporaire et des chemins `D:/Doomstar/...` : **à adapter avant usage**.
  - `ed.py` : `edit(fichier, [(ancien, nouveau), ...])`, remplace en vérifiant que chaque texte apparaît exactement une fois, et garde les fins de ligne du fichier (`index.html` est en CRLF sur le PC de David).
  - `clean.py` : retire le faux damier d'une illustration de perso.
  - `items.py` : convertit les icônes d'objets (fond retiré, rognées, 256 px webp).
  - `art.py` : installe l'illustration d'un perso (`<id>.webp` 540×810, `bust-<id>.webp`, `face-<id>.webp`) et met à jour le cadrage (`PZ`, `EYES`) et `ART_AT`. Le cadrage se donne à la main : position des yeux et taille du visage, repérées sur une grille.
  - `server_harness.py` : fait tourner le vrai `accounts.js` dans Chromium avec de faux modules, pour tester `/api/rpg` sans Node (butin, anti-triche, achats).
  - `test_rpg.py`, `test_loot.py`, `test_arc2.py` : parcours Playwright du Voyage et de l'arc 2 sur PC, mobile portrait et paysage.
- Chaque version : entrée en tête de `CHANGELOG` (FR / EN / IT / JA), `python tools/export_public.py`, commit, push sur `main`.

## Suite du 10 oct. (autre conversation)

- v0.99.12 : Voyage, fourche bazar / oasis placée juste avant Jagi (Jérôme R.).
- v0.99.13 : boss mondial, les Aiguilles crachées de Jagi divisent l'ultime du boss par deux au lieu de l'annuler.
- v0.99.14 : nouveau terrain **Brasier de Jagi** (`brasier` dans `TERRAINS`) : début de tour, le perso actif perd 1 PV, jamais sous 1, Jagi immunisé (code dans `startTurn`, juste après `let comp=""`). Illustration de David intégrée dans la même version (`terrain-brasier.webp` 900×1350 + `terrain-brasier-c.webp` 270×405, `TERR_ART`, règle CSS `body[data-terr="brasier"]`). Pour un futur terrain : même recette.

- v0.99.15 : hommes de Yuda (`npc:"yuda"`, dans `SOLDIERS()`, bonus de meute aussi avec `narc` (Yuda) et `dagar`) : `yudasol1` Le Chapelet, `yudasol2` La Hallebarde, `yudasol3` L'Étoile du matin, `yudasol4` Le Rieur, `yudasol5` Le Grand Couperet (le « guerrier balafré » : David pense qu'il a un nom officiel, à vérifier). `doubleyuda` Double de Yuda (le leurre de l'histoire) : 1er coup reçu divisé par deux (`f.lure` dans `hurt`). Noms et coups inventés par Claude. Fond d'histoire `story-yuda` (illustration `terrain-yuda.png` de David) : `bg:"yuda"` dans un chapitre. Images source chez David : `sbire-yuda1/2`, `sbire-yuria3/4` (ce sont aussi des hommes de Yuda), `Guerrier balafré à l'épée colossale.png`, `double-yuda.png`. Pas encore utilisés dans un chapitre ni une zone du Voyage.

## Ce qui n'a jamais été vérifié en vrai

- Aucun combat du Voyage ni des nouveaux chapitres n'a été joué en entier : les tests lancent les combats puis forcent la victoire ou la défaite. L'équilibrage est à tester par des humains.
- Le serveur a été testé sur un banc avec une fausse base. En ligne, Jérôme a bien reçu du butin au boss, ce qui montre que la route marche, mais les achats au bazar et le refus des sacs trafiqués n'ont pas été confirmés en vrai.
- Les cadrages des bustes et visages ont été faits à l'œil : à retoucher dans l'outil de cadrage admin si besoin.
