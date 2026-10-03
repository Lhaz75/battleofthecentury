# Battle of the Century

Jeu de baston en cartes, fan game non officiel et gratuit inspiré de Hokuto no Ken et Soten no Ken. FR / EN / IT.

## Lancer en local

Node.js 18 ou plus :

```
npm install
npm start
```

Puis ouvrir http://localhost:8080

## Mettre en ligne sur Render (gratuit)

1. Sur render.com : New → Blueprint, choisir ce dépôt GitHub. Render lit `render.yaml` et crée le service.
2. Attendre la fin du déploiement, puis partager l'adresse `https://….onrender.com`.

Le versus en ligne passe par ce petit serveur (WebSocket). Aucun compte n'est demandé aux joueurs.
Sur l'offre gratuite, le service s'endort après 15 minutes sans visite : le premier chargement peut prendre une minute.

## Comptes, scores et Hall of Fame

Les comptes (pseudo + mot de passe, avatar) et les scores sont stockés dans Postgres.
Sur Render, ajoute la variable d'environnement `DATABASE_URL` (connection string Neon, `postgresql://…?sslmode=require`).
Les tables `boc_users` et `boc_sessions` sont créées automatiquement au démarrage.
Sans `DATABASE_URL`, le serveur utilise un fichier local `data/accounts.json` (pratique en local, mais effacé à chaque redéploiement sur Render).

Barème : contre l'IA, victoire +10 pts, défaite +2. En versus, victoire +25 pts, défaite +5, et Elo (K = 32) quand les deux joueurs ont un compte.

## Mettre à jour

Remplacer le dossier `public` par la nouvelle version, committer et pousser : Render redéploie tout seul.
