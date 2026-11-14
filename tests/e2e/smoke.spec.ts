import { expect, test } from './fixtures';

test('template contains bootstrap and E2E baseline rows', async ({ db }) => {
  const settings = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM hotel_settings',
  );
  expect(settings.rows[0]?.count).toBe(1);

  const owner = await db.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM staff_users WHERE role = 'owner'",
  );
  expect(owner.rows[0]?.count).toBeGreaterThan(0);

  const reservation = await db.query<{ reference: string }>(
    "SELECT reference FROM reservations WHERE reference = 'E2E-0001'",
  );
  expect(reservation.rows[0]?.reference).toBe('E2E-0001');
});

test.describe('home page', () => {
  test.skip(!process.env.E2E_BASE_URL, 'Set E2E_BASE_URL and start the app');

  test('renders when E2E_BASE_URL is set', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(500);
  });
});
