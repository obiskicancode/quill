type LogLevel = 'info' | 'warn' | 'error';

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
