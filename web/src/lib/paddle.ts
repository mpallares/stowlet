import { PADDLE_PRICE_IDS, type PaddleEnvironment, type PaddlePriceIds } from '@/config';

export interface PaddleSettings {
  environment: PaddleEnvironment;
  /** Client-side token. Safe to ship to the browser; never put an API key here. */
  token: string;
  priceIds: PaddlePriceIds;
}

const TOKEN_PREFIX: Record<PaddleEnvironment, string> = { sandbox: 'test_', production: 'live_' };

function isEnvironment(value: string | undefined): value is PaddleEnvironment {
  return value === 'sandbox' || value === 'production';
}

/** The Paddle environment this deployment talks to. Throws when unset: there is no default. */
export function paddleEnvironment(): PaddleEnvironment {
  const environment = process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (!isEnvironment(environment)) {
    throw new Error(
      'NEXT_PUBLIC_PADDLE_ENV must be "sandbox" or "production". See web/.env.example.',
    );
  }
  return environment;
}

/**
 * Reads the Paddle environment and client token from env vars and throws when anything is
 * missing or inconsistent. Called from a server component, so a misconfigured build fails
 * instead of shipping a page that talks to the wrong Paddle account. There is no default.
 */
export function paddleSettings(): PaddleSettings {
  const environment = paddleEnvironment();
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!token) {
    throw new Error('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set. See web/.env.example.');
  }
  if (!token.startsWith(TOKEN_PREFIX[environment])) {
    throw new Error(
      `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN must be a ${environment} client-side token (prefix "${TOKEN_PREFIX[environment]}").`,
    );
  }

  const priceIds = PADDLE_PRICE_IDS[environment];
  const missing = Object.entries(priceIds)
    .filter(([, id]) => !/^pri_[a-z\d]{26}$/.test(id))
    .map(([plan]) => plan);
  if (missing.length > 0) {
    throw new Error(
      `PADDLE_PRICE_IDS.${environment} in web/src/config.ts has no valid price ID for: ${missing.join(', ')}.`,
    );
  }

  return { environment, token, priceIds };
}
