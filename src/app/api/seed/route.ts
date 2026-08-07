import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Role, AffaireStatut, AffaireType, FactureType, PieceType } from '@prisma/client';

function d(day: number, month: number, year = 2026) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseFr(s: string) {
  const [dd, mm] = s.split('/').map(Number);
  return d(dd, mm, 2026);
}

/** Seed démo protégé par CRON_SECRET — usage unique après déploiement. */
export async function POST() {
  const h = await headers();
  const secret = process.env.CRON_SECRET;
  if (!secret || h.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  // Appliquer le schéma n'est pas possible ici — Prisma Client assume tables existantes.
  // Tables créées au premier démarrage via migration manuelle, ou on crée via raw SQL minimal.

  const existing = await prisma.user.count().catch(() => -1);
  if (existing === -1) {
    return NextResponse.json(
      {
        error:
          'Tables absentes. Exécutez `npx prisma db push` avec DATABASE_URL Railway, puis rappelez cet endpoint.',
      },
      { status: 503 },
    );
  }
  if (existing > 0) {
    return NextResponse.json({ ok: true, message: 'Déjà peuplé', users: existing });
  }

  // Inline minimal seed (même données que prisma/seed.ts)
  const DEMO_PASSWORD = 'setrim2026';
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users = [
    { id: 'audrey', initiales: 'AU', nom: 'Audrey', email: 'audrey@setrim.fr', role: Role.assistante, terrain: false },
    { id: 'melissa', initiales: 'ME', nom: 'Mélissa', email: 'melissa@setrim.fr', role: Role.assistante, terrain: false },
    { id: 'valerie', initiales: 'VA', nom: 'Valérie', email: 'valerie@setrim.fr', role: Role.responsable, terrain: false },
    { id: 'denis', initiales: 'DE', nom: 'Denis', email: 'denis@setrim.fr', role: Role.dirigeant, terrain: true },
    { id: 'philippe', initiales: 'PH', nom: 'Philippe', email: 'philippe@setrim.fr', role: Role.conducteur, terrain: true },
  ];
  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash: hash } });
  }

  const affairesData = [
    { numeroDevis: '40083', client: 'FONCIA', adresse: '74 Rue Mercadet, 75018 Paris', montantHt: 4530, acompteHt: 1993.2, joursCharge: 5, statut: AffaireStatut.programme, dateDevis: d(29, 7, 2025), note: '', fa: { ac: true, en: false } },
    { numeroDevis: '41185', client: 'SAGFI', adresse: '62 Boulevard Diderot, 75012 Paris', montantHt: 1696.45, acompteHt: 746.44, joursCharge: 3, statut: AffaireStatut.commande, dateDevis: d(9, 10, 2025), note: 'Ravalement en cours', fa: { ac: true, en: false } },
    { numeroDevis: '40864', client: 'SAB IMMOBILIER', adresse: '4 Rue du Docteur Paquelin, 75020 Paris', montantHt: 46702, acompteHt: 19708.24, joursCharge: 48, statut: AffaireStatut.encours, dateDevis: d(10, 10, 2025), note: "En attente des travaux d'antenne", fa: { ac: true, en: true } },
    { numeroDevis: '42130', client: 'DP IMMOBILIER', adresse: '1/3 Raymond Marcheron, 92170 Vanves', montantHt: 925, acompteHt: 0, joursCharge: 1, statut: AffaireStatut.commande, dateDevis: d(29, 12, 2025), note: 'En attente de règlement fct 339 — en suspens', fa: { ac: false, en: false } },
    { numeroDevis: '42241', client: 'BERYL', adresse: '9 Rue du Gué, 92500 Rueil', montantHt: 1143, acompteHt: 0, joursCharge: 2, statut: AffaireStatut.commande, dateDevis: d(16, 2, 2026), note: "La copropriété ne veut pas qu'on intervienne — mail au syndic le 13/03/2026", fa: { ac: false, en: false } },
    { numeroDevis: '41447', client: 'MAYVILLE', adresse: "14 Square d'Alboni, 75016 Paris", montantHt: 6052.55, acompteHt: 1997.34, joursCharge: 7, statut: AffaireStatut.programme, dateDevis: d(1, 6, 2026), note: '', fa: { ac: true, en: true } },
    { numeroDevis: '41811-1B', client: 'SIMMONET', adresse: '66 Boulevard Jean Jaurès, 92110 Clichy', montantHt: 31093.76, acompteHt: 9841.18, joursCharge: 32, statut: AffaireStatut.encours, dateDevis: d(15, 6, 2026), note: 'Benne 10 m³ sur place depuis le 30/07', fa: { ac: true, en: true } },
    { numeroDevis: '42905', client: 'VALIÈRE CORTEZ', adresse: '30 Rue de Boulainvilliers, 75016 Paris', montantHt: 1153.32, acompteHt: 0, joursCharge: 1, statut: AffaireStatut.programme, dateDevis: d(29, 7, 2026), note: '', fa: { ac: false, en: false } },
    { numeroDevis: '42968', client: 'AGENCE DU PARC', adresse: '84 Avenue Jean Jaurès, 92140 Clamart', montantHt: 560, acompteHt: 0, joursCharge: 1, statut: AffaireStatut.solde, dateDevis: d(4, 8, 2026), note: 'Intervention terminée le 03/08', dateFin: d(3, 8, 2026), fa: { ac: false, en: false } },
    { numeroDevis: '42967', client: 'JOURDAN', adresse: '78/80 Rue de Bournard, 92700 Colombes', montantHt: 1420, acompteHt: 0, joursCharge: 2, statut: AffaireStatut.commande, dateDevis: d(4, 8, 2026), note: '', fa: { ac: false, en: false } },
  ];

  const affaireByNum: Record<string, string> = {};
  for (const a of affairesData) {
    const created = await prisma.affaire.create({
      data: {
        numeroDevis: a.numeroDevis,
        client: a.client,
        adresse: a.adresse,
        montantHt: a.montantHt,
        joursCharge: a.joursCharge,
        statut: a.statut,
        type: AffaireType.travaux,
        dateDevis: a.dateDevis,
        note: a.note,
        acompteHt: a.acompteHt,
        dateFin: 'dateFin' in a ? (a as { dateFin?: Date }).dateFin : undefined,
      },
    });
    affaireByNum[a.numeroDevis] = created.id;
    if (a.fa.ac && a.acompteHt > 0) {
      await prisma.facture.create({
        data: {
          affaireId: created.id,
          type: FactureType.acompte,
          montant: a.acompteHt,
          dateEmission: a.dateDevis,
          dateEncaissement: a.fa.en ? a.dateDevis : null,
        },
      });
    }
    for (const titre of ['Devis Batappli', 'Ordre de service']) {
      await prisma.piece.create({
        data: {
          affaireId: created.id,
          titre,
          type: PieceType.devis,
          auteurId: 'audrey',
        },
      });
    }
  }

  const taches = [
    { titre: 'Reprendre la benne 10 m³', num: '41811-1B', qui: 'audrey', n: 3, ech: '05/08' },
    { titre: 'Facture de solde à établir', num: '42968', qui: 'valerie', n: 3, ech: '03/08' },
    { titre: "Demande d'autorisation de stationnement", num: '41447', qui: 'melissa', n: 3, ech: '07/08' },
    { titre: "Facture d'acompte à envoyer", num: '42967', qui: 'valerie', n: 3, ech: '07/08' },
    { titre: 'Commander la benne 10 m³', num: '40864', qui: 'audrey', n: 2, ech: '07/08' },
  ];
  for (const t of taches) {
    await prisma.tache.create({
      data: {
        titre: t.titre,
        affaireId: affaireByNum[t.num],
        responsableId: t.qui,
        dateEcheance: parseFr(t.ech),
        niveau: t.n,
      },
    });
  }

  await prisma.threadMeta.create({
    data: {
      id: 'gen',
      titre: 'Équipe SETRIM',
      sousTitre: 'Audrey, Mélissa, Valérie, Denis, Philippe',
      avatar: 'ST',
      cls: 'grp',
      ordre: 0,
    },
  });

  const contrats = [
    { syndic: 'BNP PARIBAS REPM', immeuble: '16 Avenue Kléber, 75016 Paris', montantHt: 2736, nbCompagnons: 2, moisContractuel: 0, etat: 'alert', note: 'Mois contractuel dépassé — aucune date posée' },
    { syndic: 'CPAB', immeuble: '13/15 Rue Benjamin Franklin, 92400 Courbevoie', montantHt: 672, nbCompagnons: 1, moisContractuel: 1, etat: 'pose', note: 'Date posée au planning : 11/08' },
    { syndic: 'LOISELET & DAIGREMONT', immeuble: '29/47 Avenue de Condé, 94100 St-Maur', montantHt: 1085, nbCompagnons: 2, moisContractuel: 6, etat: 'contract', note: 'Fct 1952 du 25/01/26 non réglée' },
  ];
  for (const c of contrats) {
    await prisma.contratEntretien.create({ data: { ...c, exercice: '2026-2027' } });
  }

  for (const e of [
    { id: 'eq1', nom: 'Équipe 1 — Karim', chef: 'Karim', ordre: 1 },
    { id: 'eq2', nom: 'Équipe 2 — Rui', chef: 'Rui', ordre: 2 },
    { id: 'eq3', nom: 'Équipe 3 — Mickaël', chef: 'Mickaël', ordre: 3 },
    { id: 'eq4', nom: 'Équipe 4 — Sofiane', chef: 'Sofiane', ordre: 4 },
  ]) {
    await prisma.equipe.create({ data: e });
  }

  return NextResponse.json({ ok: true, message: 'Seed OK — mdp setrim2026' });
}
