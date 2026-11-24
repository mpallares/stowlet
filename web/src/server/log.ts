/**
 * Server logging: a code plus Paddle IDs or counts. Never an email address, a license key
 * or an error object that might carry one.
 */
export function logEvent(code: string, detail: Record<string, string | number | boolean> = {}) {
  console.info(JSON.stringify({ code, ...detail }));
}

export function logFailure(code: string, error: unknown) {
  const name = error instanceof Error ? error.name : 'unknown';
  console.error(JSON.stringify({ code, error: name }));
}
