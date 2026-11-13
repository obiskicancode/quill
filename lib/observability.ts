/**
 * Minimal structured logging for server code. Events are emitted as one JSON
 * object per line so they stay machine-readable in production logs.
 */
type LogLevel = 'info' | 'warn' | 'error';

/**
 * Emits a structured log line with a stable event name and arbitrary context.
 * Use `error` for failures that need operator attention; avoid logging secrets
 * or full request bodies.
 */
export function logStructured(
  event: string,
  data: Record<string, unknown> = {},
  level: LogLevel = 'info',
): void {
  const payload = JSON.stringify({
    level,
    event,
    at: new Date().toISOString(),
    ...data,
  });
  if (level === 'error') console.error(payload);
  else if (level === 'warn') console.warn(payload);
  else console.info(payload);
}
