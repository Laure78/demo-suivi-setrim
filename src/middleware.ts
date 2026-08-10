import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';
import { NextResponse } from 'next/server';

export const { auth } = NextAuth(authConfig);

const EXTERNE_OK = [
  '/messages',
  '/parametres',
  '/changer-mot-de-passe',
  '/invitation',
  '/login',
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) return;
  if (pathname.startsWith('/invitation/')) return;
  if (pathname.startsWith('/login')) {
    if (req.auth) {
      const acces = (req.auth.user as { acces?: string } | undefined)?.acces;
      const url = new URL(
        acces === 'externe' ? '/messages' : '/',
        req.nextUrl.origin,
      );
      return Response.redirect(url);
    }
    return;
  }
  if (!req.auth) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return Response.redirect(url);
  }

  const acces = (req.auth.user as { acces?: string } | undefined)?.acces;

  // Participants externes : messagerie + profil uniquement
  if (acces === 'externe') {
    const allowed = EXTERNE_OK.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
    if (!allowed) {
      return NextResponse.redirect(new URL('/messages', req.nextUrl.origin));
    }
    if (
      pathname.startsWith('/parametres') &&
      req.nextUrl.searchParams.get('tab') &&
      req.nextUrl.searchParams.get('tab') !== 'profil'
    ) {
      return NextResponse.redirect(
        new URL('/parametres?tab=profil', req.nextUrl.origin),
      );
    }
  }

    if (
      pathname.startsWith('/parametres') &&
      (req.nextUrl.searchParams.get('tab') === 'utilisateurs' ||
        req.nextUrl.searchParams.get('tab') === 'externes' ||
        req.nextUrl.searchParams.get('tab') === 'entreprise' ||
        req.nextUrl.searchParams.get('tab') === 'abonnement')
    ) {
    if (acces !== 'administrateur') {
      const url = new URL('/parametres?tab=profil', req.nextUrl.origin);
      url.searchParams.set('erreur', 'admin');
      return Response.redirect(url);
    }
  }

  if (pathname.startsWith('/administration')) {
    if (acces !== 'administrateur') {
      const url = new URL('/parametres?tab=profil', req.nextUrl.origin);
      url.searchParams.set('erreur', 'admin');
      return Response.redirect(url);
    }
  }

  if (
    (req.auth.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword &&
    !pathname.startsWith('/changer-mot-de-passe') &&
    !pathname.startsWith('/api/')
  ) {
    const url = new URL('/changer-mot-de-passe', req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|logo-.*|examples|icon.png|apple-icon.png).*)',
  ],
};
