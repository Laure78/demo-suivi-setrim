import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseBatappliExcel } from '@/lib/batappli-import';
import { AffaireStatut, AffaireType } from '@prisma/client';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  // Audrey / Mélissa / Valérie
  if (!['assistante', 'responsable', 'dirigeant'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Droits insuffisants' }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = parseBatappliExcel(buf);
  if (!parsed.ok) {
    return NextResponse.json(
      { message: parsed.error, missingColumns: parsed.missingColumns },
      { status: 400 },
    );
  }

  let created = 0;
  let updated = 0;

  for (const row of parsed.rows) {
    const existing = await prisma.affaire.findUnique({
      where: { numeroDevis: row.numeroDevis },
    });

    if (existing) {
      // Ne touche jamais aux tâches, dates et fils déjà saisis
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
      updated++;
    } else {
      await prisma.affaire.create({
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
      created++;
    }
  }

  return NextResponse.json({
    ok: true,
    message: `Import Batappli : ${created} créée(s), ${updated} mise(s) à jour.`,
    created,
    updated,
  });
}
