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

1. **Tableau de bord** — alertes rouges / orange, dont Dupont et l’alerte messagerie.
2. Onglet **Planning** — bascule semaine / mois, blocs colorés par équipe,
   clic sur un bloc → fiche chantier.
3. **Importer un devis (Excel)** — utiliser `devis-exemple.xlsx`, valider l’aperçu.
4. **+ Programmer un chantier** — check-list standard créée automatiquement.
5. Fiche **Dupont** — cocher une action ; **Ouvrir la discussion**.
6. Onglet **Messagerie** / **Contrats** — pastilles et alertes.
7. Bouton **Reset** pour revenir aux données de départ.

## Import Batappli

Sur **Planning** : bouton « Importer un devis (Excel) ».

Fichier d’exemple : [`public/examples/devis-exemple.xlsx`](public/examples/devis-exemple.xlsx)
(ou `npm run generate:devis-exemple`).

Le parsing est isolé dans `src/lib/batappli-import.ts` — à ajuster quand on aura
la vraie structure de colonnes de l’export Batappli.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- SheetJS (`xlsx`) pour l’import Batappli
- Données seed en dur, état persisté dans `localStorage`
- Pas d’authentification réelle (sélecteur d’utilisateur)

Toutes les données sont **fictives**.
