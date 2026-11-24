import { Environment, LogLevel, Paddle } from '@paddle/paddle-node-sdk';
import { paddleEnvironment } from '@/lib/paddle';
import { requireEnv } from './env';

let instance: Paddle | null = null;

/** Server-side Paddle SDK. The API key never leaves this module's callers. */
export function getPaddle(): Paddle {
  instance ??= new Paddle(requireEnv('PADDLE_API_KEY'), {
    environment:
      paddleEnvironment() === 'production' ? Environment.production : Environment.sandbox,
    logLevel: LogLevel.none,
  });
  return instance;
}
