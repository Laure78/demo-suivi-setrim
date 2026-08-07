import { PrismaClient, Role, AffaireStatut, AffaireType, FactureType, PieceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'setrim2026';

function d(day: number, month: number, year = 2026) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function parseFr(s: string, year = 2026) {
  const [dd, mm] = s.split('/').map(Number);
  return d(dd, mm, year);
}

async function main() {
  await prisma.notificationLog.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.remarque.deleteMany();
  await prisma.planningSlot.deleteMany();
  await prisma.message.deleteMany();
  await prisma.piece.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.tache.deleteMany();
  await prisma.affaire.deleteMany();
  await prisma.contratEntretien.deleteMany();
  await prisma.equipe.deleteMany();
  await prisma.threadMeta.deleteMany();
  await prisma.user.deleteMany();

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
    { numeroDevis: '40083', client: 'FONCIA', adresse: '74 Rue Mercadet, 75018 Paris', montantHt: 4530, acompteHt: 1993.2, joursCharge: 5, statut: AffaireStatut.programme, dateDevis: d(29, 7, 2025), note: '', fa: { ac: true, so: false, en: false } },
    { numeroDevis: '41185', client: 'SAGFI', adresse: '62 Boulevard Diderot, 75012 Paris', montantHt: 1696.45, acompteHt: 746.44, joursCharge: 3, statut: AffaireStatut.commande, dateDevis: d(9, 10, 2025), note: 'Ravalement en cours', fa: { ac: true, so: false, en: false } },
    { numeroDevis: '40864', client: 'SAB IMMOBILIER', adresse: '4 Rue du Docteur Paquelin, 75020 Paris', montantHt: 46702, acompteHt: 19708.24, joursCharge: 48, statut: AffaireStatut.encours, dateDevis: d(10, 10, 2025), note: "En attente des travaux d'antenne", fa: { ac: true, so: false, en: true } },
    { numeroDevis: '42130', client: 'DP IMMOBILIER', adresse: '1/3 Raymond Marcheron, 92170 Vanves', montantHt: 925, acompteHt: 0, joursCharge: 1, statut: AffaireStatut.commande, dateDevis: d(29, 12, 2025), note: 'En attente de règlement fct 339 — en suspens', fa: { ac: false, so: false, en: false } },
    { numeroDevis: '42241', client: 'BERYL', adresse: '9 Rue du Gué, 92500 Rueil', montantHt: 1143, acompteHt: 0, joursCharge: 2, statut: AffaireStatut.commande, dateDevis: d(16, 2, 2026), note: "La copropriété ne veut pas qu'on intervienne — mail au syndic le 13/03/2026", fa: { ac: false, so: false, en: false } },
    { numeroDevis: '41447', client: 'MAYVILLE', adresse: "14 Square d'Alboni, 75016 Paris", montantHt: 6052.55, acompteHt: 1997.34, joursCharge: 7, statut: AffaireStatut.programme, dateDevis: d(1, 6, 2026), note: '', fa: { ac: true, so: false, en: true } },
    { numeroDevis: '41811-1B', client: 'SIMMONET', adresse: '66 Boulevard Jean Jaurès, 92110 Clichy', montantHt: 31093.76, acompteHt: 9841.18, joursCharge: 32, statut: AffaireStatut.encours, dateDevis: d(15, 6, 2026), note: 'Benne 10 m³ sur place depuis le 30/07', fa: { ac: true, so: false, en: true } },
    { numeroDevis: '42905', client: 'VALIÈRE CORTEZ', adresse: '30 Rue de Boulainvilliers, 75016 Paris', montantHt: 1153.32, acompteHt: 0, joursCharge: 1, statut: AffaireStatut.programme, dateDevis: d(29, 7, 2026), note: '', fa: { ac: false, so: false, en: false } },
    { numeroDevis: '42968', client: 'AGENCE DU PARC', adresse: '84 Avenue Jean Jaurès, 92140 Clamart', montantHt: 560, acompteHt: 0, joursCharge: 1, statut: AffaireStatut.solde, dateDevis: d(4, 8, 2026), note: 'Intervention terminée le 03/08', dateFin: d(3, 8, 2026), fa: { ac: false, so: false, en: false } },
    { numeroDevis: '42967', client: 'JOURDAN', adresse: '78/80 Rue de Bournard, 92700 Colombes', montantHt: 1420, acompteHt: 0, joursCharge: 2, statut: AffaireStatut.commande, dateDevis: d(4, 8, 2026), note: '', fa: { ac: false, so: false, en: false } },
  ] as const;

  const affaireByNum: Record<string, string> = {};

  for (const a of affairesData) {
    const created = await prisma.affaire.create({
      data: {
        numeroDevis: a.numeroDevis,
        client: a.client,
        adresse: a.adresse,
        montantHt: a.montantHt,
        montantTtc: Math.round(a.montantHt * 1.2 * 100) / 100,
        joursCharge: a.joursCharge,
        statut: a.statut,
        type: AffaireType.travaux,
        dateDevis: a.dateDevis,
        note: a.note,
        acompteHt: a.acompteHt,
        dateFin: 'dateFin' in a ? a.dateFin : undefined,
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
    if (a.fa.so) {
      await prisma.facture.create({
        data: {
          affaireId: created.id,
          type: FactureType.solde,
          montant: a.montantHt - a.acompteHt,
          dateEmission: new Date(),
        },
      });
    }

    for (const titre of ['Devis Batappli', 'Ordre de service', 'Photo de la toiture avant travaux', 'Autorisation de stationnement']) {
      await prisma.piece.create({
        data: {
          affaireId: created.id,
          titre,
          type: titre.includes('Photo') ? PieceType.photo : titre.includes('Devis') ? PieceType.devis : titre.includes('Ordre') ? PieceType.os : PieceType.autorisation,
          auteurId: 'audrey',
        },
      });
    }
  }

  const taches = [
    { titre: 'Reprendre la benne 10 m³', num: '41811-1B', qui: 'audrey', n: 3, ech: '05/08' },
    { titre: 'Facture de solde à établir', num: '42968', qui: 'valerie', n: 3, ech: '03/08' },
    { titre: 'Relance impayé — FCT 1952', num: null, lib: 'CE · LOISELET DAIGREMONT', qui: 'valerie', n: 3, ech: '06/08' },
    { titre: "Caler la date du contrat d'entretien (mois contractuel : juillet)", num: null, lib: 'CE · BNP PARIBAS REPM', qui: 'audrey', n: 3, ech: '06/08' },
    { titre: "Demande d'autorisation de stationnement", num: '41447', qui: 'melissa', n: 3, ech: '07/08' },
    { titre: "Facture d'acompte à envoyer", num: '42967', qui: 'valerie', n: 3, ech: '07/08' },
    { titre: 'Commander la benne 10 m³', num: '40864', qui: 'audrey', n: 2, ech: '07/08' },
    { titre: 'Demande de prix — membrane SBS', num: '41811-1B', qui: 'melissa', n: 2, ech: '07/08' },
    { titre: "Dépose de l'échafaudage", num: '40083', qui: 'philippe', n: 2, ech: '08/08' },
    { titre: 'Photos avant travaux à remonter', num: '42905', qui: 'denis', n: 1, ech: '07/08' },
  ];

  for (const t of taches) {
    await prisma.tache.create({
      data: {
        titre: t.titre,
        affaireId: t.num ? affaireByNum[t.num] : null,
        libelleAffaire: t.lib ?? null,
        responsableId: t.qui,
        dateEcheance: parseFr(t.ech),
        niveau: t.n,
      },
    });
  }

  await prisma.threadMeta.createMany({
    data: [
      { id: 'gen', titre: 'Équipe SETRIM', sousTitre: 'Audrey, Mélissa, Valérie, Denis, Philippe', avatar: 'ST', cls: 'grp', pin: 'Congés du 13 au 21 août : équipes 3 et 4. Prévenir les syndics concernés.', ordre: 0 },
      { id: '41811-1B', titre: 'SIMMONET — 66 Bd Jean Jaurès', sousTitre: 'Chantier · Denis, Audrey, Valérie, Rui', avatar: 'SI', cls: '', pin: 'Benne 10 m³ sur place depuis le 30/07 — reprise à demander.', ordre: 1 },
      { id: '40864', titre: 'SAB IMMOBILIER — Dr Paquelin', sousTitre: 'Chantier · Philippe, Audrey', avatar: 'SA', cls: '', ordre: 2 },
      { id: '41447', titre: "MAYVILLE — Square d'Alboni", sousTitre: 'Chantier · Mélissa, Denis', avatar: 'MA', cls: '', ordre: 3 },
      { id: 'ce', titre: "Contrats d'entretien", sousTitre: 'Groupe · Audrey, Valérie', avatar: 'CE', cls: 'ce', ordre: 4 },
      { id: 'denis', titre: 'Denis', sousTitre: 'Sur chantier — Clichy', avatar: 'DE', cls: '', ordre: 5 },
      { id: 'philippe', titre: 'Philippe', sousTitre: 'Sur chantier — Paris 20', avatar: 'PH', cls: '', ordre: 6 },
    ],
  });

  const msgs: { threadKey: string; auteurId: string; texte?: string; photoLabel?: string; systeme?: boolean; h: Date; affaireNum?: string }[] = [
    { threadKey: 'gen', auteurId: 'valerie', texte: "Bonjour à tous. Rappel : les situations de travaux partent lundi, j'ai besoin des avancements avant vendredi 16h.", h: d(7, 8) },
    { threadKey: 'gen', auteurId: 'denis', texte: "OK pour Clichy, je remonte l'avancement ce soir.", h: d(7, 8) },
    { threadKey: 'gen', auteurId: 'audrey', texte: "J'ai mis à jour le planning de la semaine prochaine, Mickaël est en congés à partir de jeudi.", h: d(7, 8) },
    { threadKey: '41811-1B', auteurId: 'denis', texte: "Je passe à Clichy vers 9h. La zone 2 est prête, on peut lancer le relevé d'acrotère.", h: d(7, 8), affaireNum: '41811-1B' },
    { threadKey: '41811-1B', auteurId: 'denis', photoLabel: 'Photo — acrotère zone 2', h: d(7, 8), affaireNum: '41811-1B' },
    { threadKey: '41811-1B', auteurId: 'audrey', texte: 'Bien reçu. La benne est toujours sur place, je demande la reprise aujourd\'hui.', h: d(7, 8), affaireNum: '41811-1B' },
    { threadKey: '41811-1B', auteurId: 'audrey', texte: 'Audrey a créé la tâche « Reprendre la benne 10 m³ » — urgent, échéance 05/08', systeme: true, h: d(7, 8), affaireNum: '41811-1B' },
    { threadKey: '41811-1B', auteurId: 'valerie', texte: 'Acompte de 9 841,18 € encaissé le 20/06. Situation intermédiaire à prévoir fin août.', h: d(7, 8), affaireNum: '41811-1B' },
    { threadKey: '40864', auteurId: 'philippe', texte: "L'antenne n'est toujours pas déposée, on ne peut pas attaquer la partie nord.", h: d(6, 8), affaireNum: '40864' },
    { threadKey: '40864', auteurId: 'audrey', texte: 'Je relance le syndic demain matin. Benne commandée pour vendredi.', h: d(6, 8), affaireNum: '40864' },
    { threadKey: '41447', auteurId: 'melissa', texte: "Il manque l'autorisation de stationnement pour lundi, la mairie demande 15 jours.", h: d(6, 8), affaireNum: '41447' },
    { threadKey: '41447', auteurId: 'melissa', texte: "Mélissa a créé la tâche « Demande d'autorisation de stationnement » — urgent, échéance 07/08", systeme: true, h: d(6, 8), affaireNum: '41447' },
    { threadKey: 'ce', auteurId: 'valerie', texte: 'BNP Paribas REPM : mois contractuel de juillet dépassé, aucune date posée. C\'est une obligation contractuelle, il faut caler avant fin août.', h: d(5, 8) },
    { threadKey: 'ce', auteurId: 'audrey', texte: 'Je regarde avec Denis pour caser ça sur l\'équipe 3.', h: d(5, 8) },
    { threadKey: 'denis', auteurId: 'denis', texte: 'Je te rappelle en descendant du toit.', h: d(7, 8) },
    { threadKey: 'philippe', auteurId: 'philippe', texte: 'Photos envoyées sur le fil du chantier.', h: d(6, 8) },
  ];

  for (const m of msgs) {
    await prisma.message.create({
      data: {
        threadKey: m.threadKey,
        auteurId: m.auteurId,
        texte: m.texte ?? null,
        photoLabel: m.photoLabel ?? null,
        systeme: m.systeme ?? false,
        affaireId: m.affaireNum ? affaireByNum[m.affaireNum] : null,
        createdAt: m.h,
      },
    });
  }

  const contrats = [
    { syndic: 'BNP PARIBAS REPM', immeuble: '16 Avenue Kléber, 75016 Paris', montantHt: 2736, nbCompagnons: 2, moisContractuel: 0, etat: 'alert', note: 'Mois contractuel dépassé — aucune date posée' },
    { syndic: 'ANDRÉ GRIFFATON', immeuble: '6/8 Rue Duguay Trouin, 75006 Paris', montantHt: 740, nbCompagnons: 1, moisContractuel: 6, etat: 'contract', note: 'Fct 1901 et 685 non réglées' },
    { syndic: 'LOISELET & DAIGREMONT', immeuble: '29/47 Avenue de Condé, 94100 St-Maur', montantHt: 1085, nbCompagnons: 2, moisContractuel: 6, etat: 'contract', note: 'Fct 1952 du 25/01/26 non réglée' },
    { syndic: 'CPAB', immeuble: '13/15 Rue Benjamin Franklin, 92400 Courbevoie', montantHt: 672, nbCompagnons: 1, moisContractuel: 1, etat: 'pose', note: 'Date posée au planning : 11/08', datePosee: d(11, 8) },
    { syndic: 'AVGIMMO — FONCIA', immeuble: '1/3 Rue Jean Thomas, 95600 Eaubonne', montantHt: 1310, nbCompagnons: 1, moisContractuel: 6, etat: 'contract', note: '' },
    { syndic: 'CRAUNOT', immeuble: '43/49 Rue Bernard Iskle, 92350 Le Plessis', montantHt: 1179, nbCompagnons: 1, moisContractuel: 6, etat: 'contract', note: '' },
    { syndic: 'DUBREUIL', immeuble: '104 Rue du Ménil, 92600 Asnières', montantHt: 1117, nbCompagnons: 1, moisContractuel: 8, etat: 'contract', note: '' },
    { syndic: 'GAURIAU', immeuble: '17 Bld Anatole France, 92100 Boulogne', montantHt: 733, nbCompagnons: 1, moisContractuel: 5, etat: 'contract', note: '' },
    { syndic: 'NEXITY PM', immeuble: 'Immeuble Le Pascal, 75012 Paris', montantHt: 1210, nbCompagnons: 1, moisContractuel: 2, etat: 'contract', note: 'Attente OS nouveau syndic — devis 41747' },
    { syndic: 'CONCILIA', immeuble: '2/6 Rue Saad Lecomte, 75019 Paris', montantHt: 950, nbCompagnons: 1, moisContractuel: 3, etat: 'contract', note: 'Résiliation en cours (22/07/26)' },
    { syndic: 'DAUCHEZ', immeuble: '132 Rue Léon Maurice Nordmann, 75013 Paris', montantHt: 803, nbCompagnons: 2, moisContractuel: 4, etat: 'contract', note: '1 jour à 2 compagnons — site très sale' },
    { syndic: 'CLARDIM', immeuble: '68 Rue Gabriel Péri, 92120 Montrouge', montantHt: 679, nbCompagnons: 1, moisContractuel: 9, etat: 'contract', note: '' },
  ];

  for (const c of contrats) {
    await prisma.contratEntretien.create({ data: { ...c, exercice: '2026-2027' } });
  }

  const equipes = [
    { id: 'eq1', nom: 'Équipe 1 — Karim', chef: 'Karim', ordre: 1, categorie: 'equipe' },
    { id: 'eq2', nom: 'Équipe 2 — Rui', chef: 'Rui', ordre: 2, categorie: 'equipe' },
    { id: 'eq3', nom: 'Équipe 3 — Mickaël', chef: 'Mickaël', ordre: 3, categorie: 'equipe' },
    { id: 'eq4', nom: 'Équipe 4 — Sofiane', chef: 'Sofiane', ordre: 4, categorie: 'equipe' },
    { id: 'presta-echafaudage', nom: 'Prestataire 1', chef: 'Externe', ordre: 20, categorie: 'prestataire' },
    { id: 'presta-bennes', nom: 'Prestataire 2', chef: 'Externe', ordre: 21, categorie: 'prestataire' },
  ];
  for (const e of equipes) await prisma.equipe.create({ data: e });

  // Semaine 10–14 août 2026
  const week = [d(10, 8), d(11, 8), d(12, 8), d(13, 8), d(14, 8)];
  const slots: { equipeId: string; date: Date; affaireId?: string; type: string; label?: string }[] = [
    { equipeId: 'eq1', date: week[0], type: 'chantier', label: 'FONCIA · 196 Av. Victor Hugo — démolition', affaireId: undefined },
    { equipeId: 'eq1', date: week[1], type: 'chantier', label: 'FONCIA · 196 Av. Victor Hugo — démolition' },
    { equipeId: 'eq1', date: week[2], type: 'chantier', label: 'ACTION WEST · 12 Rue de Rouen' },
    { equipeId: 'eq1', date: week[3], type: 'chantier', label: 'ACTION WEST · 12 Rue de Rouen' },
    { equipeId: 'eq1', date: week[4], type: 'chantier', label: 'SIMMONET · 66 Bd Jean Jaurès, Clichy', affaireId: affaireByNum['41811-1B'] },
    { equipeId: 'eq2', date: week[0], type: 'chantier', label: 'SIMMONET · 66 Bd Jean Jaurès, Clichy', affaireId: affaireByNum['41811-1B'] },
    { equipeId: 'eq2', date: week[1], type: 'chantier', label: 'SIMMONET · 66 Bd Jean Jaurès, Clichy', affaireId: affaireByNum['41811-1B'] },
    { equipeId: 'eq2', date: week[1], type: 'tache', label: 'Reprise benne' },
    { equipeId: 'eq2', date: week[2], type: 'chantier', label: 'SAB IMMOBILIER · 4 Rue du Dr Paquelin', affaireId: affaireByNum['40864'] },
    { equipeId: 'eq2', date: week[3], type: 'chantier', label: 'SAB IMMOBILIER · 4 Rue du Dr Paquelin', affaireId: affaireByNum['40864'] },
    { equipeId: 'eq2', date: week[4], type: 'chantier', label: 'SAB IMMOBILIER · 4 Rue du Dr Paquelin', affaireId: affaireByNum['40864'] },
    { equipeId: 'eq3', date: week[0], type: 'ce', label: "BNP PARIBAS REPM · 16 Av. Kléber — contrat d'entretien" },
    { equipeId: 'eq3', date: week[1], type: 'chantier', label: "MAYVILLE · 14 Square d'Alboni", affaireId: affaireByNum['41447'] },
    { equipeId: 'eq3', date: week[1], type: 'tache', label: 'Autorisation stationnement' },
    { equipeId: 'eq3', date: week[2], type: 'chantier', label: "MAYVILLE · 14 Square d'Alboni", affaireId: affaireByNum['41447'] },
    { equipeId: 'eq3', date: week[3], type: 'absent', label: 'CONGÉS' },
    { equipeId: 'eq3', date: week[4], type: 'absent', label: 'CONGÉS' },
    { equipeId: 'eq4', date: week[0], type: 'chantier', label: 'VALIÈRE CORTEZ · 30 Rue de Boulainvilliers', affaireId: affaireByNum['42905'] },
    { equipeId: 'eq4', date: week[1], type: 'ce', label: 'CPAB · 13/15 Rue Benjamin Franklin — CE' },
    { equipeId: 'eq4', date: week[2], type: 'chantier', label: 'JOURDAN · 78/80 Rue de Bournard, Colombes', affaireId: affaireByNum['42967'] },
    { equipeId: 'eq4', date: week[3], type: 'chantier', label: 'JOURDAN · 78/80 Rue de Bournard, Colombes', affaireId: affaireByNum['42967'] },
    { equipeId: 'eq4', date: week[4], type: 'absent', label: 'ABSENT' },
  ];

  for (const s of slots) {
    await prisma.planningSlot.create({
      data: {
        equipeId: s.equipeId,
        date: s.date,
        type: s.type,
        label: s.label,
        affaireId: s.affaireId ?? null,
      },
    });
  }

  console.log('Seed SETRIM OK — mot de passe démo :', DEMO_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
