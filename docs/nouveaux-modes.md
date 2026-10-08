# Battle of the Century — nouveaux modes (notes du 8 oct.)

Idées sorties du Discord (maxGfive, Jérôme R.) et discutées avec David. Rien n'est codé pour l'instant.

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
- Réutilise : combats IA, ryō, magasin. À faire : écran de choix des 3 adversaires, système de grades, classement.

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
- Chaque zone a sa propre règle (ex. Cassandra : un perso KO reste enfermé pour le chapitre ; Southern Cross : le secret de Souther).
- « Terres sans fin » procédurales : étages, choix combat / élite / coffre maudit, malédictions tous les 5 étages, boss tous les 10, classement de la semaine.
- **Règle d'or : les objets ne marchent QUE dans ce mode**, jamais en versus.
- Plan : d'abord une seule zone jouable (carte de Mamiya + combats + butin + inventaire) pour tester la boucle, puis le reste.
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
