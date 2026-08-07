import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { daysLate } from '@/lib/format';
import { emettreFacture, programmerAffaire, setFactureTraitement } from '@/lib/affaire-lifecycle';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const a = await prisma.affaire.findUnique({
    where: { id },
    include: {
      taches: {
        include: { responsable: { select: { id: true, nom: true } } },
        orderBy: [{ fait: 'asc' }, { niveau: 'desc' }, { dateEcheance: 'asc' }],
      },
      messages: {
        include: { auteur: { select: { nom: true } } },
        orderBy: { createdAt: 'asc' },
      },
      pieces: { orderBy: { createdAt: 'desc' } },
      factures: true,
      equipe: { select: { id: true, nom: true } },
      contratEntretien: {
        select: {
          id: true,
          moisContractuel: true,
          exercice: true,
          datePosee: true,
          etat: true,
        },
      },
      slots: {
        orderBy: { date: 'asc' },
        take: 30,
        include: { equipe: { select: { nom: true } } },
      },
    },
  });
  if (!a) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  const threadMsgs = await prisma.message.findMany({
    where: { threadKey: a.numeroDevis },
    include: { auteur: { select: { nom: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({
    id: a.id,
    numeroDevis: a.numeroDevis,
    client: a.client,
    adresse: a.adresse,
    montantHt: Number(a.montantHt),
    acompteHt: Number(a.acompteHt),
    joursCharge: a.joursCharge,
    statut: a.statut,
    type: a.type,
    dateDevis: a.dateDevis?.toISOString() ?? null,
    dateDebut: a.dateDebut?.toISOString() ?? null,
    dateFin: a.dateFin?.toISOString() ?? null,
    note: a.note,
    equipe: a.equipe,
    contratEntretien: a.contratEntretien,
    planning: a.slots.map((s) => ({
      id: s.id,
      date: s.date.toISOString(),
      type: s.type,
      label: s.label,
      equipe: s.equipe.nom,
    })),
    taches: a.taches.map((t) => ({
      id: t.id,
      titre: t.titre,
      niveau: t.niveau,
      fait: t.fait,
      dateEcheance: t.dateEcheance.toISOString(),
      responsableId: t.responsableId,
      responsable: t.responsable,
      retard: t.fait ? 0 : daysLate(t.dateEcheance),
    })),
    messages: (threadMsgs.length ? threadMsgs : a.messages).map((m) => ({
      id: m.id,
      texte: m.texte,
      photoLabel: m.photoLabel,
      fichier: m.fichier,
      systeme: m.systeme,
      createdAt: m.createdAt.toISOString(),
      auteur: m.auteur,
    })),
    pieces: a.pieces.map((p) => ({
      id: p.id,
      titre: p.titre,
      type: p.type,
      fichier: p.fichier,
      createdAt: p.createdAt.toISOString(),
    })),
    factures: a.factures.map((f) => ({
      id: f.id,
      type: f.type,
      montant: Number(f.montant),
      dateEmission: f.dateEmission?.toISOString() ?? null,
      dateEncaissement: f.dateEncaissement?.toISOString() ?? null,
    })),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  if (body.action === 'programmer') {
    if (!body.dateDebut) {
      return NextResponse.json({ error: 'dateDebut requise' }, { status: 400 });
    }
    const updated = await programmerAffaire(id, {
      dateDebut: new Date(body.dateDebut),
      joursCharge: body.joursCharge ? Number(body.joursCharge) : undefined,
      equipeId: body.equipeId || undefined,
    });
    return NextResponse.json({ ok: true, statut: updated.statut });
  }

  if (body.action === 'facturer') {
    if (body.type !== 'acompte' && body.type !== 'solde') {
      return NextResponse.json({ error: 'type acompte|solde' }, { status: 400 });
    }
    const f = await emettreFacture(id, body.type, body.montant ? Number(body.montant) : undefined);
    return NextResponse.json({ ok: true, factureId: f.id });
  }

  if (body.action === 'facture-traitement') {
    if (body.type !== 'acompte' && body.type !== 'solde') {
      return NextResponse.json({ error: 'type acompte|solde' }, { status: 400 });
    }
    if (!['non_emise', 'emise', 'encaissee'].includes(String(body.statut))) {
      return NextResponse.json(
        { error: 'statut non_emise|emise|encaissee' },
        { status: 400 },
      );
    }
    const r = await setFactureTraitement(id, body.type, body.statut);
    return NextResponse.json(r);
  }

  // MAJ fiche affaire (édition)
  const data: Record<string, unknown> = {};
  if (body.statut) data.statut = body.statut;
  if (typeof body.note === 'string') data.note = body.note;
  if (typeof body.client === 'string') data.client = body.client.trim();
  if (typeof body.adresse === 'string') data.adresse = body.adresse.trim();
  if (body.joursCharge != null) data.joursCharge = Number(body.joursCharge);
  if (body.montantHt != null) data.montantHt = Number(body.montantHt);
  if (body.acompteHt != null) data.acompteHt = Number(body.acompteHt);
  if (body.equipeId === null) data.equipeId = null;
  else if (body.equipeId) data.equipeId = String(body.equipeId);
  if (body.dateDebut) data.dateDebut = new Date(body.dateDebut);
  if (body.dateFin) data.dateFin = new Date(body.dateFin);
  if (body.dateDevis) data.dateDevis = new Date(body.dateDevis);

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Rien à mettre à jour' }, { status: 400 });
  }

  const updated = await prisma.affaire.update({ where: { id }, data });
  return NextResponse.json({ ok: true, id: updated.id, statut: updated.statut });
}
