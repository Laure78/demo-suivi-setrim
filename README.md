# SETRIM — Plateforme interne (démo)

Plateforme unique : alertes, portefeuille, planning, CE, check-lists, factures,
commandes, messagerie. **Rien ne doit vivre ailleurs** (Excel / Outlook / papier).

## Organisation SETRIM

- **5** personnes au bureau (comptes de connexion)
- **15** ouvriers / chefs de chantier (compagnons dans les équipes)
- **2** prestataires (commandes externes)

## Lancer

```bash
npm install
npm run dev
```

Connexion démo (accès unique) : identifiant `setrim`, mot de passe `setrim2026`.
Puis choisir « Je suis » dans le bandeau pour changer de profil.

## Modules livrés (v9)

1. Auth + rôles (dirigeant, responsable, assistante, suivi chantier)
2. Accueil **Mes alertes du jour** (retard / aujourd’hui / semaine)
3. **Portefeuille** + bandeau CA / jours / CA-jour
4. **Fiche affaire** + check-list vivante (horodatage auto)
5. **Planning CE** (exercice juil→juin, hors délai rouge)
6. **Planning chantiers** (équipes × jours)
7. Factures, commandes, demandes de prix
8. Messagerie style WhatsApp
9. Admin (délais d’alerte, modèles, équipes)

## Suite prévue

- Glisser-déposer planning + passage PORTEFEUILLE → PLANIFIÉ
- Notifications push paramétrables
- Import Excel Batappli (historique 3 onglets)
- Export PDF / Excel des vues
- Archivage (pas de suppression définitive)

## Déploiement Railway

Repo : https://github.com/Laure78/demo-suivi-setrim
