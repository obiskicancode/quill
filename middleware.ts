import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { config as appConfig } from '@/config';
import {
  COOKIE_NAMES,
  createCsrfToken,
  setAdminCsrfCookie,
} from '@/lib/cookies';

const MAINTENANCE = appConfig.MAINTENANCE_MODE;

/**
 * Returns 503 and serves /maintenance for all requests except:
 * - requests for assets (favicons, images, css, js)
 * - requests for the maintenance page itself
 * - admin pages, which stay reachable during maintenance
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');

  if (!MAINTENANCE || isAdminPage) {
    const response = NextResponse.next();
    if (
      isAdminPage &&
      request.method === 'GET' &&
      !request.cookies.get(COOKIE_NAMES.ADMIN_CSRF)
    ) {
      setAdminCsrfCookie(response, createCsrfToken());
    }
    return response;
  }

  if (pathname.startsWith('/maintenance')) return NextResponse.next();
  if (
    /\.(ico|svg|png|jpg|jpeg|webp|avif|css|js|map|woff2|woff|ttf|txt)$/.test(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/maintenance';
  return NextResponse.rewrite(url, { status: 503 });
}

export const config = {
  matcher: '/((?!_next/static|_next/image|api/).*)',
};
