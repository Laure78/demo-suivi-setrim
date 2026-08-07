import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { AffaireStatut, AffaireType, PieceType } from '@prisma/client';
import { creerTachesDepuisDevis } from '@/lib/affaire-lifecycle';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  if (!['assistante', 'responsable', 'dirigeant'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  let numeroDevis = '';
  let client = '';
  let adresse = '';
  let montantHt = 0;
  let montantTtc: number | null = null;
  let acompteHt = 0;
  let joursCharge = 0;
  let dateDevis: string | null = null;
  let note = '';
  let pdfFile: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    numeroDevis = String(form.get('numeroDevis') ?? '').trim();
    client = String(form.get('client') ?? '').trim();
    adresse = String(form.get('adresse') ?? '').trim();
    montantHt = Number(form.get('montantHt') ?? 0);
    const ttc = form.get('montantTtc');
    montantTtc = ttc != null && String(ttc) !== '' ? Number(ttc) : null;
    acompteHt = Number(form.get('acompteHt') ?? 0) || 0;
    joursCharge = Number(form.get('joursCharge') ?? 0) || 0;
    dateDevis = String(form.get('dateDevis') ?? '').trim() || null;
    note = String(form.get('note') ?? '').trim();
    const f = form.get('pdf');
    if (f instanceof File && f.size > 0) pdfFile = f;
  } else {
    const body = await req.json();
    numeroDevis = String(body.numeroDevis ?? '').trim();
    client = String(body.client ?? '').trim();
    adresse = String(body.adresse ?? '').trim();
    montantHt = Number(body.montantHt ?? 0);
    montantTtc =
      body.montantTtc != null && body.montantTtc !== '' ? Number(body.montantTtc) : null;
    acompteHt = Number(body.acompteHt ?? 0) || 0;
    joursCharge = Number(body.joursCharge ?? 0) || 0;
    dateDevis = body.dateDevis ? String(body.dateDevis).trim() : null;
    note = String(body.note ?? '').trim();
  }

  if (!numeroDevis) {
    return NextResponse.json({ error: 'Le n° de devis est obligatoire.' }, { status: 400 });
  }
  if (!client) {
    return NextResponse.json({ error: 'Le client est obligatoire.' }, { status: 400 });
  }
  if (!adresse) {
    return NextResponse.json({ error: 'L’adresse du chantier est obligatoire.' }, { status: 400 });
  }
  if (!Number.isFinite(montantHt) || montantHt < 0) {
    return NextResponse.json({ error: 'Montant HT invalide.' }, { status: 400 });
  }

  const exists = await prisma.affaire.findUnique({ where: { numeroDevis } });
  if (exists) {
    return NextResponse.json(
      { error: `Le devis ${numeroDevis} existe déjà dans le portefeuille.` },
      { status: 409 },
    );
  }

  const affaire = await prisma.affaire.create({
    data: {
      numeroDevis,
      client,
      adresse,
      montantHt,
      montantTtc: montantTtc != null && Number.isFinite(montantTtc) ? montantTtc : null,
      acompteHt: Number.isFinite(acompteHt) ? acompteHt : 0,
      joursCharge: Math.max(0, Math.floor(joursCharge)),
      dateDevis: dateDevis ? new Date(dateDevis) : new Date(),
      note,
      statut: AffaireStatut.commande,
      type: AffaireType.travaux,
    },
  });

  await creerTachesDepuisDevis(affaire.id, {
    responsableId: session.user.id ?? 'audrey',
  });

  if (pdfFile) {
    try {
      const dir = path.join(process.cwd(), 'public', 'uploads', 'devis');
      await mkdir(dir, { recursive: true });
      const safe = pdfFile.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 80);
      const filename = `${randomBytes(4).toString('hex')}-${safe || 'devis.pdf'}`;
      const buf = Buffer.from(await pdfFile.arrayBuffer());
      await writeFile(path.join(dir, filename), buf);
      await prisma.piece.create({
        data: {
          affaireId: affaire.id,
          titre: `Devis PDF — ${pdfFile.name}`,
          type: PieceType.devis,
          fichier: `/uploads/devis/${filename}`,
          auteurId: session.user.id,
        },
      });
    } catch {
      // PDF optionnel — l'affaire reste créée
    }
  }

  return NextResponse.json({
    ok: true,
    id: affaire.id,
    numeroDevis: affaire.numeroDevis,
    message: `Devis ${numeroDevis} créé — Commande.`,
  });
}
