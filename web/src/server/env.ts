/** Reads a server-only env var and throws when it is missing. There are no defaults. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See web/.env.example.`);
  return value;
}
