import type { NextAuthConfig } from 'next-auth';
import type { Acces } from '@prisma/client';

/** Config partagée (Edge-safe) — sans bcrypt / Prisma. */
export const authConfig = {
  pages: { signIn: '/login' },
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (
        pathname.startsWith('/api/') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/invitation/')
      ) {
        return true;
      }
      return !!auth;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const u = user as {
          id: string;
          initiales: string;
          role: string;
          acces: Acces;
          terrain: boolean;
          mustChangePassword?: boolean;
          tokenVersion?: number;
        };
        token.id = u.id;
        token.initiales = u.initiales;
        (token as { role: string }).role = u.role;
        (token as { acces: Acces }).acces = u.acces;
        token.terrain = u.terrain;
        token.mustChangePassword = !!u.mustChangePassword;
        (token as { tokenVersion?: number }).tokenVersion = u.tokenVersion ?? 0;
      }
      if (trigger === 'update' && session) {
        const s = session as { mustChangePassword?: boolean; acces?: Acces };
        if (typeof s.mustChangePassword === 'boolean') {
          token.mustChangePassword = s.mustChangePassword;
        }
        if (s.acces) (token as { acces: Acces }).acces = s.acces;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.initiales = token.initiales as string;
      (session.user as { role: string }).role = token.role as string;
      (session.user as { acces: Acces }).acces = (token.acces as Acces) ?? 'collaborateur';
      session.user.terrain = token.terrain as boolean;
      (session.user as { mustChangePassword?: boolean }).mustChangePassword =
        !!token.mustChangePassword;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
