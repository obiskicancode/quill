export const DEMO_OVERRIDE_FLAG = '--i-understand-this-is-demo-data';

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}
