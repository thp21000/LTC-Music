# LTC Music

Page publique responsive de **La Table des Curieux** permettant aux viewers de parcourir le catalogue StreamBeats autorisé et de copier une commande `!song #ID` à coller dans le chat Twitch ou YouTube.

## Fichiers

- `index.html` — page principale
- `styles.css` — identité visuelle responsive LTC
- `app.js` — recherche, filtres, tirage aléatoire et copie des commandes
- `catalog.json` — catalogue public des morceaux

## Publication GitHub Pages

Dans le dépôt GitHub :

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source : Deploy from a branch`
5. `Branch : main`
6. Dossier : `/ (root)`
7. `Save`

L'adresse publique attendue est :

`https://thp21000.github.io/LTC-Music/`

## Mise à jour du catalogue

Le lecteur local LTC génère un catalogue à partir des fichiers StreamBeats présents sur le PC. Pour mettre à jour le site public, remplace simplement `catalog.json` par la version générée localement.

Le site public ne lit aucun fichier audio et ne donne aucun accès au serveur local. Il affiche seulement le catalogue et prépare les commandes à coller dans le chat.
