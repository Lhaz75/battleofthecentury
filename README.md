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

## Mettre à jour

Remplacer le dossier `public` par la nouvelle version, committer et pousser : Render redéploie tout seul.
