import type { NextAuthConfig } from 'next-auth';

/** Config partagée (Edge-safe) — sans bcrypt / Prisma. */
export const authConfig = {
  pages: { signIn: '/login' },
  providers: [],
  session: { strategy: 'jwt' },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith('/api/') || pathname.startsWith('/login')) return true;
      return !!auth;
    },
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          initiales: string;
          role: string;
          terrain: boolean;
        };
        token.id = u.id;
        token.initiales = u.initiales;
        (token as { role: string }).role = u.role;
        token.terrain = u.terrain;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.initiales = token.initiales as string;
      (session.user as { role: string }).role = token.role as string;
      session.user.terrain = token.terrain as boolean;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
