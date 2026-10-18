import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { config as appConfig } from '@/config'

const MAINTENANCE = appConfig.MAINTENANCE_MODE

/**
 * Returns 503 and serves /maintenance for all requests except:
 * - requests for assets (favicons, images, css, js)
 * - requests for the maintenance page itself
 */
export function middleware(request: NextRequest) {
  if (!MAINTENANCE) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (pathname.startsWith('/maintenance')) return NextResponse.next()
  if (/\.(ico|svg|png|jpg|jpeg|webp|avif|css|js|map|woff2|woff|ttf|txt)$/.test(pathname)) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = '/maintenance'
  return NextResponse.rewrite(url, { status: 503 })
}

export const config = {
  matcher: '/((?!_next/static|_next/image|api/).*)',
}
