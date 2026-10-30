import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextResponse } from 'next/server';

import {
  readAccessValue,
  readManageValue,
  setBookingAccessCookie,
  setBookingManageCookie,
} from '../lib/booking/session';
import {
  buildCookieOptions,
  COOKIE_NAMES,
  COOKIE_TTLS,
  CSRF_HEADER_NAME,
  setAdminAccessCookie,
  setAdminCsrfCookie,
} from '../lib/cookies';
import {
  checkAdminCsrf,
  checkManageCsrf,
  createAdminCsrfToken,
  createManageCsrfToken,
  sameOrigin,
  verifyAdminCsrfToken,
  verifyManageCsrfToken,
} from '../lib/http/csrf';

describe('CSRF & Cookie Unification Tests', () => {
  it('1. Centralized cookie constants and options builder work consistently', () => {
    assert.strictEqual(COOKIE_NAMES.ADMIN_ACCESS, 'dea_admin_access');
    assert.strictEqual(COOKIE_NAMES.ADMIN_CSRF, 'dea_admin_csrf');
    assert.strictEqual(COOKIE_NAMES.BOOKING_ACCESS('BK-100'), 'dea_bk_BK-100');
    assert.strictEqual(COOKIE_NAMES.BOOKING_MANAGE('BK-100'), 'dea_mg_BK-100');

    assert.strictEqual(COOKIE_TTLS.ADMIN_ACCESS, 900); // 15m
    assert.strictEqual(COOKIE_TTLS.ADMIN_REFRESH, 604800); // 7d
    assert.strictEqual(COOKIE_TTLS.ADMIN_CSRF, 7200); // 2h
    assert.strictEqual(COOKIE_TTLS.BOOKING_ACCESS, 7200); // 2h
    assert.strictEqual(COOKIE_TTLS.BOOKING_MANAGE, 1800); // 30m

    // Default options
    const defaults = buildCookieOptions();
    assert.strictEqual(defaults.httpOnly, true);
    assert.strictEqual(defaults.sameSite, 'lax');
    assert.strictEqual(defaults.path, '/');

    // Overrides
    const overrides = buildCookieOptions({ httpOnly: false, maxAge: 500 });
    assert.strictEqual(overrides.httpOnly, false);
    assert.strictEqual(overrides.maxAge, 500);
  });

  it('2. Server cookie helpers set proper cookies on NextResponse', () => {
    const res = NextResponse.json({ ok: true });

    setAdminAccessCookie(res, 'admin-token-xyz');
    assert.strictEqual(
      res.cookies.get(COOKIE_NAMES.ADMIN_ACCESS)?.value,
      'admin-token-xyz',
    );

    setAdminCsrfCookie(res, 'csrf-token-123');
    const csrfCookie = res.cookies.get(COOKIE_NAMES.ADMIN_CSRF);
    assert.strictEqual(csrfCookie?.value, 'csrf-token-123');

    setBookingAccessCookie(res, 'REF-999', 'booking-access-val');
    assert.strictEqual(
      res.cookies.get('dea_bk_REF-999')?.value,
      'booking-access-val',
    );

    // Signing access level 'checkout'
    const resCheckout = NextResponse.json({ ok: true });
    setBookingAccessCookie(resCheckout, 'REF-101', 'checkout');
    const checkoutVal = resCheckout.cookies.get('dea_bk_REF-101')?.value;
    assert.ok(checkoutVal && checkoutVal !== 'checkout');
    assert.strictEqual(readAccessValue('REF-101', checkoutVal), 'checkout');

    // Signing access level 'verified'
    const resVerified = NextResponse.json({ ok: true });
    setBookingAccessCookie(resVerified, 'REF-102', 'verified');
    const verifiedVal = resVerified.cookies.get('dea_bk_REF-102')?.value;
    assert.ok(verifiedVal && verifiedVal !== 'verified');
    assert.strictEqual(readAccessValue('REF-102', verifiedVal), 'verified');

    // Setting manage cookie with custom value
    setBookingManageCookie(res, 'REF-999', 'manage-session-val');
    assert.strictEqual(
      res.cookies.get('dea_mg_REF-999')?.value,
      'manage-session-val',
    );

    // Setting manage cookie with auto-generated session
    const resManage = NextResponse.json({ ok: true });
    setBookingManageCookie(resManage, 'REF-103');
    const manageVal = resManage.cookies.get('dea_mg_REF-103')?.value;
    assert.ok(manageVal);
    const parsedManage = readManageValue('REF-103', manageVal);
    assert.ok(parsedManage);
    assert.ok(parsedManage.csrf && parsedManage.csrf.length >= 16);
    assert.ok(parsedManage.expiresAt > Date.now());
  });

  it('3. sameOrigin validation handles origin, host, and forwarded hosts correctly', () => {
    // No origin header -> treated as same-origin
    const noOrigin = new Request('http://localhost:3000/api/test', {
      headers: { host: 'localhost:3000' },
    });
    assert.strictEqual(sameOrigin(noOrigin), true);

    // Matching origin and host
    const matching = new Request('http://localhost:3000/api/test', {
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
      },
    });
    assert.strictEqual(sameOrigin(matching), true);

    // Matching x-forwarded-host
    const fwdHost = new Request('http://internal-ip/api/test', {
      headers: {
        'x-forwarded-host': 'example.com',
        origin: 'https://example.com',
      },
    });
    assert.strictEqual(sameOrigin(fwdHost), true);

    // Mismatched origin
    const mismatched = new Request('http://localhost:3000/api/test', {
      headers: {
        host: 'localhost:3000',
        origin: 'https://evil-attacker.com',
      },
    });
    assert.strictEqual(sameOrigin(mismatched), false);
  });

  it('4. Manage Booking CSRF token generation and validation', async () => {
    const ref = 'BK-TEST-123';
    const exp = Math.floor(Date.now() / 1000) + 1800;

    const manageCsrf = createManageCsrfToken(ref, exp);
    assert.ok(manageCsrf && manageCsrf.length >= 16);
    assert.strictEqual(verifyManageCsrfToken(ref, exp, manageCsrf), true);

    // Wrong reference or expiry fails verification
    assert.strictEqual(
      verifyManageCsrfToken('BK-OTHER', exp, manageCsrf),
      false,
    );
    assert.strictEqual(verifyManageCsrfToken(ref, exp + 10, manageCsrf), false);

    // Valid checkManageCsrf request
    const validReq = new Request(
      'http://localhost:3000/api/reservations/BK-TEST-123/cancel',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          [CSRF_HEADER_NAME]: manageCsrf,
        },
      },
    );
    assert.strictEqual(checkManageCsrf(validReq, manageCsrf), null);

    // Wrong CSRF header
    const badReq = new Request(
      'http://localhost:3000/api/reservations/BK-TEST-123/cancel',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          [CSRF_HEADER_NAME]: 'invalid-token',
        },
      },
    );
    const badRes = checkManageCsrf(badReq, manageCsrf);
    assert.ok(badRes);
    assert.strictEqual(badRes.status, 403);
    const body = await badRes.json();
    assert.strictEqual(body.data.code, 'csrf');
  });

  it('5. Admin CSRF token generation, signature validation, and checkAdminCsrf', async () => {
    const validToken = createAdminCsrfToken();
    assert.strictEqual(verifyAdminCsrfToken(validToken), true);

    // Alias createAdminCsrfToken works identically
    const aliasToken = createAdminCsrfToken();
    assert.strictEqual(verifyAdminCsrfToken(aliasToken), true);

    // Valid admin request passing both cookie and header
    const validReq = new Request('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        cookie: `${COOKIE_NAMES.ADMIN_CSRF}=${validToken}`,
        [CSRF_HEADER_NAME]: validToken,
      },
    });
    assert.strictEqual(checkAdminCsrf(validReq), null);
    // Alias checkAdminCsrf works identically
    assert.strictEqual(checkAdminCsrf(validReq), null);

    // Forged token
    const forgedToken = 'fake.token.signature';
    assert.strictEqual(verifyAdminCsrfToken(forgedToken), false);

    const forgedReq = new Request(
      'http://localhost:3000/api/admin/auth/login',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${COOKIE_NAMES.ADMIN_CSRF}=${forgedToken}`,
          [CSRF_HEADER_NAME]: forgedToken,
        },
      },
    );
    const forgedRes = checkAdminCsrf(forgedReq);
    assert.ok(forgedRes);
    assert.strictEqual(forgedRes.status, 403);

    // Expired token
    const expiredToken = createAdminCsrfToken(-30);
    assert.strictEqual(verifyAdminCsrfToken(expiredToken), false);

    // Mismatched header and cookie
    const mismatchReq = new Request(
      'http://localhost:3000/api/admin/auth/login',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${COOKIE_NAMES.ADMIN_CSRF}=${validToken}`,
          [CSRF_HEADER_NAME]: 'another-token',
        },
      },
    );
    const mismatchRes = checkAdminCsrf(mismatchReq);
    assert.ok(mismatchRes);
    assert.strictEqual(mismatchRes.status, 403);
  });
});
