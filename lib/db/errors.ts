/**
 * PostgreSQL error helpers shared by booking/database code. Detects an
 * exclusion-constraint violation (SQLSTATE `23P01`), the signal used for
 * overlapping date-range booking conflicts. Checks both the error and its
 * `cause`, since drivers and wrappers sometimes nest the code.
 */
export function isExclusionViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: unknown }).code;
  if (code === '23P01') return true;
  const cause = (error as { cause?: unknown }).cause;
  return Boolean(
    cause &&
    typeof cause === 'object' &&
    (cause as { code?: unknown }).code === '23P01',
  );
}
