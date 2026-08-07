import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from '@/auth.config';
import type { Role } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    initiales: string;
    role: Role;
    terrain: boolean;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      initiales: string;
      role: Role;
      terrain: boolean;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    initiales: string;
    role: Role;
    terrain: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: 'SETRIM',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? '')
          .trim()
          .toLowerCase();
        const password = String(credentials?.password ?? '');
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.actif) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.nom,
          email: user.email,
          initiales: user.initiales,
          role: user.role,
          terrain: user.terrain,
        };
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
});
