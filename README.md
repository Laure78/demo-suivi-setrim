# SETRIM — Suivi d'affaires (v2)

Refonte autour d'un seul objet : l'**Affaire** (issue d'un devis Batappli).

## Six écrans (maquette validée)

1. **Aujourd'hui** — post-its / alertes + chantiers du jour  
2. **Messages** — fil général + fils chantier  
3. **Affaires** — bannettes Commandes / Programmés / En cours / Soldés + fiche  
4. **Planning** — équipes × jours, glisser-déposer  
5. **Contrats d'entretien** — exercice 01/07 → 30/06  
6. **Facturation** — portefeuille, reste à facturer, acomptes  

## Stack

- Next.js 15 (App Router) · Prisma · PostgreSQL  
- Auth (5 utilisateurs) · Web Push · Import Excel Batappli  

## Lancer en local

```bash
docker compose up -d          # PostgreSQL
cp .env.example .env          # si besoin
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Connexion démo (mot de passe `setrim2026`) :

| Email | Rôle |
|---|---|
| audrey@setrim.fr | Assistante travaux |
| melissa@setrim.fr | Assistante travaux |
| valerie@setrim.fr | Resp. administrative |
| denis@setrim.fr | Dirigeant |
| philippe@setrim.fr | Conducteur de travaux |

## Alertes push

Le moteur (`/api/alerts/run`) notifie selon le niveau de tâche.  
À brancher sur un cron quotidien (ex. Railway Cron).

## Import Batappli

Bouton **Importer les devis** sur l'écran Affaires.  
Colonnes : n° devis · date · client · adresse · montant HT · montant TTC (optionnel).  
Clé = n° de devis — les tâches / fils existants ne sont jamais écrasés.
