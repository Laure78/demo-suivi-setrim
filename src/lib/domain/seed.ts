import type {
  Affaire,
  Affectation,
  Checklist,
  ChecklistItem,
  ChecklistModele,
  Commande,
  ContratEntretien,
  DemandePrix,
  Devis,
  Document,
  Equipe,
  Facture,
  Immeuble,
  JournalActivite,
  Message,
  Nota,
  PassageCE,
  PersistedState,
  Syndic,
  Utilisateur,
} from './types';
import {
  DEFAULT_ALERT_DELAIS,
  DEFAULT_COLOR_CODES,
  DEFAULT_COMMANDE_TYPE_LABELS,
} from './types';
import { addDays, todayISO } from '@/lib/dates';
import { currentExercice } from './ce-engine';
import { JOURS_FERIES_FR } from './planning';

const DEMO_PASSWORD = 'setrim2026';

/** Accès unique partagé (toute l’équipe). */
export const COMMON_ACCESS = {
  identifiant: 'setrim',
  password: DEMO_PASSWORD,
  /** Profil ouvert après connexion */
  defaultUserId: 'denis',
} as const;

export const DEMO_PASSWORD_HINT = DEMO_PASSWORD;

function isoAt(day: string, time: string): string {
  return new Date(`${day}T${time}`).toISOString();
}

/** Seed réaliste — ~15 affaires / devis issus d’un scénario Excel-like. */
export function createSeedState(): PersistedState {
  const t = todayISO();

  const utilisateurs: Utilisateur[] = [
    {
      id: 'denis',
      nom: 'Denis',
      email: 'denis@setrim.fr',
      password: DEMO_PASSWORD,
      role: 'dirigeant',
      telephone: '06 12 00 00 01',
      actif: true,
      preferencesNotifications: { push: true, emailDigest: false },
    },
    {
      id: 'valerie',
      nom: 'Valérie',
      email: 'valerie@setrim.fr',
      password: DEMO_PASSWORD,
      role: 'responsable',
      telephone: '06 12 00 00 02',
      actif: true,
      preferencesNotifications: { push: true, emailDigest: true },
    },
    {
      id: 'melissa',
      nom: 'Melissa',
      email: 'melissa@setrim.fr',
      password: DEMO_PASSWORD,
      role: 'assistante',
      telephone: '06 12 00 00 03',
      actif: true,
      preferencesNotifications: { push: true, emailDigest: false },
    },
    {
      id: 'audrey',
      nom: 'Audrey',
      email: 'audrey@setrim.fr',
      password: DEMO_PASSWORD,
      role: 'assistante',
      telephone: '06 12 00 00 04',
      actif: true,
      preferencesNotifications: { push: false, emailDigest: true },
    },
    {
      id: 'philippe',
      nom: 'Philippe',
      email: 'philippe@setrim.fr',
      password: DEMO_PASSWORD,
      role: 'suivi_chantier',
      telephone: '06 12 00 00 05',
      actif: true,
      preferencesNotifications: { push: true, emailDigest: false },
    },
  ];

  const syndics: Syndic[] = [
    {
      id: 'syn-1',
      nom: 'Cabinet Dupont',
      contacts: [{ id: 'c1', nom: 'Mme Dupont', email: 'dupont@cabinet.fr', fonction: 'Gestionnaire' }],
      telephone: '01 48 00 11 11',
      email: 'contact@cabinet-dupont.fr',
      notes: 'Préférer emails le matin',
    },
    {
      id: 'syn-2',
      nom: 'SCI Voltaire Habitat',
      contacts: [{ id: 'c2', nom: 'M. Benali', telephone: '06 80 00 22 22' }],
      telephone: '01 49 00 22 22',
      email: 'gestion@voltaire-habitat.fr',
      notes: '',
    },
    {
      id: 'syn-3',
      nom: 'Syndic Jaurès Gestion',
      contacts: [],
      telephone: '01 41 00 33 33',
      email: 'jaures@syndic.fr',
      notes: 'OS souvent en retard',
    },
    {
      id: 'syn-4',
      nom: 'Foncia Aubervilliers',
      contacts: [{ id: 'c4', nom: 'Service travaux' }],
      telephone: '01 48 00 44 44',
      email: 'travaux.aubervilliers@foncia.fr',
      notes: '',
    },
    {
      id: 'syn-5',
      nom: 'Ville de Pantin — bâtiments',
      contacts: [{ id: 'c5', nom: 'Service technique' }],
      telephone: '01 49 00 55 55',
      email: 'batiments@pantin.fr',
      notes: 'Marché public — délais stricts',
    },
  ];

  const immeubles: Immeuble[] = [
    {
      id: 'imm-1',
      syndicId: 'syn-1',
      adresse: '12 rue des Lilas',
      codePostal: '75011',
      ville: 'Paris',
      acces: 'Digicode 4521A — cour arrière',
      notesTerrain: 'Accès benne côté rue uniquement le matin',
    },
    {
      id: 'imm-2',
      syndicId: 'syn-2',
      adresse: '8 avenue Voltaire',
      codePostal: '94200',
      ville: 'Ivry-sur-Seine',
      acces: 'Badge syndic',
      notesTerrain: '',
    },
    {
      id: 'imm-3',
      syndicId: 'syn-3',
      adresse: '45 boulevard Jaurès',
      codePostal: '92110',
      ville: 'Clichy',
      acces: 'Gardien 8h-12h',
      notesTerrain: 'Parties communes à réserver',
    },
    {
      id: 'imm-4',
      syndicId: 'syn-4',
      adresse: '3 rue du Stade',
      codePostal: '93200',
      ville: 'Saint-Denis',
      acces: 'Portail chantier',
      notesTerrain: 'Gymnase — planning scolaire',
    },
    {
      id: 'imm-5',
      syndicId: 'syn-5',
      adresse: '2 place de la Mairie',
      codePostal: '93500',
      ville: 'Pantin',
      acces: 'Badge ville',
      notesTerrain: '',
    },
    {
      id: 'imm-6',
      syndicId: 'syn-1',
      adresse: '27 rue Bisson',
      codePostal: '93300',
      ville: 'Aubervilliers',
      acces: 'Escalier A',
      notesTerrain: 'Proche SETRIM',
    },
    {
      id: 'imm-7',
      syndicId: 'syn-4',
      adresse: '14 allée des Acacias',
      codePostal: '93100',
      ville: 'Montreuil',
      acces: 'Interphone 12',
      notesTerrain: '',
    },
    {
      id: 'imm-8',
      syndicId: 'syn-2',
      adresse: '9 rue de la Résine',
      codePostal: '94000',
      ville: 'Créteil',
      acces: '',
      notesTerrain: 'Chantier résine parking',
    },
  ];

  const equipes: Equipe[] = [
    {
      id: 'eq-a',
      libelle: 'Équipe A — Toitures',
      compagnons: ['Karim', 'Said', 'Youssef', 'Bruno', 'Omar'],
      actif: true,
      color: '#0070ba',
      bg: '#dbeafe',
    },
    {
      id: 'eq-b',
      libelle: 'Équipe B — Terrasses',
      compagnons: ['Hassan', 'Mehdi', 'Patrice', 'Amine', 'Nabil'],
      actif: true,
      color: '#0f766e',
      bg: '#ccfbf1',
    },
    {
      id: 'eq-c',
      libelle: 'Équipe C — Urgences',
      compagnons: ['Farid', 'Laurent', 'Samir', 'David', 'Khaled'],
      actif: true,
      color: '#9a3412',
      bg: '#ffedd5',
    },
  ];

  const checklistModeles: ChecklistModele[] = [
    {
      id: 'mod-travaux',
      libelle: 'Réfection toiture-terrasse',
      typeChantier: 'TRAVAUX',
      items: [
        { ordre: 1, libelle: "Facturation d'acompte", obligatoire: true, delaiJours: 0 },
        { ordre: 2, libelle: "Demande d'autorisation (voirie / copropriété)", obligatoire: true, delaiJours: 1 },
        { ordre: 3, libelle: "Commande d'échafaudage", obligatoire: true, delaiJours: 2 },
        { ordre: 4, libelle: 'Commande de bennes', obligatoire: true, delaiJours: 3 },
        { ordre: 5, libelle: 'Commande roulotte', obligatoire: false, delaiJours: 3 },
        { ordre: 6, libelle: 'DICT', obligatoire: true, delaiJours: 5 },
        { ordre: 7, libelle: 'PPSPS', obligatoire: true, delaiJours: 5 },
        { ordre: 8, libelle: 'Photos avant travaux', obligatoire: true, delaiJours: 7 },
        { ordre: 9, libelle: 'Situation n°1', obligatoire: true, delaiJours: 30 },
        { ordre: 10, libelle: 'Réception / DOE', obligatoire: true, delaiJours: 45 },
        { ordre: 11, libelle: 'Facture de solde', obligatoire: true, delaiJours: 50 },
      ],
    },
    {
      id: 'mod-resine',
      libelle: 'Résine',
      typeChantier: 'RESINE',
      items: [
        { ordre: 1, libelle: "Facturation d'acompte", obligatoire: true, delaiJours: 0 },
        { ordre: 2, libelle: 'Préparation support', obligatoire: true, delaiJours: 2 },
        { ordre: 3, libelle: 'Application résine', obligatoire: true, delaiJours: 5 },
        { ordre: 4, libelle: 'Facture de solde', obligatoire: true, delaiJours: 14 },
      ],
    },
    {
      id: 'mod-nettoyage',
      libelle: 'Nettoyage',
      typeChantier: 'NETTOYAGE',
      items: [
        { ordre: 1, libelle: 'Prise de RDV', obligatoire: true, delaiJours: 0 },
        { ordre: 2, libelle: 'Intervention', obligatoire: true, delaiJours: 7 },
        { ordre: 3, libelle: 'Facture', obligatoire: true, delaiJours: 10 },
      ],
    },
  ];

  type Row = {
    num: string;
    type: Devis['type'];
    imm: string;
    ht: number;
    jours: number | null;
    statut: Affaire['statut'];
    acompteAttendu: number;
    acompteRecu: number;
    lastActionDays: number;
    commentaire: string;
    devisStatut?: Devis['statut'];
    motif?: string;
  };

  const rows: Row[] = [
    {
      num: 'D-25041',
      type: 'TRAVAUX',
      imm: 'imm-1',
      ht: 42800,
      jours: 12,
      statut: 'EN_COURS',
      acompteAttendu: 12840,
      acompteRecu: 12840,
      lastActionDays: 0,
      commentaire: 'Benne + échafaudage en cours',
    },
    {
      num: 'D-25038',
      type: 'TRAVAUX',
      imm: 'imm-2',
      ht: 61200,
      jours: 18,
      statut: 'EN_COURS',
      acompteAttendu: 18360,
      acompteRecu: 18360,
      lastActionDays: -2,
      commentaire: 'Situation n°1 en retard',
    },
    {
      num: 'D-25055',
      type: 'TRAVAUX',
      imm: 'imm-4',
      ht: 89500,
      jours: 25,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 26850,
      acompteRecu: 0,
      lastActionDays: -18,
      commentaire: 'Signé — acompte à encaisser',
    },
    {
      num: 'D-25060',
      type: 'RESINE',
      imm: 'imm-8',
      ht: 18600,
      jours: 5,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 5580,
      acompteRecu: 5580,
      lastActionDays: -5,
      commentaire: 'Parking — à planifier',
    },
    {
      num: 'D-25061',
      type: 'NETTOYAGE',
      imm: 'imm-7',
      ht: 3200,
      jours: 1,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 0,
      acompteRecu: 0,
      lastActionDays: -3,
      commentaire: 'Divers nettoyage terrasse',
    },
    {
      num: 'D-25022',
      type: 'TRAVAUX',
      imm: 'imm-3',
      ht: 27400,
      jours: null,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 8220,
      acompteRecu: 8220,
      lastActionDays: -40,
      commentaire: 'Charge non renseignée',
    },
    {
      num: 'D-25015',
      type: 'DIVERS',
      imm: 'imm-6',
      ht: 5400,
      jours: 2,
      statut: 'SUSPENDU',
      acompteAttendu: 1620,
      acompteRecu: 1620,
      lastActionDays: -20,
      commentaire: 'Attente OS syndic',
      motif: 'Attente OS syndic',
    },
    {
      num: 'D-25048',
      type: 'TRAVAUX',
      imm: 'imm-5',
      ht: 45200,
      jours: 14,
      statut: 'PLANIFIE',
      acompteAttendu: 13560,
      acompteRecu: 13560,
      lastActionDays: -1,
      commentaire: 'Semaine +3',
    },
    {
      num: 'D-24990',
      type: 'TRAVAUX',
      imm: 'imm-1',
      ht: 19800,
      jours: 6,
      statut: 'TERMINE',
      acompteAttendu: 5940,
      acompteRecu: 5940,
      lastActionDays: -10,
      commentaire: 'Terminé — à facturer solde',
    },
    {
      num: 'D-24970',
      type: 'RESINE',
      imm: 'imm-8',
      ht: 11200,
      jours: 3,
      statut: 'FACTURE',
      acompteAttendu: 3360,
      acompteRecu: 3360,
      lastActionDays: -25,
      commentaire: 'Facture émise — impayé',
    },
    {
      num: 'D-24950',
      type: 'NETTOYAGE',
      imm: 'imm-7',
      ht: 2100,
      jours: 1,
      statut: 'SOLDE',
      acompteAttendu: 0,
      acompteRecu: 0,
      lastActionDays: -60,
      commentaire: 'Soldé',
    },
    {
      num: 'D-25070',
      type: 'TRAVAUX',
      imm: 'imm-2',
      ht: 33800,
      jours: 10,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 10140,
      acompteRecu: 10140,
      lastActionDays: -35,
      commentaire: 'Dormante — relancer syndic',
    },
    {
      num: 'D-25071',
      type: 'DIVERS',
      imm: 'imm-6',
      ht: 7800,
      jours: 3,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 2340,
      acompteRecu: 2340,
      lastActionDays: -8,
      commentaire: 'Réparation locale',
    },
    {
      num: 'D-25072',
      type: 'TRAVAUX',
      imm: 'imm-4',
      ht: 52100,
      jours: 16,
      statut: 'PORTEFEUILLE',
      acompteAttendu: 15630,
      acompteRecu: 0,
      lastActionDays: -12,
      commentaire: 'Acompte non reçu',
    },
    {
      num: 'D-25010',
      type: 'CE',
      imm: 'imm-7',
      ht: 4200,
      jours: 2,
      statut: 'PLANIFIE',
      acompteAttendu: 0,
      acompteRecu: 0,
      lastActionDays: -4,
      commentaire: 'Passage CE lié',
      devisStatut: 'SIGNE',
    },
  ];

  const devis: Devis[] = [];
  const affaires: Affaire[] = [];
  const checklists: Checklist[] = [];
  const checklistItems: ChecklistItem[] = [];
  const factures: Facture[] = [];
  const commandes: Commande[] = [];
  const demandesPrix: DemandePrix[] = [];
  const notas: Nota[] = [];
  const documents: Document[] = [];
  const journal: JournalActivite[] = [];
  const affectations: Affectation[] = [];

  rows.forEach((r, idx) => {
    const devisId = `dev-${idx + 1}`;
    const affaireId = `aff-${idx + 1}`;
    const ttc = Math.round(r.ht * 1.2);
    devis.push({
      id: devisId,
      numeroBatappli: r.num,
      date: addDays(t, r.lastActionDays - 20),
      montantHT: r.ht,
      montantTTC: ttc,
      type: r.type,
      immeubleId: r.imm,
      statut: r.devisStatut ?? 'SIGNE',
      source: idx % 4 === 0 ? 'IMPORT_EXCEL' : 'SAISIE',
    });

    const modele =
      r.type === 'RESINE'
        ? 'mod-resine'
        : r.type === 'NETTOYAGE'
          ? 'mod-nettoyage'
          : 'mod-travaux';
    const checklistId = `cl-${idx + 1}`;
    const start = addDays(t, Math.min(r.lastActionDays, 0));

    checklists.push({ id: checklistId, affaireId, modeleId: modele });
    const modeleDef = checklistModeles.find((m) => m.id === modele)!;
    modeleDef.items.forEach((it, i) => {
      const echeance = addDays(start, it.delaiJours);
      const overdueForce =
        (r.num === 'D-25041' && i < 2) ||
        (r.num === 'D-25038' && i < 4) ||
        (r.num === 'D-24990' && i < 10);
      const fait = overdueForce || (r.statut === 'SOLDE' && true);
      checklistItems.push({
        id: `cli-${idx + 1}-${i + 1}`,
        checklistId,
        libelle: it.libelle,
        obligatoire: it.obligatoire,
        echeance,
        fait: r.statut === 'SOLDE' ? true : fait && i < (r.num === 'D-25038' ? 3 : 2),
        dateFait: fait ? isoAt(addDays(echeance, -1), '10:00:00') : undefined,
        faitPar: fait ? 'Melissa' : undefined,
        commentaire: '',
        ordre: i,
        manuel: false,
        history: [],
      });
    });

    // Corrige quelques items en retard explicites
    if (r.num === 'D-25041') {
      const benne = checklistItems.find(
        (x) => x.checklistId === checklistId && x.libelle.includes('bennes'),
      );
      if (benne) {
        benne.fait = false;
        benne.echeance = addDays(t, -2);
        benne.dateFait = undefined;
        benne.faitPar = undefined;
      }
      const ech = checklistItems.find(
        (x) => x.checklistId === checklistId && x.libelle.includes('échafaudage'),
      );
      if (ech) {
        ech.fait = false;
        ech.echeance = addDays(t, -1);
        ech.dateFait = undefined;
      }
    }
    if (r.num === 'D-25038') {
      const sit = checklistItems.find(
        (x) => x.checklistId === checklistId && x.libelle.includes('Situation'),
      );
      if (sit) {
        sit.fait = false;
        sit.echeance = addDays(t, -8);
        sit.dateFait = undefined;
      }
    }

    affaires.push({
      id: affaireId,
      devisId,
      immeubleId: r.imm,
      statut: r.statut,
      joursChargeEstimes: r.jours,
      acompteAttendu: r.acompteAttendu,
      acompteRecu: r.acompteRecu,
      dateAcompte: r.acompteRecu > 0 ? addDays(t, r.lastActionDays - 5) : undefined,
      motifSuspension: r.motif,
      dateMotif: r.motif ? addDays(t, r.lastActionDays) : undefined,
      dateDerniereAction: addDays(t, r.lastActionDays),
      checklistId,
      commentaire: r.commentaire,
    });

    if (r.acompteRecu > 0 && r.statut !== 'SOLDE') {
      const emDate = addDays(t, r.lastActionDays - 5);
      const regDate = addDays(t, r.lastActionDays - 3);
      factures.push({
        id: `fac-ac-${idx + 1}`,
        affaireId,
        numero: `FA-AC-${r.num.slice(2)}`,
        type: 'ACOMPTE',
        dateEmission: emDate,
        montant: r.acompteRecu,
        statut: 'REGLEE',
        dateReglement: regDate,
        relances: [],
        fichierPdf: `FA-AC-${r.num.slice(2)}.pdf`,
        creePar: 'melissa',
        creeParNom: 'Melissa',
        createdAt: `${emDate}T09:15:00.000Z`,
        historique: [
          {
            id: `h-fac-ac-${idx}-1`,
            at: `${emDate}T09:15:00.000Z`,
            userId: 'melissa',
            userName: 'Melissa',
            action: 'Émission',
            detail: `Acompte ${r.acompteRecu.toLocaleString('fr-FR')} €`,
          },
          {
            id: `h-fac-ac-${idx}-2`,
            at: `${regDate}T14:30:00.000Z`,
            userId: 'melissa',
            userName: 'Melissa',
            action: 'Règlement enregistré',
            detail: 'Virement reçu',
          },
        ],
      });
    }
    if (r.num === 'D-24970') {
      factures.push({
        id: 'fac-solde-resine',
        affaireId,
        numero: 'FA-24970',
        type: 'SOLDE',
        dateEmission: addDays(t, -31),
        montant: Math.round(r.ht * 1.2),
        statut: 'RELANCEE',
        relances: [
          {
            niveau: 1,
            date: addDays(t, -1),
            commentaire: 'Relance mail syndic',
            parUserId: 'melissa',
            parNom: 'Melissa',
          },
        ],
        fichierPdf: 'FA-24970-solde.pdf',
        creePar: 'melissa',
        creeParNom: 'Melissa',
        createdAt: `${addDays(t, -31)}T10:00:00.000Z`,
        historique: [
          {
            id: 'h-fac-24970-1',
            at: `${addDays(t, -31)}T10:00:00.000Z`,
            userId: 'melissa',
            userName: 'Melissa',
            action: 'Émission',
            detail: 'Facture de solde',
          },
          {
            id: 'h-fac-24970-2',
            at: `${addDays(t, -1)}T11:20:00.000Z`,
            userId: 'melissa',
            userName: 'Melissa',
            action: 'Relance niveau 1',
            detail: 'Relance mail syndic',
          },
        ],
      });
    }
    if (r.num === 'D-24990') {
      /* terminé non facturé — pas de facture solde */
    }

    if (r.num === 'D-25041') {
      commandes.push(
        {
          id: 'cmd-1',
          affaireId,
          type: 'BENNE',
          fournisseur: 'Bennes IDF',
          dateBesoin: addDays(t, 2), // J-2 → alerte J-3 active
          montant: 480,
          statut: 'A_PASSER',
          creePar: 'valerie',
          creeParNom: 'Valérie',
          createdAt: `${addDays(t, -3)}T08:40:00.000Z`,
          historique: [
            {
              id: 'h-cmd-1-1',
              at: `${addDays(t, -3)}T08:40:00.000Z`,
              userId: 'valerie',
              userName: 'Valérie',
              action: 'Création',
              detail: 'Besoin chantier — à passer avant date besoin',
            },
          ],
        },
        {
          id: 'cmd-2',
          affaireId,
          type: 'ECHAFAUDAGE',
          fournisseur: 'Échafaudages Nord',
          dateBesoin: addDays(t, 2),
          dateCommande: addDays(t, -1),
          montant: 3200,
          statut: 'COMMANDEE',
          bonCommande: 'BC-8841.pdf',
          creePar: 'valerie',
          creeParNom: 'Valérie',
          createdAt: `${addDays(t, -5)}T09:00:00.000Z`,
          historique: [
            {
              id: 'h-cmd-2-1',
              at: `${addDays(t, -5)}T09:00:00.000Z`,
              userId: 'valerie',
              userName: 'Valérie',
              action: 'Création',
              detail: 'Échafaudage 3 semaines',
            },
            {
              id: 'h-cmd-2-2',
              at: `${addDays(t, -1)}T16:10:00.000Z`,
              userId: 'audrey',
              userName: 'Audrey',
              action: 'Commande passée',
              detail: 'BC-8841.pdf joint',
            },
          ],
        },
        {
          id: 'cmd-3',
          affaireId,
          type: 'ROULOTTE',
          fournisseur: 'Roulottes Pro',
          dateBesoin: addDays(t, 5),
          montant: 900,
          statut: 'A_PASSER',
          creePar: 'philippe',
          creeParNom: 'Philippe',
          createdAt: `${addDays(t, -2)}T07:55:00.000Z`,
          historique: [
            {
              id: 'h-cmd-3-1',
              at: `${addDays(t, -2)}T07:55:00.000Z`,
              userId: 'philippe',
              userName: 'Philippe',
              action: 'Création',
              detail: 'En attente retour demande de prix',
            },
          ],
        },
      );
      demandesPrix.push({
        id: 'dp-1',
        affaireId,
        fournisseur: 'Roulottes Pro',
        objet: 'Location roulotte 4 semaines',
        dateDemande: addDays(t, -10),
        statut: 'ENVOYEE',
        creePar: 'audrey',
        creeParNom: 'Audrey',
        createdAt: `${addDays(t, -10)}T10:05:00.000Z`,
        historique: [
          {
            id: 'h-dp-1-1',
            at: `${addDays(t, -10)}T10:05:00.000Z`,
            userId: 'audrey',
            userName: 'Audrey',
            action: 'Envoi demande de prix',
            detail: 'Mail + plan d’implantation',
          },
        ],
      });
    }

    if (r.statut === 'EN_COURS' || r.statut === 'PLANIFIE') {
      affectations.push({
        id: `affec-${idx + 1}`,
        date: r.statut === 'EN_COURS' ? t : addDays(t, 21),
        equipeId: idx % 2 === 0 ? 'eq-a' : 'eq-b',
        affaireId,
        type: 'CHANTIER',
        commentaire: r.num,
      });
      if (r.statut === 'EN_COURS') {
        // 2e jour pour montrer les jours consommés
        affectations.push({
          id: `affec-${idx + 1}b`,
          date: addDays(t, r.num === 'D-25041' ? 1 : -1),
          equipeId: idx % 2 === 0 ? 'eq-a' : 'eq-b',
          affaireId,
          type: 'CHANTIER',
          commentaire: r.num,
        });
      }
    }
  });

  // Exemples types natifs sur la semaine courante
  affectations.push(
    {
      id: 'affec-conges-1',
      date: addDays(t, 2),
      equipeId: 'eq-c',
      type: 'CONGES',
      commentaire: 'Congés',
    },
    {
      id: 'affec-rdv-1',
      date: addDays(t, 3),
      equipeId: 'eq-a',
      type: 'RDV',
      commentaire: 'RDV syndic',
    },
  );

  // Devis signé / en attente sans affaire — pour tester l'enregistrement (jours de charge obligatoires)
  devis.push({
    id: 'dev-nouveau',
    numeroBatappli: 'D-25099',
    date: addDays(t, -2),
    montantHT: 15600,
    montantTTC: 18720,
    type: 'TRAVAUX',
    immeubleId: 'imm-2',
    statut: 'EN_ATTENTE',
    source: 'SAISIE',
  });
  devis.push({
    id: 'dev-signe-libre',
    numeroBatappli: 'D-25100',
    date: addDays(t, -1),
    montantHT: 8400,
    montantTTC: 10080,
    type: 'DIVERS',
    immeubleId: 'imm-6',
    statut: 'SIGNE',
    source: 'SAISIE',
  });

  // Contrats CE
  const prevMonth = ((new Date().getMonth() + 11) % 12) + 1;
  const nextMonth = ((new Date().getMonth() + 1) % 12) + 1;
  const inTwoMonths = ((new Date().getMonth() + 2) % 12) + 1;

  const contrats: ContratEntretien[] = [
    {
      id: 'ce-1',
      immeubleId: 'imm-7',
      syndicId: 'syn-4',
      montantHTAnnuel: 4200,
      nbCompagnons: 2,
      nbJours: 2,
      moisPassageContractuel: prevMonth,
      exerciceDebut: '07-01',
      exerciceFin: '06-30',
      taciteReconduction: true,
      preavisMois: 3,
      statut: 'ACTIF',
      commentaire: 'Copro Acacias — engagement mois précédent',
    },
    {
      id: 'ce-2',
      immeubleId: 'imm-5',
      syndicId: 'syn-5',
      montantHTAnnuel: 9800,
      nbCompagnons: 3,
      nbJours: 4,
      moisPassageContractuel: inTwoMonths,
      exerciceDebut: '07-01',
      exerciceFin: '06-30',
      taciteReconduction: true,
      preavisMois: 3,
      statut: 'ACTIF',
      commentaire: 'Écoles Pantin',
    },
    {
      id: 'ce-3',
      immeubleId: 'imm-3',
      syndicId: 'syn-3',
      montantHTAnnuel: 5600,
      nbCompagnons: 2,
      nbJours: 2,
      moisPassageContractuel: nextMonth,
      exerciceDebut: '07-01',
      exerciceFin: '06-30',
      taciteReconduction: true,
      preavisMois: 3,
      statut: 'ATTENTE_OS',
      commentaire: 'Attente OS',
    },
    {
      id: 'ce-4',
      immeubleId: 'imm-1',
      syndicId: 'syn-1',
      montantHTAnnuel: 7200,
      nbCompagnons: 2,
      nbJours: 3,
      moisPassageContractuel: 9, // septembre
      exerciceDebut: '07-01',
      exerciceFin: '06-30',
      taciteReconduction: true,
      preavisMois: 3,
      statut: 'EN_RESILIATION',
      dateEffetResiliation: addDays(t, 60),
      commentaire: 'Préavis en cours',
    },
    {
      id: 'ce-5',
      immeubleId: 'imm-2',
      syndicId: 'syn-2',
      montantHTAnnuel: 3100,
      nbCompagnons: 1,
      nbJours: 1,
      moisPassageContractuel: 4,
      exerciceDebut: '07-01',
      exerciceFin: '06-30',
      taciteReconduction: false,
      preavisMois: 3,
      statut: 'RESILIE',
      commentaire: 'Résilié — archivé historique',
    },
  ];

  // Exercice courant (bascule au 1er juillet, pas au 1er janvier)
  const exercice = currentExercice(t).label;

  const passagesCe: PassageCE[] = [
    {
      id: 'pass-1',
      contratId: 'ce-1',
      exercice,
      statut: 'HORS_DELAI',
      photos: [],
      compteRendu: '',
    },
    {
      id: 'pass-2',
      contratId: 'ce-2',
      exercice,
      datePrevue: addDays(t, 40),
      equipeId: 'eq-c',
      statut: 'PROGRAMME',
      photos: [],
      compteRendu: '',
    },
    {
      id: 'pass-3',
      contratId: 'ce-3',
      exercice,
      statut: 'A_PROGRAMMER',
      photos: [],
      compteRendu: '',
    },
    {
      id: 'pass-4',
      contratId: 'ce-4',
      exercice,
      dateRealisee: addDays(t, -10),
      bonIntervention: 'BI-CE-4412.pdf',
      photos: [],
      statut: 'REALISE',
      compteRendu: 'Passage OK — à facturer',
    },
  ];

  const messages: Message[] = [
    {
      id: 'msg-1',
      auteurId: 'denis',
      destinataires: ['valerie', 'philippe', 'melissa', 'audrey'],
      threadId: 'general',
      corps: 'Briefing : prioriser échafaudage + bennes Dupont. RAS sur le reste.',
      piecesJointes: [],
      luPar: ['denis'],
      date: isoAt(t, '07:45:00'),
      isImportant: false,
    },
    {
      id: 'msg-2',
      auteurId: 'valerie',
      destinataires: ['denis', 'philippe'],
      threadId: 'aff-1',
      affaireId: 'aff-1',
      corps: 'Pas de benne sur place demain matin — à traiter en urgence.',
      piecesJointes: [],
      luPar: ['valerie'],
      date: isoAt(t, '08:10:00'),
      isImportant: true,
    },
    {
      id: 'msg-3',
      auteurId: 'philippe',
      destinataires: ['denis', 'valerie'],
      threadId: 'aff-2',
      affaireId: 'aff-2',
      corps: 'Situation n°1 Voltaire bloquée — devis complémentaire demandé par le syndic.',
      piecesJointes: [],
      luPar: ['philippe', 'valerie'],
      date: isoAt(addDays(t, -1), '11:05:00'),
      isImportant: false,
    },
  ];

  notas.push(
    {
      id: 'nota-1',
      objet: 'Acompte non reçu — Gymnase Est (D-25055)',
      type: 'AUTO',
      entiteLiee: 'affaire:aff-3',
      echeance: addDays(t, -3),
      responsableId: 'melissa',
      priorite: 'bloquante',
      statut: 'OUVERT',
      creePar: 'systeme',
      createdAt: isoAt(addDays(t, -3), '08:00:00'),
    },
    {
      id: 'nota-2',
      objet: 'Commande de bennes à passer — Dupont',
      type: 'AUTO',
      entiteLiee: 'commande:cmd-1',
      echeance: addDays(t, -1),
      responsableId: 'valerie',
      priorite: 'haute',
      statut: 'OUVERT',
      creePar: 'systeme',
      createdAt: isoAt(addDays(t, -1), '08:00:00'),
    },
    {
      id: 'nota-3',
      objet: 'Relancer Roulottes Pro (demande de prix)',
      type: 'AUTO',
      entiteLiee: 'demandePrix:dp-1',
      echeance: t,
      responsableId: 'audrey',
      priorite: 'normale',
      statut: 'OUVERT',
      creePar: 'systeme',
      createdAt: isoAt(t, '08:00:00'),
    },
    {
      id: 'nota-4',
      objet: 'Passage CE Acacias HORS DÉLAI — escalade dirigeant',
      type: 'AUTO',
      entiteLiee: 'passage:pass-1',
      echeance: t,
      responsableId: 'denis',
      priorite: 'bloquante',
      statut: 'OUVERT',
      creePar: 'systeme',
      createdAt: isoAt(t, '08:00:00'),
    },
    {
      id: 'nota-5',
      objet: 'Appeler syndic Voltaire pour OS complémentaire',
      type: 'MANUEL',
      entiteLiee: 'affaire:aff-2',
      echeance: addDays(t, 2),
      responsableId: 'philippe',
      priorite: 'normale',
      statut: 'OUVERT',
      creePar: 'philippe',
      createdAt: isoAt(addDays(t, -1), '16:00:00'),
    },
  );

  journal.push(
    {
      id: 'j-1',
      utilisateurId: 'melissa',
      entite: 'affaire:aff-1',
      action: 'création',
      valeurApres: 'Affaire créée depuis devis signé',
      horodatage: isoAt(addDays(t, -25), '09:15:00'),
    },
    {
      id: 'j-2',
      utilisateurId: 'melissa',
      entite: 'affaire:aff-1',
      action: 'check_item',
      valeurAvant: 'non fait',
      valeurApres: "Facturation d'acompte — coché",
      horodatage: isoAt(addDays(t, -9), '10:30:00'),
    },
    {
      id: 'j-3',
      utilisateurId: 'melissa',
      entite: 'facture:fac-ac-1',
      action: 'émission',
      valeurApres: 'Facture acompte FA-AC-25041 émise',
      horodatage: isoAt(addDays(t, -5), '09:15:00'),
    },
    {
      id: 'j-4',
      utilisateurId: 'audrey',
      entite: 'commande:cmd-2',
      action: 'commande',
      valeurAvant: 'A_PASSER',
      valeurApres: 'COMMANDEE — Échafaudage BC-8841',
      horodatage: isoAt(addDays(t, -1), '16:10:00'),
    },
    {
      id: 'j-5',
      utilisateurId: 'valerie',
      entite: 'affaire:aff-1',
      action: 'mise à jour',
      valeurAvant: 'joursChargeEstimes=null',
      valeurApres: 'joursChargeEstimes=8',
      horodatage: isoAt(addDays(t, -24), '16:45:00'),
    },
    {
      id: 'j-6',
      utilisateurId: 'philippe',
      entite: 'affaire:aff-1',
      action: 'statut',
      valeurAvant: 'PORTEFEUILLE',
      valeurApres: 'PLANIFIE',
      horodatage: isoAt(addDays(t, -12), '08:40:00'),
    },
  );

  documents.push(
    {
      id: 'doc-1',
      entiteLiee: 'affaire:aff-1',
      type: 'DEVIS',
      fichier: '#',
      nomFichier: 'D-25041-signe.pdf',
      date: addDays(t, -25),
      deposePar: 'melissa',
      deposeParNom: 'Melissa',
    },
    {
      id: 'doc-2',
      entiteLiee: 'affaire:aff-1',
      type: 'PLAN',
      fichier: '#',
      nomFichier: 'Plan toiture.pdf',
      date: addDays(t, -20),
      deposePar: 'philippe',
      deposeParNom: 'Philippe',
    },
    {
      id: 'doc-3',
      entiteLiee: 'contrat:ce-1',
      type: 'BON',
      fichier: '#',
      nomFichier: 'Contrat CE Acacias.pdf',
      date: addDays(t, -100),
      deposePar: 'valerie',
      deposeParNom: 'Valérie',
    },
    {
      id: 'doc-4',
      entiteLiee: 'immeuble:imm-1',
      type: 'PHOTO',
      fichier: '#',
      nomFichier: 'Photo avant.jpg',
      date: addDays(t, -4),
      deposePar: 'philippe',
      deposeParNom: 'Philippe',
    },
    {
      id: 'doc-5',
      entiteLiee: 'affaire:aff-1',
      type: 'PV',
      fichier: '#',
      nomFichier: 'PV reunion demarrage.pdf',
      date: addDays(t, -8),
      deposePar: 'denis',
      deposeParNom: 'Denis',
    },
  );

  return {
    version: 18,
    sessionUserId: null,
    utilisateurs,
    syndics,
    immeubles,
    devis,
    affaires,
    contrats,
    passagesCe,
    equipes,
    affectations,
    checklistModeles,
    checklists,
    checklistItems,
    actions: [],
    notas,
    factures,
    commandes,
    demandesPrix,
    messages,
    documents,
    journal,
    settings: {
      alertDelais: { ...DEFAULT_ALERT_DELAIS },
      joursFeries: [...JOURS_FERIES_FR],
      importMappings: {},
      colorCodes: { ...DEFAULT_COLOR_CODES },
      commandeTypeLabels: { ...DEFAULT_COMMANDE_TYPE_LABELS },
    },
  };
}
