import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

const MAX_BYTES = 3 * 1024 * 1024; // 3 Mo
const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      nom: true,
      initiales: true,
      email: true,
      role: true,
      avatarUrl: true,
    },
  });
  if (!user) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  return NextResponse.json(user);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const form = await req.formData();
  const action = String(form.get('action') ?? 'upload');

  if (action === 'remove') {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarUrl: null },
    });
    return NextResponse.json({ ok: true, avatarUrl: null });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Photo manquante' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Photo trop lourde (max 3 Mo)' }, { status: 400 });
  }
  const type = file.type || 'image/jpeg';
  if (!IMAGE_TYPES.has(type) && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
    return NextResponse.json(
      { error: 'Formats acceptés : jpg, png, webp.' },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  await mkdir(dir, { recursive: true });
  const ext =
    type === 'image/png'
      ? '.png'
      : type === 'image/webp'
        ? '.webp'
        : type === 'image/gif'
          ? '.gif'
          : '.jpg';
  const filename = `${session.user.id}-${randomBytes(4).toString('hex')}${ext}`;
  await writeFile(path.join(dir, filename), buf);
  const avatarUrl = `/uploads/avatars/${filename}`;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
  });

  // Mettre à jour le fil DM (threadMeta) si présent
  await prisma.threadMeta.updateMany({
    where: { id: session.user.id },
    data: { avatar: session.user.initiales ?? '' },
  });

  return NextResponse.json({ ok: true, avatarUrl });
}
