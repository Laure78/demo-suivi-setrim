import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/acces';
import { prisma } from '@/lib/prisma';
import { formatDateFr, eur } from '@/lib/format';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await ctx.params;
  const f = await prisma.facturePlateforme.findUnique({
    where: { id },
    include: { entreprise: true },
  });
  if (!f) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/><title>${f.numero}</title>
<style>
body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#111;padding:0 16px}
h1{font-size:22px;margin:0 0 8px}
.meta{color:#555;font-size:14px;margin-bottom:24px}
table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:8px 0;border-bottom:1px solid #ddd}
.right{text-align:right}
</style></head><body>
<h1>Facture ${f.numero}</h1>
<div class="meta">${f.entreprise.raisonSociale}<br/>${f.entreprise.adresse}<br/>
SIRET ${f.entreprise.siret} · TVA ${f.entreprise.tvaIntra}</div>
<p>Date d’émission : ${formatDateFr(f.dateEmission)}<br/>
Période : ${formatDateFr(f.periodeDebut)} – ${formatDateFr(f.periodeFin)}</p>
<table>
<tr><td>Abonnement plateforme</td><td class="right">${eur(Number(f.montantHt))} HT</td></tr>
<tr><td><strong>Total TTC</strong></td><td class="right"><strong>${eur(Number(f.montantTtc))}</strong></td></tr>
</table>
<p style="margin-top:32px;font-size:13px;color:#666">Document démo — BeWork · SETRIM</p>
<script>window.print()</script>
</body></html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${f.numero}.html"`,
    },
  });
}
