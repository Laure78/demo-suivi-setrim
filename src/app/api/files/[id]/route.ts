import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { assertThreadAccess } from '@/lib/externe-access';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await ctx.params;
  const file = await prisma.secureFile.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 });
  }

  const access = await assertThreadAccess({
    userId: session.user.id,
    acces: session.user.acces,
    threadKey: file.threadKey,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const disk = path.join(process.cwd(), 'storage', 'secure', file.storageName);
  try {
    const buf = await readFile(disk);
    return new NextResponse(buf, {
      headers: {
        'Content-Type': file.mime || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.originalName)}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Fichier manquant sur le serveur' }, { status: 404 });
  }
}
