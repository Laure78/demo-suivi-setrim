import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import {
  isPdfFile,
  parseBatappliExcel,
  parseBatappliPdf,
} from '@/lib/batappli-import';
import { AffaireStatut, AffaireType, PieceType } from '@prisma/client';
import { creerTachesDepuisDevis } from '@/lib/affaire-lifecycle';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

async function saveDevisPdf(file: File, buf: Buffer) {
  const dir = path.join(process.cwd(), 'public', 'uploads', 'devis');
  await mkdir(dir, { recursive: true });
  const safe = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);
  const filename = `${randomBytes(4).toString('hex')}-${safe || 'devis.pdf'}`;
  await writeFile(path.join(dir, filename), buf);
  return `/uploads/devis/${filename}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  if (!['assistante', 'responsable', 'dirigeant'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const pdf = isPdfFile(file.name, file.type);

  const parsed = pdf
    ? await parseBatappliPdf(buf, file.name)
    : parseBatappliExcel(buf);

  if (!parsed.ok) {
    return NextResponse.json(
      { message: parsed.error, missingColumns: parsed.missingColumns },
      { status: 400 },
    );
  }

  let created = 0;
  let updated = 0;
  let pdfUrl: string | null = null;
  if (pdf) {
    try {
      pdfUrl = await saveDevisPdf(file, buf);
    } catch {
      pdfUrl = null;
    }
  }

  for (const row of parsed.rows) {
    const existing = await prisma.affaire.findUnique({
      where: { numeroDevis: row.numeroDevis },
    });

    let affaireId: string;

    if (existing) {
      await prisma.affaire.update({
        where: { id: existing.id },
        data: {
          client: row.client,
          adresse: row.adresse,
          montantHt: row.montantHT ?? existing.montantHt,
          montantTtc: row.montantTTC ?? existing.montantTtc,
          dateDevis: row.date ? new Date(row.date) : existing.dateDevis,
        },
      });
      affaireId = existing.id;
      updated++;
    } else {
      const affaire = await prisma.affaire.create({
        data: {
          numeroDevis: row.numeroDevis,
          client: row.client,
          adresse: row.adresse,
          montantHt: row.montantHT ?? 0,
          montantTtc: row.montantTTC ?? null,
          dateDevis: row.date ? new Date(row.date) : null,
          statut: AffaireStatut.commande,
          type: AffaireType.travaux,
          joursCharge: 0,
        },
      });
      await creerTachesDepuisDevis(affaire.id, {
        responsableId: session.user.id ?? 'audrey',
      });
      affaireId = affaire.id;
      created++;
    }

    if (pdfUrl) {
      const already = await prisma.piece.findFirst({
        where: { affaireId, fichier: pdfUrl },
      });
      if (!already) {
        await prisma.piece.create({
          data: {
            affaireId,
            titre: `Devis PDF — ${file.name}`,
            type: PieceType.devis,
            fichier: pdfUrl,
            auteurId: session.user.id,
          },
        });
      }
    }
  }

  const kind = pdf ? 'PDF' : 'Batappli';
  return NextResponse.json({
    ok: true,
    message: `Import ${kind} : ${created} créée(s), ${updated} mise(s) à jour.${
      pdf && pdfUrl ? ' PDF joint à la fiche affaire.' : ''
    }`,
    created,
    updated,
  });
}
