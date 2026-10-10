# Battle of the Century — nouveaux modes (notes du 8 oct.)

Idées sorties du Discord (maxGfive, Jérôme R.) et discutées avec David. Le Dojo est codé (v0.98.0), le reste non.

## Ordre prévu
1. **Dojo** (petit chantier, PvE sans fin tout de suite)
2. **Survie v2** façon Jérôme (sans butin au début)
3. **Mode RPG / Voyage** (gros chantier, par étapes ; le butin arrive avec lui)
4. Plus tard : **Raid du soir** (événement en direct), **2V2 en duo**

David prépare les icônes d'objets en parallèle (voir « Objets » plus bas).

## 1. Dojo (idée de maxGfive, inspirée du Ghost Battle de Tekken 6)
- Combats contre l'IA sans fin. À chaque fois, 3 adversaires proposés (équipes IA avec un nom de « disciple » et un grade) : facile / moyen / costaud.
- Plus l'adversaire est gradé, plus il est dur et plus il rapporte de ryō (branché sur le magasin de persos existant).
- Victoire : ryō + le grade monte. Défaite : le grade baisse un peu, on relance quand on veut.
- Grades : novice → 10e kyu … 1er kyu → 1er dan … 9e dan → Maître. Affiché sur le profil + classement.
- **Fait en v0.98.0** (ouvert à tous les joueurs). Réglages, tous à ajuster après les retours :
  - 4 points par grade, 21 grades (0 novice … 20 Maître ; au-delà les points continuent pour le classement). Victoire +1 / +2 / +3 points (facile / moyen / costaud), défaite ou abandon −1.
  - L'adversaire facile a 2 grades de moins que toi, le costaud 2 de plus. Son grade règle le budget d'équipe (5 à 10), le nombre de persos, les réactions de l'IA, ses PV (×0,78 à ×1,3) et sa rage de départ à haut grade (`dojoTeam`, `dojoPrep` dans index.html).
  - Récompense : 6 / 10 / 15 pts (donc ryō) + la moitié de ton grade ; 1 pt en cas de défaite (`/api/dojo` dans accounts.js, 20 s mini entre deux combats).
  - Les disciples s'appellent « Disciple de <premier perso de l'équipe> ». Stats : `dojo` (points), `dojoBest`, `dojoW`. Onglet Dojo dans le classement, grade sur le profil, succès dojokyu / dojodan / dojomaster.

## 2. Survie v2 (idée de Jérôme R.)
Évolution du mode Survie existant (SURV dans index.html : vagues, PV partiellement rendus, repos tous les SURV_REST, KO ranimés à SURV_REVIVE).
- **3 équipes** avec leur deck ; un perso ne peut pas être dans deux équipes.
- On choisit quelle équipe envoie entre chaque vague ; les équipes au repos regagnent 2 PV par vague.
- **Mort définitive** : un perso KO ne revient plus (remplace la réanimation actuelle).
- **Bonus à choisir entre chaque vague** : soin 10 % PV, attaque +3, rage +2, ryō +10, etc.
- Punks au début, **mini-boss toutes les 5 vagues**.
- **1 essai par jour**.
- Butin d'équipement sur les mini-boss, de plus en plus rare → seulement quand le système d'objets existera (mode RPG).
- **Combats auto** : Jérôme les voulait automatiques pour que ça aille vite. Avis donné : garder le jeu de cartes manuel (c'est le cœur du jeu), mais vagues de punks plus courtes + bouton « combat auto » optionnel (l'IA joue à ta place en accéléré ; le jeu a déjà un mode rapide FAST).
- À terme, cette Survie peut devenir les « Terres sans fin » du mode RPG (ça se recoupe beaucoup).

## 3. Mode RPG / Voyage (idée de maxGfive)
- Carte des terres désolées par chapitres (village de Mamiya, Southern Cross, prison de Cassandra…), routes avec embranchements.
- Étapes : combat, boss de zone, marchand, repos, événement à choix.
- Butin aléatoire après les victoires, par rareté : ⚪ commun, 🟢 peu commun, 🔵 rare, 🟣 épique, 🟠 mythique, 🔴 légendaire (lâché seulement par les boss, ne s'achète jamais).
- 3 places d'équipement par perso (tête, taille, mains). PV qui restent d'un combat à l'autre.
- Farm des boss pour les objets rares.
- Chaque zone a sa propre règle (ex. Cassandra : un perso KO reste enfermé pour le chapitre ; Southern Cross : la ville de Shin et de KING, boss Shin, légendaire Ceinture de KING ; règle de zone à définir. Souther n'est PAS à Southern Cross : il aura sa propre zone plus tard (la pyramide, la Croix sainte, Shu), et c'est là que va « le secret de Souther »).
- « Terres sans fin » procédurales : étages, choix combat / élite / coffre maudit, malédictions tous les 5 étages, boss tous les 10, classement de la semaine.
- **Règle d'or : les objets ne marchent QUE dans ce mode**, jamais en versus.
- Plan : d'abord une seule zone jouable (carte de Mamiya + combats + butin + inventaire) pour tester la boucle, puis le reste.
- **Zone 1 codée (v0.99.0)**, mode « Voyage » visible des admins et testeurs seulement (`rpgOpen()`). Réglages, tous à ajuster :
  - Carte (`RPG_ZONE` dans index.html) : village de Mamiya → pillards de Zeed → le vieil homme (événement à 3 choix) → meute des Kiba (élite) **ou** route des ruines → bazar **ou** oasis → Jagi (boss, avec 2 punks). Southern Cross et Cassandra affichés verrouillés.
  - Équipe libre (budget normal), PV gardés d'un combat à l'autre, KO jusqu'à l'oasis (+50 % PV, KO relevés à 30 %). Défaite ou abandon = fin du voyage, on garde les objets. Voyage en cours gardé sur l'appareil (localStorage `boc-rpg-run`), on peut quitter et reprendre.
  - v0.99.9 (idées de maxGfive) : le serveur tire le butin (`rpgRoll` dans accounts.js) et garde le sac ; le client ne peut que déplacer, utiliser ou jeter (`rpgWithin`). Chaque étape donne un objet la première fois (`stats.rpgSeen`), puis 1 ou 2 points ; le boss lâche des objets à chaque victoire (5 points en rejeu). Qualité : objet noté `id~bonus`, 24 % renforcé ★ (+1 ou +2 PV), 6 % parfait ★★ (+3 PV, ou +1 sur un niveau de coup, ou rage +1). Pas de chiffres à virgule. Idée en attente : objets ultra rares à 0,1 %.
  - Ajoutés en v0.99.3 : bandana (tête, rage +1), casque de pillard (tête, +3 PV), masque de fer (tête, +5 PV), viande séchée (10 PV à un perso), ceinturon clouté (Moyens +1), Épaulette de Shin (mythique, tous les coups +1 ; 2 % sur l'élite, 8 % sur le boss). Fond de carte et décors (événement, bazar, oasis) dans `assets/rpg-*.webp`.
  - 10 objets (`RPG_ITEMS`) : bottes +2 PV max, épaulettes +4 PV max, gants Légers +1, brassard Moyens +2, casque de Jagi Lourds +2, talisman rage +2 au départ, ceinture +1 endurance par tour ; consommables bandages (6 PV à un perso), gourde (3 PV à tous), carte du puits (50 % PV à tous). Étoile du Chariot et fouet de Cassandra attendent leur zone.
  - Butin : combat 60/30/10 (commun / peu commun / rare), événement rare garanti, élite 50/35/15 (jusqu'à épique), boss épique garanti + 1 objet + casque de Jagi 1 chance sur 10. Sac de 24, équipement par perso gardé sur le compte (`stats.rpg`).
  - Points : 6 / 8 / 10 / 25 (combat / événement / élite / boss). Bazar : 3 objets tirés au départ, 20 / 40 / 80 ryō (`/api/rpg` dans accounts.js, à garder en phase).
  - Icônes : les 12 illustrations de David (D:\Doomstar\RPG\images) sont dans `assets/item-<id>.webp` (256 px, rognées). `RPG_ART` liste celles qui sont branchées ; sans icône, un objet montre le pictogramme de sa place.
  - Pas fait : succès, classement, règles de zone, objets vus par le marchand selon la zone, serveur testé en vrai (pas de Node sur le PC de David).
- **Maquette** (8 écrans : carte, butin, événement, marchand, boss Cassandra, inventaire, Southern Cross, terres sans fin) : https://claude.ai/artifact/5JY3irQFoKDXN3Yk3yXRzX — David et maxGfive emballés. Tous les objets, effets et noms de la maquette sont des exemples.

## Objets (David les génère avec ChatGPT)
- **Specs** : PNG carré 512×512, fond transparent, l'objet seul et centré, pas de texte / cadre / lueur (la couleur de rareté est ajoutée par le jeu), style animé Hokuto années 80, éclairage dramatique, vue 3/4. Nom de fichier `item-<nom>.png`.
- Faire les objets un par un (les grilles ChatGPT décalent ou coupent les objets) ; envoyer 3-4 objets de raretés différentes à Claude pour valider le rendu avant de faire toute la série.
- **Planche de départ (12)** :
  1. item-bottes-desert — bottes de cuir usées (taille, ⚪)
  2. item-bandages — rouleau de bandages sales (consommable, ⚪)
  3. item-gourde — gourde en métal cabossée (consommable, ⚪)
  4. item-gants-cloutes — gants de cuir à clous (mains, 🟢)
  5. item-epaulettes — épaulettes à pointes de punk (taille, 🟢)
  6. item-talisman-yuria — petit pendentif / talisman (mains, 🔵)
  7. item-carte-puits — vieille carte roulée et tachée (consommable, 🔵)
  8. item-ceinture-ermite — large ceinture de tissu et cuir de moine (taille, 🟣)
  9. item-brassard-nanto — brassard orné d'un oiseau (mains, 🟣)
  10. item-etoile-chariot — médaillon aux 7 étoiles de la Grande Ourse (mains, 🟠)
  11. item-casque-jagi — le casque de Jagi (tête, 🔴)
  12. item-fouet-cassandra — fouet de geôlier en cuir et chaîne (mains, 🔴)
- **Prompt ChatGPT** : « A single game item icon: [DESCRIPTION]. Style: 1980s Fist of the North Star anime, post-apocalyptic, gritty hand-painted look, strong dramatic lighting, 3/4 view. The object alone, centered, filling about 80% of the frame. Transparent background, no text, no border, no glow, no shadow on the ground. Square 1:1. »

## 4a. Raid du soir (idée de Jérôme R., reprise d'un jeu en ligne Bleach)
- Événement en direct à heure fixe (sur Bleach : tous les soirs à 20h, 20 minutes, tout le serveur en même temps, 4 monstres par vague, il fallait être rapide pour en choper un).
- Version proposée : un créneau par semaine (ex. vendredi 20h, 20 min), annoncé sur l'accueil et le Discord ; vagues communes à tous les connectés ; on clique un monstre pour le prendre (premier arrivé) ; combat automatique en quelques secondes (ici l'auto a du sens : c'est une course) ; mini-boss commun toutes les 5 vagues ; classement des monstres abattus + récompenses.
- Piège : peu de joueurs → le nombre de monstres par vague doit suivre le nombre de connectés.
- Technique proche du boss mondial (état partagé sur le serveur, essais, classement).

## 4b. 2V2 en duo
- Deux camps comme aujourd'hui, chaque camp joué par deux joueurs (chacun amène ~2 persos, ou tour de rôle). Moteur de combat presque inchangé ; le travail = réseau à 4, lobby, qui a la main, pings entre coéquipiers. Versus en ligne seulement au début.
- Chacun pour soi à 3-4 joueurs = réécriture du combat, pas avant la v1.0.
