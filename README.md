# SETRIM — Suivi chantier (démo)

Outil interne pour SETRIM étanchéité : check-lists chantier, alertes du jour,
planning, messagerie et contrats d’entretien.

## Lancer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Scénario démo (2 minutes)

1. **Tableau de bord** — escalades violetes (retard > 5 j) en tête, puis retards / orange.
2. **Mes actions** — filtre par utilisateur actif (changer le sélecteur en haut).
3. Onglet **Planning** — choisir un modèle (Réfection / Neuf / Entretien) à la création.
4. Fiche chantier — onglets Check-list / Journal ; joindre une photo sur une action.
5. **Contrats** — marquer facturé → échéance N+1 « À venir » créée automatiquement.
6. Bouton **Reset** pour revenir aux données de départ.

## Import Batappli

Sur **Planning** : bouton « Importer un devis (Excel) ».

Fichier d’exemple : [`public/examples/devis-exemple.xlsx`](public/examples/devis-exemple.xlsx)
(ou `npm run generate:devis-exemple`).

Le parsing est isolé dans `src/lib/batappli-import.ts` — à ajuster quand on aura
la vraie structure de colonnes de l’export Batappli.

## Déploiement Railway

Repo GitHub : https://github.com/Laure78/demo-suivi-setrim

Build Docker (`Dockerfile` + `railway.toml`). Sur Railway : New Project → Deploy from GitHub → choisir ce dépôt.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- SheetJS (`xlsx`) pour l’import Batappli
- Données seed en dur, état persisté dans `localStorage`
- Pas d’authentification réelle (sélecteur d’utilisateur)
- Hébergement : Railway (pas Vercel)

Toutes les données sont **fictives**.
