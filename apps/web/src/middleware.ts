import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/login', '/register', '/'];

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // For client-side auth check, we let the page handle it
  // This middleware mainly handles initial SSR redirects
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
