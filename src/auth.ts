import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from '@/auth.config';
import type { Acces, Role } from '@prisma/client';

declare module 'next-auth' {
  interface User {
    initiales: string;
    role: Role;
    acces: Acces;
    terrain: boolean;
    mustChangePassword?: boolean;
    tokenVersion?: number;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      initiales: string;
      role: Role;
      acces: Acces;
      terrain: boolean;
      mustChangePassword?: boolean;
    };
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id: string;
    initiales: string;
    role: Role;
    acces: Acces;
    terrain: boolean;
    mustChangePassword?: boolean;
    tokenVersion?: number;
    error?: string;
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

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.nom,
          email: user.email,
          initiales: user.initiales,
          role: user.role,
          acces: user.acces,
          terrain: user.terrain,
          mustChangePassword: user.mustChangePassword,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      const base = authConfig.callbacks?.jwt;
      token = base
        ? await base({ token, user, trigger, session } as never)
        : token;

      if (token.id && typeof (token as { tokenVersion?: number }).tokenVersion === 'number') {
        const db = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { tokenVersion: true, actif: true },
        });
        if (!db?.actif || db.tokenVersion !== (token as { tokenVersion?: number }).tokenVersion) {
          (token as { error?: string }).error = 'SessionRevoked';
        } else {
          delete (token as { error?: string }).error;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if ((token as { error?: string }).error === 'SessionRevoked') {
        session.user.id = '';
        return session;
      }
      const base = authConfig.callbacks?.session;
      if (base) {
        return base({ session, token } as never);
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
});
