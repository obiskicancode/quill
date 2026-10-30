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
