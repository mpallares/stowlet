/** Remembers the checkout this tab just ran, so the welcome page can show its license key. */
const STORAGE_KEY = 'stowlet:last-transaction';

export function rememberTransaction(transactionId: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, transactionId);
  } catch {
    // Storage blocked: the key still arrives by email.
  }
}

export function recallTransaction(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
