import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { assertThreadAccess, threadHasExternes } from '@/lib/externe-access';
import { isExterne } from '@/lib/acces-labels';

const MAX_BYTES = 8 * 1024 * 1024; // 8 Mo
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function safeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .slice(0, 80);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  const threadKey = String(form.get('threadKey') ?? '').trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 8 Mo)' }, { status: 400 });
  }

  if (threadKey) {
    const access = await assertThreadAccess({
      userId: session.user.id,
      acces: session.user.acces,
      threadKey,
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
  } else if (isExterne(session.user.acces)) {
    return NextResponse.json(
      { error: 'Indiquez la discussion pour joindre un fichier.' },
      { status: 400 },
    );
  }

  const type = file.type || 'application/octet-stream';
  const ext = path.extname(file.name).toLowerCase();
  const okExt = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.heic',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
  ].includes(ext);
  if (!ALLOWED.has(type) && !okExt) {
    return NextResponse.json(
      { error: 'Type non accepté — photo (jpg/png) ou document (pdf, Word, Excel).' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const idHex = randomBytes(16).toString('hex');
  const filename = `${idHex}-${safeName(file.name) || `fichier${ext || '.bin'}`}`;
  const isPhoto =
    type.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'].includes(ext);

  const useSecure =
    isExterne(session.user.acces) ||
    (threadKey ? await threadHasExternes(threadKey) : false);

  if (useSecure && threadKey) {
    const dir = path.join(process.cwd(), 'storage', 'secure');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buf);
    const sf = await prisma.secureFile.create({
      data: {
        threadKey,
        storageName: filename,
        originalName: file.name,
        mime: type,
        size: file.size,
        uploadedById: session.user.id,
      },
    });
    return NextResponse.json({
      ok: true,
      url: `/api/files/${sf.id}`,
      name: file.name,
      kind: isPhoto ? 'photo' : 'pj',
      size: file.size,
      secure: true,
    });
  }

  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buf);

  return NextResponse.json({
    ok: true,
    url: `/uploads/${filename}`,
    name: file.name,
    kind: isPhoto ? 'photo' : 'pj',
    size: file.size,
    secure: false,
  });
}
