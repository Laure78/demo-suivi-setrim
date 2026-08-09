/**
 * Cycle de vie unique : le devis validé = l'AFFAIRE.
 * Tout le reste (tâches/alertes, planning, CE, facturation) en découle.
 */

import { prisma } from '@/lib/prisma';
import { AffaireStatut, AffaireType, FactureType } from '@prisma/client';
import { MODELES_TACHES } from '@/lib/format';
import { syncChantiersAuPlanning, resyncAffaireSlots } from '@/lib/planning';
import { assurerFichesClients } from '@/lib/clients';

function addDaysUTC(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** À la naissance d'une affaire (devis travaux validé / importé). */
export async function creerTachesDepuisDevis(
  affaireId: string,
  opts?: { responsableId?: string },
) {
  const a = await prisma.affaire.findUnique({ where: { id: affaireId } });
  if (!a) return { created: 0 };

  const existing = await prisma.tache.count({ where: { affaireId } });
  if (existing > 0) return { created: 0 };

  const responsableId = opts?.responsableId ?? 'audrey';
  const anchor = a.dateDebut ?? a.dateDevis ?? new Date();
  const end = a.dateFin ?? addDaysUTC(anchor, Math.max(0, (a.joursCharge || 1) - 1));

  let created = 0;
  for (const m of MODELES_TACHES) {
    // Relance impayé = seulement après facture (créée à part)
    if ('afterInvoice' in m && m.afterInvoice) continue;

    let echeance: Date;
    if ('afterEnd' in m && m.afterEnd) {
      echeance = addDaysUTC(end, m.offsetDays);
    } else {
      echeance = addDaysUTC(anchor, m.offsetDays);
    }

    // Acompte à la signature (date devis)
    if (m.titre.includes("acompte")) {
      echeance = a.dateDevis ? new Date(a.dateDevis) : new Date();
    }

    await prisma.tache.create({
      data: {
        titre: m.titre,
        affaireId: a.id,
        libelleAffaire: `${a.client} · ${a.adresse.split(',')[0]}`,
        responsableId: m.titre.toLowerCase().includes('facture') ? 'valerie' : responsableId,
        dateEcheance: echeance,
        niveau: m.niveau,
      },
    });
    created++;
  }

  // Pièce devis si absente
  const hasDevis = await prisma.piece.findFirst({
    where: { affaireId: a.id, titre: { contains: 'Devis' } },
  });
  if (!hasDevis) {
    await prisma.piece.create({
      data: {
        affaireId: a.id,
        titre: `Devis Batappli ${a.numeroDevis}`,
        type: 'devis',
        auteurId: responsableId === 'audrey' ? 'audrey' : null,
      },
    });
  }

  return { created };
}

/**
 * Programmer l'affaire au planning = date d'intervention posée.
 * Statut → PROGRAMMÉ, créneaux planning, échéances des tâches recalées.
 */
export async function programmerAffaire(
  affaireId: string,
  input: {
    dateDebut: Date;
    joursCharge?: number;
    equipeId?: string;
  },
) {
  const a = await prisma.affaire.findUnique({ where: { id: affaireId } });
  if (!a) throw new Error('Affaire introuvable');

  // CE = RDV court (½ j à 1 j) → 1 jour ouvré max au planning
  const isCe =
    a.type === AffaireType.contrat_entretien || !!a.contratEntretienId;
  const jours = isCe ? 1 : (input.joursCharge ?? (a.joursCharge || 1));
  const start = new Date(input.dateDebut);
  start.setUTCHours(12, 0, 0, 0);
  let end = new Date(start);
  let added = 0;
  while (added < Math.max(0, jours - 1)) {
    end = addDaysUTC(end, 1);
    const dow = end.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }

  let equipeId = input.equipeId ?? a.equipeId;
  if (!equipeId) {
    const eq = await prisma.equipe.findFirst({
      where: { categorie: 'equipe' },
      orderBy: { ordre: 'asc' },
    });
    equipeId = eq?.id ?? null;
  }

  const updated = await prisma.affaire.update({
    where: { id: affaireId },
    data: {
      dateDebut: start,
      dateFin: end,
      joursCharge: jours,
      equipeId,
      statut:
        a.statut === AffaireStatut.solde || a.statut === AffaireStatut.encours
          ? a.statut
          : AffaireStatut.programme,
      // Si CE et date posée → contrat en "pose"
    },
  });

  if (a.contratEntretienId) {
    await prisma.contratEntretien.update({
      where: { id: a.contratEntretienId },
      data: { datePosee: start, etat: 'pose' },
    });
  }

  // Recaler les tâches ouvertes sur la nouvelle date d'intervention
  const taches = await prisma.tache.findMany({
    where: { affaireId, fait: false },
  });
  for (const t of taches) {
    const modele = MODELES_TACHES.find((m) => t.titre.startsWith(m.titre.slice(0, 20)));
    if (!modele) continue;
    let echeance: Date;
    if ('afterEnd' in modele && modele.afterEnd) {
      echeance = addDaysUTC(end, modele.offsetDays);
    } else if (modele.titre.includes('acompte')) {
      continue; // garde l'échéance signature
    } else {
      echeance = addDaysUTC(start, modele.offsetDays);
    }
    await prisma.tache.update({
      where: { id: t.id },
      data: { dateEcheance: echeance },
    });
  }

  // Cocher / créer tâche « caler la date » si CE
  await prisma.tache.updateMany({
    where: {
      affaireId,
      titre: { contains: 'Caler la date' },
      fait: false,
    },
    data: { fait: true, faitAt: new Date() },
  });

  if (isCe) {
    // Ancienne alerte « date non posée » → faite
    await prisma.tache.updateMany({
      where: {
        affaireId,
        titre: { contains: 'date CE non posée' },
        fait: false,
      },
      data: { fait: true, faitAt: new Date() },
    });
    // Recaler l’alerte J-15 sur la vraie date d’entretien
    const j15 = addDaysUTC(start, -15);
    const existingJ15 = await prisma.tache.findFirst({
      where: {
        affaireId,
        OR: [
          { titre: { contains: 'entretien annuel (J-15)' } },
          { titre: { contains: 'Préparer l\'entretien annuel' } },
        ],
      },
    });
    if (existingJ15) {
      if (!existingJ15.fait) {
        await prisma.tache.update({
          where: { id: existingJ15.id },
          data: { dateEcheance: j15 },
        });
      }
    } else {
      await prisma.tache.create({
        data: {
          titre: `Préparer l'entretien annuel (J-15)`,
          affaireId,
          libelleAffaire: `${a.client} · CE`,
          responsableId: 'audrey',
          dateEcheance: j15,
          niveau: 3,
        },
      });
    }
  }

  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  await resyncAffaireSlots(affaireId);
  // Mois voisin si la période déborde (sécurité agenda mensuel)
  await syncChantiersAuPlanning(y, m);
  if (end.getUTCMonth() !== m || end.getUTCFullYear() !== y) {
    await syncChantiersAuPlanning(end.getUTCFullYear(), end.getUTCMonth());
  }

  return updated;
}

/** Émettre une facture liée à l'affaire + cocher la tâche associée. */
export async function emettreFacture(
  affaireId: string,
  type: 'acompte' | 'solde',
  montant?: number,
) {
  const a = await prisma.affaire.findUnique({
    where: { id: affaireId },
    include: { factures: true },
  });
  if (!a) throw new Error('Affaire introuvable');

  const already = a.factures.find((f) => f.type === type);
  if (already) return already;

  const mt =
    montant ??
    (type === 'acompte'
      ? Number(a.acompteHt) || Math.round(Number(a.montantHt) * 0.3 * 100) / 100
      : Math.max(0, Number(a.montantHt) - Number(a.acompteHt)));

  const facture = await prisma.facture.create({
    data: {
      affaireId,
      type: type === 'acompte' ? FactureType.acompte : FactureType.solde,
      montant: mt,
      dateEmission: new Date(),
    },
  });

  if (type === 'acompte' && !Number(a.acompteHt)) {
    await prisma.affaire.update({
      where: { id: affaireId },
      data: { acompteHt: mt },
    });
  }

  // Éteindre l'alerte facture correspondante
  const motif = type === 'acompte' ? 'acompte' : 'solde';
  await prisma.tache.updateMany({
    where: {
      affaireId,
      fait: false,
      titre: { contains: motif, mode: 'insensitive' },
    },
    data: { fait: true, faitAt: new Date() },
  });

  // Relance impayé J+30 après émission
  if (type === 'solde' || type === 'acompte') {
    const hasRelance = await prisma.tache.findFirst({
      where: { affaireId, titre: { contains: 'Relance impayé' } },
    });
    if (!hasRelance) {
      await prisma.tache.create({
        data: {
          titre: `Relance impayé — ${type === 'acompte' ? 'acompte' : 'solde'} ${a.numeroDevis}`,
          affaireId,
          libelleAffaire: `${a.client} · ${a.adresse.split(',')[0]}`,
          responsableId: 'valerie',
          dateEcheance: addDaysUTC(new Date(), 30),
          niveau: 3,
        },
      });
    }
  }

  if (type === 'solde') {
    await prisma.affaire.update({
      where: { id: affaireId },
      data: { statut: AffaireStatut.solde, dateFin: a.dateFin ?? new Date() },
    });
  }

  return facture;
}

/** Met à jour le traitement : non émise | émise | encaissée. */
export async function setFactureTraitement(
  affaireId: string,
  type: 'acompte' | 'solde',
  statut: 'non_emise' | 'emise' | 'encaissee',
) {
  const a = await prisma.affaire.findUnique({
    where: { id: affaireId },
    include: { factures: true },
  });
  if (!a) throw new Error('Affaire introuvable');

  let facture = a.factures.find((f) => f.type === type) ?? null;

  if (statut === 'non_emise') {
    if (facture) {
      await prisma.facture.delete({ where: { id: facture.id } });
    }
    // Rouvrir la tâche facture associée
    const motif = type === 'acompte' ? 'acompte' : 'solde';
    await prisma.tache.updateMany({
      where: {
        affaireId,
        fait: true,
        titre: { contains: motif, mode: 'insensitive' },
      },
      data: { fait: false, faitAt: null },
    });
    return { ok: true, statut: 'non_emise' as const };
  }

  if (!facture) {
    facture = await emettreFacture(affaireId, type);
  } else if (!facture.dateEmission) {
    facture = await prisma.facture.update({
      where: { id: facture.id },
      data: { dateEmission: new Date() },
    });
  }

  if (statut === 'emise') {
    facture = await prisma.facture.update({
      where: { id: facture.id },
      data: { dateEncaissement: null },
    });
    return { ok: true, statut: 'emise' as const, factureId: facture.id };
  }

  // encaissee
  facture = await prisma.facture.update({
    where: { id: facture.id },
    data: {
      dateEmission: facture.dateEmission ?? new Date(),
      dateEncaissement: new Date(),
    },
  });

  await prisma.tache.updateMany({
    where: {
      affaireId,
      fait: false,
      OR: [
        { titre: { contains: 'Relance impayé', mode: 'insensitive' } },
        {
          titre: {
            contains: type === 'acompte' ? 'acompte' : 'solde',
            mode: 'insensitive',
          },
        },
      ],
    },
    data: { fait: true, faitAt: new Date() },
  });

  return { ok: true, statut: 'encaissee' as const, factureId: facture.id };
}

/** Exercice CE : chaque contrat → affaire anniversaire + alertes + planning. */
export async function genererLiensContratsExercice(exercice: string) {
  const contrats = await prisma.contratEntretien.findMany({ where: { exercice } });
  let created = 0;

  for (const c of contrats) {
    const shortId = c.id.slice(-6);
    const numeroDevis = `CE-${exercice.replace('-', '')}-${shortId.toUpperCase()}`;
    const numeroLegacy = `CE-${exercice}-${shortId}`;
    let affaire = await prisma.affaire.findFirst({
      where: {
        OR: [
          { contratEntretienId: c.id },
          { numeroDevis },
          { numeroDevis: numeroLegacy },
        ],
      },
    });

    const [startYear] = exercice.split('-').map(Number);
    const calendarMonth = (6 + c.moisContractuel) % 12;
    const year = c.moisContractuel <= 5 ? startYear : startYear + 1;
    const dateAnniversaire = new Date(Date.UTC(year, calendarMonth, 1, 12, 0, 0));

    if (!affaire) {
      affaire = await prisma.affaire.create({
        data: {
          numeroDevis,
          client: c.syndic,
          adresse: c.immeuble,
          montantHt: c.montantHt,
          // RDV entretien : ½ journée à 1 journée
          joursCharge: 1,
          statut: AffaireStatut.commande,
          type: AffaireType.contrat_entretien,
          dateDevis: dateAnniversaire,
          dateDebut: c.datePosee ?? dateAnniversaire,
          contratEntretienId: c.id,
          note: `CE — mois contractuel (anniversaire) ${calendarMonth + 1}/${year} · RDV ½ j à 1 j`,
        },
      });
      created++;
    } else if (!affaire.contratEntretienId) {
      await prisma.affaire.update({
        where: { id: affaire.id },
        data: { contratEntretienId: c.id, joursCharge: 1 },
      });
    } else if (affaire.joursCharge !== 1) {
      await prisma.affaire.update({
        where: { id: affaire.id },
        data: { joursCharge: 1 },
      });
    }

    // Date annuelle d’entretien = date posée, sinon 1er du mois contractuel
    const dateEntretien = c.datePosee ?? dateAnniversaire;

    // Alertes : J-30 caler la date · J-15 avant l’entretien · facture après
    const tachesCe: {
      titre: string;
      echeance: Date;
      niveau: number;
      qui: string;
      fait?: boolean;
    }[] = [
      {
        titre: `Caler la date du contrat d'entretien (mois contractuel)`,
        echeance: addDaysUTC(dateAnniversaire, -30),
        niveau: 2,
        qui: 'audrey',
        fait: !!c.datePosee,
      },
      {
        titre: `Préparer l'entretien annuel (J-15)`,
        echeance: addDaysUTC(dateEntretien, -15),
        niveau: 3,
        qui: 'audrey',
      },
      {
        titre: `Facture de solde — contrat d'entretien`,
        echeance: addDaysUTC(dateEntretien, 1),
        niveau: 3,
        qui: 'valerie',
      },
    ];

    // Remplacer l’ancienne alerte « date non posée »
    await prisma.tache.updateMany({
      where: {
        affaireId: affaire.id,
        titre: { contains: 'date CE non posée' },
        fait: false,
      },
      data: {
        fait: true,
        faitAt: new Date(),
      },
    });

    for (const t of tachesCe) {
      const exists = await prisma.tache.findFirst({
        where: { affaireId: affaire.id, titre: t.titre },
      });
      if (exists) {
        if (!exists.fait) {
          await prisma.tache.update({
            where: { id: exists.id },
            data: {
              dateEcheance: t.echeance,
              ...(t.fait
                ? { fait: true, faitAt: exists.faitAt ?? new Date() }
                : {}),
            },
          });
        }
        continue;
      }
      await prisma.tache.create({
        data: {
          titre: t.titre,
          affaireId: affaire.id,
          libelleAffaire: `CE · ${c.syndic}`,
          responsableId: t.qui,
          dateEcheance: t.echeance,
          niveau: t.niveau,
          fait: !!t.fait,
          faitAt: t.fait ? new Date() : null,
        },
      });
    }

    // Si date posée ou mois anniversaire → programmer au planning (1 j max)
    if (c.datePosee || c.etat === 'pose') {
      await programmerAffaire(affaire.id, {
        dateDebut: c.datePosee ?? dateAnniversaire,
        joursCharge: 1,
      });
    } else {
      // Au moins positionner le mois anniversaire comme programmé pour sync planning
      await prisma.affaire.update({
        where: { id: affaire.id },
        data: {
          dateDebut: dateAnniversaire,
          dateFin: dateAnniversaire,
          statut: AffaireStatut.programme,
        },
      });
      await syncChantiersAuPlanning(year, calendarMonth);
    }

    // Mettre à jour état alerte si mois dépassé sans date
    const now = new Date();
    if (!c.datePosee && dateAnniversaire < now && c.etat !== 'pose') {
      await prisma.contratEntretien.update({
        where: { id: c.id },
        data: {
          etat: 'alert',
          note: c.note.includes('dépassé')
            ? c.note
            : `Mois contractuel dépassé — aucune date posée`,
        },
      });
    }
  }

  return { created, total: contrats.length };
}

/** Boot / sync global : CE exercice courant + tâches manquantes sur devis travaux. */
export async function assurerLiensGlobaux() {
  const exercice = '2026-2027';
  await genererLiensContratsExercice(exercice);
  await assurerFichesClients();

  const sansTaches = await prisma.affaire.findMany({
    where: {
      type: AffaireType.travaux,
      taches: { none: {} },
    },
    take: 50,
  });
  for (const a of sansTaches) {
    await creerTachesDepuisDevis(a.id);
  }

  const now = new Date();
  await syncChantiersAuPlanning(now.getFullYear(), now.getMonth());
}
