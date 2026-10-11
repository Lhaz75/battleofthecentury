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
- L'Étoile du Grand Chariot, le fouet de Cassandra et la **Ceinture de KING** (`item-ceinture-king.webp`, icône de David du 10 oct.) ont leur icône mais ne sont pas en jeu : ils attendent leur zone. Ceinture de KING = légendaire du boss de Southern Cross (**Shin**, décision de David), place taille, effet prévu Légers +2 (pendant du Casque de Jagi, Lourds +2), à lâcher comme le Casque de Jagi sur le boss de zone.
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
- **Intégrées le 10 oct. au soir (v0.99.25)** : nouvelles versions de Souther (`emp`), Ken-Oh (`colo`), Shu (`aveugle`), Falco (`general`), Amiba, depuis `D:\Doomstar\nettoye\`. `toki.png` était déjà en jeu depuis le 3 oct.
- **Illustrations fournies mais pas intégrées** (dans `D:\Doomstar`, versions propres dans `nettoye\`) : `mantisman`, `snakeman`, `goda`, `southermask`, les quatre `homme-jagi`, `galf` (persos à créer, pas de fiche) ; décors `terrain-souther` (portrait), `terrain-amiba`, `pyramide`.
- Les noms et coups de tous ces persos génériques ont été inventés par Claude, en français (règle du projet : pas de japonais inventé).

**Le problème du faux fond transparent** : beaucoup d'images sorties de ChatGPT ont un damier gris et blanc incrusté au lieu d'une vraie transparence. `tools/atelier/clean.py` le retire (remplissage depuis les bords, puis poches enfermées qui ont les deux tons du damier). Résultat propre en général, quelques miettes sur les cheveux fins. Les versions nettoyées sont dans `D:\Doomstar\nettoye\`.

**Formats** : perso 1024×1536 en portrait, fond transparent. Carte terrain en portrait 2:3 (900×1350 en jeu). Décors du Voyage en paysage 16:9 ou 16:10. Icône d'objet carrée, fond transparent.

**Liste d'images à cocher** (objets et décors du Voyage) : https://claude.ai/artifact/3YmbDm4hBzf7A1iecizJsX. Il manque encore les fonds de carte Southern Cross et Cassandra, une affiche « Voyage » pour l'accueil, et quatre fonds d'histoire (`story-cassandra`, `story-cassandra2`, `story-mamiya2`, `story-kenoh`).

## Retours des testeurs (Discord)

Traités :
- maxGfive : le sac se remplit sans fin → plafond de 24 déjà là, bouton « Jeter » ajouté.
- Jérôme R. : « bug » des points au Dojo → ce sont deux compteurs (points généraux et points de grade), libellés clarifiés.
- maxGfive : rendre le Voyage farmable → fait en v0.99.9.
- Jérôme R. : bouton rouge qui traîne sur mobile → corrigé en v0.99.11.
- Jérôme R. : fourche bazar / oasis trop tôt → placée juste avant Jagi en v0.99.12.
- Jérôme R. : Jagi annulait l'ultime du boss mondial au tour 5 → décision de David (v0.99.13) : contre le boss mondial, les Aiguilles crachées divisent l'ultime par deux au lieu de l'annuler (2 dégâts au boss quand même). En versus et ailleurs, rien ne change.

En attente (salon `suggestions` et `tests`, lus le 10 oct.) :
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

- v0.99.16 : ceintures du Dojo (idée de maxGfive) : `dojoBelt(r)` / `beltSVG(r,largeur)`, blanche (novice), jaune, orange, verte, bleue, marron (2 kyu chacune), noire + barrettes dorées (1 par dan), rouge (Maître). Affichées en tête du Dojo, sur les 3 adversaires, sur l'accueil (onglet Dojo) et dans le classement du Dojo.

- v0.99.17 : textes des objets (Jérôme R.) : `rpgFx` affiche l'effet de base en premier (le bonus de qualité s'y ajoute s'il est du même type, ex. Masque de fer ★ → « PV max (+7) »), puis le bonus ★ s'il est différent, séparés par « - ».

Retours Discord du 10 oct. (après-midi), pas encore traités :
- Finishers (maxGfive + Jérôme R.) : plusieurs ultimes par perso, rage qui continue en orange puis rouge, choix de l'ultime en construisant le deck. Gros chantier, en discussion.

- v0.99.18 : Dojo, les ceintures sont remplacées par la Grande Ourse (Jérôme R. trouvait que la ceinture ne collait pas à l'univers) : `starsSVG(r,largeur,{anim,nw})`. Version finale (v0.99.19, la v0.99.18 a été remplacée avant d'être vue) : 3 tours de 7 étoiles = 21 grades, les étoiles s'allument une à une en bronze, puis passent en argent, puis en or ; au Maître la constellation se trace en or. David ne voulait pas de rouge. Animation (`anim`) seulement sur les grandes versions (tête du Dojo, accueil, écran de victoire) : scintillement, poussière d'étoiles ; `nw` = flash de l'étoile gagnée à la montée de grade. Coupée si « réduire les animations ». Les noms kyu / dan ne changent pas. **Retour arrière possible** : `const DOJO_ICON="belt"` remet les ceintures (`beltSVG` gardé), choix de David « si c'est moche ».

- v0.99.20 : objet **Bandes de poing** (`bandes-poing`, commun, mains, PV max +2 ; effet choisi par Claude, à ajuster), icône fournie par David le 10 oct. Ajouté dans `RPG_ITEMS`, `RPG_ART`, les noms FR/EN/IT/JA, et côté serveur dans `RPG_IT` et `RPG_SHOP` (20 ryō). Il y a maintenant 17 objets.

## Voyage, zone 2 Southern Cross (v0.99.21)

- Le Voyage est multi-zones : `RPG_ZONES` (client) remplace `RPG_ZONE`, `RZ()` donne la zone du voyage en cours, `rpgZoneOk(z)` dit si elle est ouverte (`need` = étape à avoir battue, lue dans `stats.rpgSeen`). Côté serveur, `RPG_ZONES` dans `accounts.js` (étapes qui donnent du butin, `need`, légendaire `leg` du boss) ; `/api/rpg` reçoit `zone` et refuse une zone fermée (403). Clés `rpgSeen` = `zone:étape`.
- Au départ d'un voyage, `rpgZones(sel)` affiche le choix de la zone (« Où partir ? ») dès que la zone 2 est ouverte ; sinon on part direct en zone 1.
- **Zone 2 `sc`, Southern Cross** (boss **Shin**, décision de David : Souther n'est pas là) : départ → Spade (combat, Spade + 2 punks) → le village du tribut (événement, mêmes choix que le vieil homme avec d'autres textes, clés `rpgEv*_sc`) → Diamond (élite) **ou** Club (combat, le pont) → bazar **ou** oasis → Heart (élite) → Shin (boss, avec Joker et un punk, PV ×1,5, IA 0,9). PV des adversaires ×1,1 à ×1,2. Cassandra affichée verrouillée.
- Textes propres à une zone : suffixe `ev` de la zone (`_sc`), lus avec `zk(clé)`. Nœud qui s'affiche sous un autre nom : `nm` (le départ de la zone 2 = `sc_start`).
- Légendaire du boss : `leg` (Casque de Jagi en zone 1, **Ceinture de KING** en zone 2, 10 %). Le guide n'affiche que le légendaire de la zone.
- Fond de carte `rpg-carte-sc.webp` (dessiné par David), décalé à droite (`background-position:72%`) pour garder la ville sur mobile.
- Choix de Claude à valider : le parcours, les noms d'étapes, les textes, la difficulté. L'événement réutilise l'image du vieil homme : il manque une image `rpg-village-king` (paysage 16:9). Pas encore de règle propre à la zone (idées : Yuria, les 7 cicatrices).
- Testé avec le vrai serveur (Node) : zone 2 refusée avant Jagi, butin OK, Ceinture de KING ~10 % sur Shin. Parcours complet de la zone 2 en Playwright sur PC, mobile portrait et paysage.

- v0.99.22 : **ordre des zones décidé par David** (ordre du manga) : zone 1 Southern Cross (Shin), zone 2 les terres de Mamiya, zone 3 Cassandra, zone 4 Yuda, zone 5 Ken-Oh. Difficulté échangée (Southern Cross devient la plus facile). La zone 2 s'ouvre en battant Shin ; `need` accepte une liste, et `mamiya:jagi` y est gardé pour que les testeurs qui avaient battu Jagi gardent l'accès. David voudrait idéalement **Kiba Daioh** en boss de la zone 2 (question posée sur la place de Jagi).

- v0.99.23 : décision de David : **Kiba Daioh** est le boss de la zone 2 (« Les terres de Mamiya », nœud `daioh`, Kiba Daioh + 2 Kiba) et **Jagi aura sa propre zone, la 3**, avant Cassandra. Ordre final : 1 Southern Cross (Shin), 2 terres de Mamiya (Kiba Daioh), 3 Jagi, 4 Cassandra, 5 Yuda, 6 Ken-Oh. En attendant la zone 3, la zone 2 n'a pas de légendaire (`leg:null`) et le Casque de Jagi ne tombe plus ; il reviendra avec la zone de Jagi (carte à faire, hommes de Jagi `homme-jagi1-4` à intégrer). Il faudra un légendaire pour Kiba Daioh.

- v0.99.24 : le mode « Voyage » est renommé **« Les terres désolées »** (choix de David ; EN The Wasteland, IT Le terre desolate, JA 荒野). Seuls les libellés changent (`rpgBtn`, `rpgTitle`, `rpgZoneK*`, `hmd_rpg`) : dans le code et les docs, c'est toujours `rpg` / « Voyage ». Le mot « voyage » reste pour une partie (« Nouveau voyage », « Abandonner le voyage »).

- v0.99.26 : 2 planches de David (bottes et casques en 4 versions : normale, élite, mythique, légendaire), choix de David « 4 objets différents ». Bottes (place taille, comme les Bottes du désert) : `bottes-cuir` peu commun (PV max +3), `bottes-ferrees` épique (PV +3, Légers +1), `bottes-sang` mythique (PV +2, Légers +1, Lourds +1), `bottes-lion` légendaire = **icône rangée, pas en jeu** (pour un boss futur). Casques (tête) : `casque-pointes` peu commun (PV +1, rage +1), `heaume-noir` épique (PV +4, Lourds +1), `heaume-sang` mythique (rage +2, Lourds +1), `heaume-daioh` **Heaume du Grand Roi**, légendaire de Kiba Daioh (Moyens +2, 10 %, `leg` de la zone 2). Effets choisis par Claude. Bottes de cuir et Casque à pointes vendus au bazar (40 ryō). Il y a 24 objets en jeu.

- v0.99.27 : objets pour les mains (planches de David du 11 oct.) : `bandes-cloutees` peu commun (PV +1, Légers +1, bazar 40 ryō), `bandes-rouges` épique (Moyens +1, rage +1), `bandes-lion` mythique (PV +2, Légers +1, Moyens +1), `gantelets-pointes` épique (Légers +1, Lourds +1), `gantelets-sang` mythique (PV +2, Lourds +1, rage +1). **Légendaires rangés, pas en jeu** (attendent un boss) : `gantelets-lion`, `bandes-azur`, `bottes-lion`. Le lion revient sur 3 objets (bottes, gantelets, bandes) : idée possible d'un set du Lion pour un boss futur. Icônes découpées avec `split.py` (nettoyage de toute la planche puis composantes connexes, étiquettes ÉLITE / MYTHIQUE / LÉGENDAIRE effacées). 29 objets en jeu.

- v0.99.28 : **5 places d'équipement** (décision de David) : `RPG_SLOTS=["head","body","waist","hands","feet"]`. Bottes → `feet`, épaulettes (dont celle de Shin) et plastrons → `body`, ceintures restent `waist`. `rpgFixSlots` range tout seul un objet équipé à une ancienne place (ou le remet au sac si la place est prise). Côté serveur, `rpgClean` accepte les 5 places. Nouveaux plastrons : `plastron-rouille` peu commun (PV +4, bazar 40 ryō), `plastron-ferre` épique (PV +5, Moyens +1), `plastron-sang` mythique (PV +4, Moyens +1, Lourds +1). Légendaire rangé : `cuirasse-fauve` (fauves dorés et chaînes). 32 objets en jeu.

- v0.99.29 : épaulières (place corps) : `epauliere-cloutee` peu commun (PV +2, rage +1), `epauliere-ferree` épique (PV +3, Lourds +1), `epauliere-sang` mythique (PV +2, Moyens +1, rage +1). Rangés, pas en jeu : `epauliere-lion` (set du Lion avec bottes, gantelets, bandes du lion et la cuirasse aux fauves → idée : panoplie de Ken-Oh) et **`epaulette-rei`, l'Épaulette de Rei** : légendaire de **Yuda** (décision de David), à mettre en `leg` de la zone de Yuda quand elle existera (effet à décider, idée : Légers +1, Moyens +1). 35 objets en jeu.

- v0.99.30 : consommables `remede-medicine` rare (18 PV à un perso, bazar 80 ryō) et `eau-pure` épique (nouvelle mécanique `revive:.4` : relève le perso choisi à 40 % s'il est KO, sinon `heal` 8 PV). Seul objet qui relève un KO hors de l'oasis. 37 objets en jeu. Prompts des prochains objets (consommables, ceintures, jambières, légendaires d'Amiba / Souther / Raoh, bandana de Bat, ruban de Lin, masque de Jagi) donnés à David le 11 oct.

- v0.99.31 : consommables à pouvoir. `grenade` rare (`bomb:6` : `r.bomb` gardé dans le voyage, appliqué dans `rpgPrep` au 1er adversaire, jamais sous 1 PV, message au 1er tour via `S.bombMsg` ; une seule grenade armée à la fois). `tsubo-toki` mythique (`tsubo:.4, revive:.25` : toute l'équipe +40 %, KO relevés à 25 %, une fois par voyage grâce à `r.tsubo`). 39 objets en jeu.

- v0.99.32 : consommable `essence` (Jerrican d'essence) peu commun (`fuel` : `r.fuel`, le prochain combat commence avec `st.terrain="brasier"`, message au 1er tour, se cumule avec la grenade), bazar 40 ryō. 40 objets en jeu.

- v0.99.33 : ceintures (planche 3 choisie par Claude, validée par David, + la ceinture à cartouchières de la planche 2) : `ceinture-munitions` commun (PV +2, bazar 20), `ceinture-cuir` peu commun (PV +3, bazar 40), `ceinture-lion` épique (PV +3, Moyens +1), `ceinture-crane` mythique (Légers +1, Lourds +1, rage +1). Rangée : `ceinture-nanto` (légendaire or à l'étoile du Nanto, idée : boss Souther). 44 objets en jeu.

- v0.99.34 : jambières (place pieds, famille « blindage » : PV et Lourds, pas de Légers ; les bottes restent « mobilité ») : `jambieres-rouille` peu commun (PV +4), `jambieres-pointes` épique (PV +5, Lourds +1), `jambieres-sang` mythique (PV +4, Moyens +1, Lourds +1). Rangée : `jambieres-soleil` (légendaire or aux flammes et au soleil). David : « on verra ensuite » pour le doublon bottes / jambières. 47 objets en jeu.

- **Légendaires rangés (icônes prêtes, pas en jeu), à donner aux boss des zones futures** : `couronne-empereur` Couronne de l'Empereur → **Souther** (tête, idée : Lourds +2 ou rage +2) ; `ceinture-nanto` → Souther aussi possible ; `epaulette-rei` → **Yuda** ; `fouet-cassandra` → Uighur ; `cape-raoh` **Cape de Raoh** → **Ken-Oh** (place corps, idée : rage +2 et Lourds +1, ou un pouvoir) ; set du Lion (`bottes-lion`, `gantelets-lion`, `epauliere-lion`, `cuirasse-fauve`) → idée Ken-Oh aussi ; `bandes-azur` à attribuer ; `jambieres-soleil` ; `etoile-chariot`. Ajouter un objet = entrée dans `RPG_ITEMS` + `RPG_ART` + noms FR/EN/IT/JA (`rpgItems`) + `RPG_IT` dans accounts.js, puis `leg:` de la zone.

- v0.99.35 : **Bandana de Bat** (`bandana-bat`, tête, épique, PV +2, `steal:1`) : premier objet à pouvoir en combat. Dans `startTurn`, si `S.rpg` et qu'un perso debout le porte : une fois par combat, au début du 2e tour du joueur, vole une carte commune (ni perso, ni réaction) dans la main adverse, sinon dans sa pioche. Même texte que Bat dans l'histoire (`batSteal`). `cape-raoh` (Cape de Raoh) rangée pour Ken-Oh. Amiba n'utilise PAS d'aiguilles (correction de David) : son légendaire sera plutôt le déguisement du faux Toki. 48 objets en jeu.

- v0.99.36 : **Ruban de Lin** (`ruban-lin`, tête, épique, PV +1, `mend:1`) : dans `rpgAfter`, après une victoire, si un perso debout le porte, toute l'équipe debout récupère 3 PV (message `rpgLinHeal` sur l'écran de fin). Si le porteur est KO, rien. Halo rouge de l'image de David retiré (érosion de l'alpha + pixels rouge vif). Le « masque de Jagi » proposé par Claude faisait doublon avec le Casque de Jagi existant : abandonné. 49 objets en jeu.

- v0.99.37 : 6e place **`relic` (Relique)** (décision de David) : objets fétiches et objets à pouvoir, un seul par perso. `talisman-yuria`, `bandana-bat`, `ruban-lin` y passent. Migration : `rpgFixSlots` relancé une fois (`v.fixed=3`). Prévu en Relique : le livre d'Amiba (vieux traité chinois des points de pression, que David dessine ; idée : Lourds +3 mais 1 PV perdu par Lourd joué), l'Étoile du Grand Chariot.

- **Traité d'Amiba** (`livre-amiba`, relique, légendaire, Lourds +3, `backlash` : chaque Lourd joué coûte 1 PV au frappeur, jamais sous 1 ; code dans `attack`). Défini et testable, mais **ne tombe nulle part** tant que la zone d'Amiba n'existe pas (les légendaires ne sortent que via `leg` d'une zone). Illustration de David : vieux traité chinois « 經絡要訣 ».

- v0.99.38 : **page admin « Terres désolées »** (`renderRpgAdmin`, bouton dans l'encadré admin du compte) : onglets Objets (toutes les icônes, effets, taux par type d'étape, bazar, légendaire de quelle zone, + `RPG_STORED` = icônes rangées pas en jeu avec le boss prévu), Zones (étapes, adversaires, IA, PV, points, ouverture), Règles. Tout est calculé depuis le code. **À tenir à jour** : `RPG_STORED` quand un objet rangé entre en jeu. Bug corrigé : le bazar tirait parmi tous les objets communs à rares, alors que le serveur n'accepte que `RPG_SHOP` ; ajout de `RPG_SHOPLIST` côté client (copie de `RPG_SHOP`, à garder en phase).

## Ce qui n'a jamais été vérifié en vrai

- Aucun combat du Voyage ni des nouveaux chapitres n'a été joué en entier : les tests lancent les combats puis forcent la victoire ou la défaite. L'équilibrage est à tester par des humains.
- Le serveur a été testé sur un banc avec une fausse base. En ligne, Jérôme a bien reçu du butin au boss, ce qui montre que la route marche, mais les achats au bazar et le refus des sacs trafiqués n'ont pas été confirmés en vrai.
- Les cadrages des bustes et visages ont été faits à l'œil : à retoucher dans l'outil de cadrage admin si besoin.

### v0.99.39 — Collier de crocs du Grand Roi
- Illustration de David : collier de crocs = **légendaire de Kiba Daioh** (`collier-crocs`, relique, `leg` de la zone mamiya côté client et serveur). Effet **défensif** demandé par David, d'après la technique de Kiba Daioh (Kazan Kōgai Kohō, corps d'acier) : PV max +3, `steel` : chaque coup encaissé par le porteur est réduit de 1 (dans `attack()`, à côté du passif de Kiba, terres désolées seulement). Une 1re version offensive (KO = +4 PV, +2 rage) a été abandonnée avant toute partie.
- L'ancien légendaire `heaume-daioh` reste en jeu (ceux qui l'ont le gardent) mais ne tombe plus nulle part ; renommé **Heaume d'or** (4 langues), à attribuer à un futur boss.

### v0.99.40 — Kazan Kōgai Kohō
- Vérifié (pixiv百科, hokuto.fandom, Yahoo知恵袋) : 華山鋼鎧呼法 se lit かざんこうがいこほう → **Kohō** ; le passif et le collier écrivaient « Kōhō », corrigé partout. Ultime **Kazan Kakuteigi** (華山角抵戯) = canon manga : c'est le style de Kiba Daioh (Ken le cite comme une des sources du sumo), Kōgai Kohō en est l'arcane. **Kazan Gunrō Ken** (sa technique Moyenne en jeu) vient du jeu officiel *Hokuto no Ken 7* (lancer ses fils) : autorisé par la règle (jeux officiels). Lore corrigé.

### v0.99.41 — ultime de Kiba Daioh
- Règle de David : un ultime = une technique ultime, jamais le nom d'une école ou d'un style. Kazan Kakuteigi (style) retiré ; ultime = **Kazan Kōgai Kohō** (seule technique nommée de Kiba Daioh dans le manga) ; son Lourd devient « Étreinte du Grand Roi » (français, coup sans nom canon). Passif inchangé.

### v0.99.42 — revue des ultimes + carte zone 2
- Revue de tous les ultimes au nom japonais (sous-agent, sources pixiv / fandom / altema ReVIVE). Corrigés : Amiba → Hikō Gekishinkō (son Moyen devient « Piqûre du génie »), Ryuga → Tenrō Tōga Ken (son Léger devient « Morsure du loup céleste »), Jūkei → Shungeki no Hakō (ReVIVE), Solia → Gento Ryūrin Kōzan (son Moyen devient « Anneau tranchant »), et en français faute de technique canon : Raiga & Fūga « Colère du vent et de la foudre », Frères Harn « Serres des faucons jumeaux », Wei « Héritage du fondateur », Dagar « Déchirure des ailes jumelles », Shura sans nom « Morsure de l'araignée des sables ». JA : Ryuken 北斗仙気雷弾 (était en katakana), Liu Feiyan 流飛燕 (pas 劉).
- En attente : **Satora et Bukoh** (ni perso ni ultime trouvés en ligne, demander à David d'où ils viennent). Des techniques (pas ultimes) portent encore un nom de style : Ryuga « Taizan Tenrō Ken » (Lourd), Dagar « Nanto Hiyoku Ken », Feiyan « Kyokujūji Seiken ».
- Carte de la zone 2 (illustration de David) : `assets/rpg-carte-mamiya.webp` remplacée (1280×720), `.rgmap.z-mamiya` cadrée à 80 %. Kiba Daioh déplacé sur le volcan (81, 27), le bazar (66, 44), le verrou de Jagi (90, 60).
