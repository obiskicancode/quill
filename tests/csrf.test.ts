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
  ADMIN_ACCESS_COOKIE_NAME,
  ADMIN_ACCESS_TTL_SECONDS,
  ADMIN_CSRF_COOKIE_NAME,
  ADMIN_REFRESH_TTL_SECONDS,
  BOOKING_ACCESS_COOKIE_NAME,
  BOOKING_ACCESS_TTL_SECONDS,
  BOOKING_MANAGE_COOKIE_NAME,
  BOOKING_MANAGE_TTL_SECONDS,
  buildCookieOptions,
  CSRF_HEADER_NAME,
  CSRF_TTL_SECONDS,
  setAdminAccessCookie,
  setCsrfCookie,
} from '../lib/cookies';
import {
  checkCsrf,
  checkManageCsrf,
  createCsrfToken,
  createManageCsrfToken,
  sameOrigin,
  verifyCsrfToken,
  verifyManageCsrfToken,
} from '../lib/http/csrf';

describe('CSRF & Cookie Unification Tests', () => {
  it('1. Centralized cookie constants and options builder work consistently', () => {
    assert.strictEqual(ADMIN_ACCESS_COOKIE_NAME, 'quill_admin_access');
    assert.strictEqual(ADMIN_CSRF_COOKIE_NAME, 'quill_admin_csrf');
    assert.strictEqual(BOOKING_ACCESS_COOKIE_NAME('BK-100'), 'quill_bk_BK-100');
    assert.strictEqual(BOOKING_MANAGE_COOKIE_NAME('BK-100'), 'quill_mg_BK-100');

    assert.strictEqual(ADMIN_ACCESS_TTL_SECONDS, 900); // 15m
    assert.strictEqual(ADMIN_REFRESH_TTL_SECONDS, 604800); // 7d
    assert.strictEqual(CSRF_TTL_SECONDS, 7200); // 2h
    assert.strictEqual(BOOKING_ACCESS_TTL_SECONDS, 7200); // 2h
    assert.strictEqual(BOOKING_MANAGE_TTL_SECONDS, 1800); // 30m

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
      res.cookies.get(ADMIN_ACCESS_COOKIE_NAME)?.value,
      'admin-token-xyz',
    );

    setCsrfCookie(res, 'csrf-token-123');
    const csrfCookie = res.cookies.get(ADMIN_CSRF_COOKIE_NAME);
    assert.strictEqual(csrfCookie?.value, 'csrf-token-123');

    setBookingAccessCookie(res, 'REF-999', 'booking-access-val');
    assert.strictEqual(
      res.cookies.get('quill_bk_REF-999')?.value,
      'booking-access-val',
    );

    // Signing access level 'checkout'
    const resCheckout = NextResponse.json({ ok: true });
    setBookingAccessCookie(resCheckout, 'REF-101', 'checkout');
    const checkoutVal = resCheckout.cookies.get('quill_bk_REF-101')?.value;
    assert.ok(checkoutVal && checkoutVal !== 'checkout');
    assert.strictEqual(readAccessValue('REF-101', checkoutVal), 'checkout');

    // Signing access level 'verified'
    const resVerified = NextResponse.json({ ok: true });
    setBookingAccessCookie(resVerified, 'REF-102', 'verified');
    const verifiedVal = resVerified.cookies.get('quill_bk_REF-102')?.value;
    assert.ok(verifiedVal && verifiedVal !== 'verified');
    assert.strictEqual(readAccessValue('REF-102', verifiedVal), 'verified');

    // Setting manage cookie with custom value
    setBookingManageCookie(res, 'REF-999', 'manage-session-val');
    assert.strictEqual(
      res.cookies.get('quill_mg_REF-999')?.value,
      'manage-session-val',
    );

    // Setting manage cookie with auto-generated session
    const resManage = NextResponse.json({ ok: true });
    setBookingManageCookie(resManage, 'REF-103');
    const manageVal = resManage.cookies.get('quill_mg_REF-103')?.value;
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

  it('5. Admin CSRF token generation, signature validation, and checkCsrf', async () => {
    const validToken = createCsrfToken();
    assert.strictEqual(verifyCsrfToken(validToken), true);

    // Alias createCsrfToken works identically
    const aliasToken = createCsrfToken();
    assert.strictEqual(verifyCsrfToken(aliasToken), true);

    // Valid admin request passing both cookie and header
    const validReq = new Request('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      headers: {
        host: 'localhost:3000',
        origin: 'http://localhost:3000',
        cookie: `${ADMIN_CSRF_COOKIE_NAME}=${validToken}`,
        [CSRF_HEADER_NAME]: validToken,
      },
    });
    assert.strictEqual(checkCsrf(validReq), null);
    // Alias checkCsrf works identically
    assert.strictEqual(checkCsrf(validReq), null);

    // Forged token
    const forgedToken = 'fake.token.signature';
    assert.strictEqual(verifyCsrfToken(forgedToken), false);

    const forgedReq = new Request(
      'http://localhost:3000/api/admin/auth/login',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${ADMIN_CSRF_COOKIE_NAME}=${forgedToken}`,
          [CSRF_HEADER_NAME]: forgedToken,
        },
      },
    );
    const forgedRes = checkCsrf(forgedReq);
    assert.ok(forgedRes);
    assert.strictEqual(forgedRes.status, 403);

    // Expired token
    const expiredToken = createCsrfToken(-30);
    assert.strictEqual(verifyCsrfToken(expiredToken), false);

    // Mismatched header and cookie
    const mismatchReq = new Request(
      'http://localhost:3000/api/admin/auth/login',
      {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          origin: 'http://localhost:3000',
          cookie: `${ADMIN_CSRF_COOKIE_NAME}=${validToken}`,
          [CSRF_HEADER_NAME]: 'another-token',
        },
      },
    );
    const mismatchRes = checkCsrf(mismatchReq);
    assert.ok(mismatchRes);
    assert.strictEqual(mismatchRes.status, 403);
  });
});
