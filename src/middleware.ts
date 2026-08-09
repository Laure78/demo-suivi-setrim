import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

export const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/')) return;
  if (pathname.startsWith('/login')) {
    if (req.auth) {
      const url = new URL('/', req.nextUrl.origin);
      return Response.redirect(url);
    }
    return;
  }
  if (!req.auth) {
    const url = new URL('/login', req.nextUrl.origin);
    url.searchParams.set('callbackUrl', pathname);
    return Response.redirect(url);
  }

  // Onglets admin des paramètres : JWT admin (contrôle fin en page + API)
  if (
    pathname.startsWith('/parametres') &&
    (req.nextUrl.searchParams.get('tab') === 'utilisateurs' ||
      req.nextUrl.searchParams.get('tab') === 'entreprise' ||
      req.nextUrl.searchParams.get('tab') === 'abonnement')
  ) {
    const acces = (req.auth.user as { acces?: string } | undefined)?.acces;
    if (acces !== 'administrateur') {
      const url = new URL('/parametres?tab=profil', req.nextUrl.origin);
      url.searchParams.set('erreur', 'admin');
      return Response.redirect(url);
    }
  }

  if (pathname.startsWith('/administration')) {
    const acces = (req.auth.user as { acces?: string } | undefined)?.acces;
    if (acces !== 'administrateur') {
      const url = new URL('/parametres?tab=profil', req.nextUrl.origin);
      url.searchParams.set('erreur', 'admin');
      return Response.redirect(url);
    }
  }

  // Mot de passe provisoire à changer
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
