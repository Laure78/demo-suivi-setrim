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
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|logo-.*|examples|icon.png|apple-icon.png).*)'],
};
