import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

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
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop lourd (max 8 Mo)' }, { status: 400 });
  }

  const type = file.type || 'application/octet-stream';
  const ext = path.extname(file.name).toLowerCase();
  const okExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(
    ext,
  );
  if (!ALLOWED.has(type) && !okExt) {
    return NextResponse.json(
      { error: 'Type non accepté — photo (jpg/png) ou document (pdf, Word, Excel).' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(dir, { recursive: true });
  const id = randomBytes(6).toString('hex');
  const filename = `${id}-${safeName(file.name) || `fichier${ext || '.bin'}`}`;
  await writeFile(path.join(dir, filename), buf);

  const isPhoto = type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'].includes(ext);

  return NextResponse.json({
    ok: true,
    url: `/uploads/${filename}`,
    name: file.name,
    kind: isPhoto ? 'photo' : 'pj',
    size: file.size,
  });
}
