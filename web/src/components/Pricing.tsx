'use client';

import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { useEffect, useState } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import {
  CHECKOUT_SUCCESS_PATH,
  CHROME_WEB_STORE_URL,
  FOUNDING_SEATS,
  PRICE_ANNUAL,
  PRICE_LIFETIME,
  PRICE_LIFETIME_FOUNDING,
  PRICE_MONTHLY,
  SUPPORT_EMAIL,
} from '@/config';
import { rememberTransaction } from '@/lib/lastCheckout';
import type { PaddleSettings } from '@/lib/paddle';

/** One paid card. Edit the list in `paidPlans()` to change what is sold. */
interface PaidPlan {
  id: 'monthly' | 'annual' | 'lifetime';
  name: string;
  period: string;
  items: string[];
  cta: string;
  /** Paddle price charged by the button, and the one whose total is displayed. */
  priceId: string;
  /** USD list price, shown only when Paddle.js could not load. */
  fallbackPrice: string;
  /** Optional struck-through reference price (another Paddle price). */
  compareAt?: { priceId: string; fallbackPrice: string };
  badge?: string;
  note?: string;
  highlight?: boolean;
}

function paidPlans(
  priceIds: PaddleSettings['priceIds'],
  proItems: string[],
  founding: string | null,
): PaidPlan[] {
  return [
    {
      id: 'monthly',
      name: 'Pro monthly',
      period: 'per month',
      items: proItems,
      cta: 'Buy monthly',
      priceId: priceIds.monthly,
      fallbackPrice: PRICE_MONTHLY,
    },
    {
      id: 'annual',
      name: 'Pro annual',
      period: 'per year',
      items: proItems,
      cta: 'Buy annual',
      priceId: priceIds.annual,
      fallbackPrice: PRICE_ANNUAL,
      badge: 'Best value',
      highlight: true,
    },
    {
      id: 'lifetime',
      name: 'Pro lifetime',
      period: 'once',
      items: [
        'Everything in Pro, forever',
        'All current and future assistants',
        'All future updates',
        'Pay once',
      ],
      cta: 'Buy lifetime',
      ...(founding
        ? {
            priceId: priceIds.lifetimeFounding,
            fallbackPrice: founding,
            compareAt: { priceId: priceIds.lifetime, fallbackPrice: PRICE_LIFETIME },
            badge: 'Founding price',
            note: `For the first ${FOUNDING_SEATS} licenses, then the regular price.`,
          }
        : { priceId: priceIds.lifetime, fallbackPrice: PRICE_LIFETIME }),
    },
  ];
}

/** Paddle.js refuses a second initialisation, so every mount shares one. */
let paddleInstance: Promise<Paddle | undefined> | null = null;
function loadPaddle(settings: PaddleSettings): Promise<Paddle | undefined> {
  paddleInstance ??= initializePaddle({
    token: settings.token,
    environment: settings.environment,
    // Lets /welcome show the key for this purchase. Provisioning itself is the webhook's job.
    eventCallback: (event) => {
      const transactionId = event.data?.transaction_id;
      if (transactionId) rememberTransaction(transactionId);
    },
  });
  return paddleInstance;
}

type Status = 'loading' | 'ready' | 'unavailable';

export function Pricing({
  paddle: settings,
  proItems,
}: {
  paddle: PaddleSettings;
  proItems: string[];
}) {
  const plans = paidPlans(settings.priceIds, proItems, PRICE_LIFETIME_FOUNDING);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  /** Price ID → the total exactly as Paddle formatted it for this visitor. */
  const [totals, setTotals] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    const ids = Object.values(settings.priceIds);
    loadPaddle(settings)
      .then(async (instance) => {
        if (!instance) throw new Error('paddle-not-loaded');
        // No address is passed: Paddle localizes from the visitor's IP.
        const preview = await instance.PricePreview({
          items: ids.map((priceId) => ({ priceId, quantity: 1 })),
        });
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const item of preview.data.details.lineItems) {
          next[item.price.id] = item.formattedTotals.total;
        }
        setPaddle(instance);
        setTotals(next);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [settings]);

  function buy(priceId: string) {
    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',
        theme: 'dark',
        successUrl: new URL(CHECKOUT_SUCCESS_PATH, window.location.origin).href,
      },
    });
  }

  const shown = (priceId: string, fallback: string): string | null => {
    if (status === 'loading') return null;
    return totals[priceId] ?? fallback;
  };

  return (
    <>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4" data-testid="pricing">
        <PlanCard
          name="Free"
          price="$0"
          period=""
          items={['5 folders (no sub-folders)', 'Title search only', 'Single-chat Markdown export']}
        >
          <ButtonLink href={CHROME_WEB_STORE_URL} external variant="secondary" className="mt-6">
            Add to Chrome
          </ButtonLink>
        </PlanCard>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            testId={`plan-${plan.id}`}
            name={plan.name}
            price={shown(plan.priceId, plan.fallbackPrice)}
            compareAt={
              plan.compareAt
                ? shown(plan.compareAt.priceId, plan.compareAt.fallbackPrice)
                : undefined
            }
            period={plan.period}
            items={plan.items}
            badge={plan.badge}
            note={plan.note}
            highlight={plan.highlight}
          >
            <Button
              onClick={() => buy(plan.priceId)}
              disabled={status !== 'ready'}
              variant={plan.highlight ? 'primary' : 'secondary'}
              className="mt-6"
              testId={`buy-${plan.id}`}
            >
              {plan.cta}
            </Button>
          </PlanCard>
        ))}
      </div>
      {status === 'unavailable' ? (
        <p
          role="status"
          data-testid="pricing-unavailable"
          className="mt-4 text-sm text-neutral-600 dark:text-neutral-400"
        >
          The checkout could not load, so these are the list prices in USD. Allow paddle.com in your
          content blocker and reload, or email{' '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      ) : null}
    </>
  );
}

function PlanCard({
  name,
  price,
  period,
  items,
  children,
  badge,
  compareAt,
  note,
  highlight = false,
  testId,
}: {
  name: string;
  /** null while Paddle is still answering. */
  price: string | null;
  period: string;
  items: string[];
  children: React.ReactNode;
  badge?: string;
  compareAt?: string | null;
  note?: string;
  highlight?: boolean;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={`card card-hover flex flex-col p-6 ${highlight ? 'plan-highlight border-transparent' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold whitespace-nowrap">{name}</h3>
        {badge ? (
          <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium whitespace-nowrap text-white dark:bg-orange-500 dark:text-neutral-950">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1" aria-busy={price === null}>
        {price === null ? (
          <>
            <span className="inline-block h-9 w-24 animate-pulse rounded-md bg-neutral-200 align-middle dark:bg-neutral-800" />
            <span className="sr-only">Loading price</span>
          </>
        ) : (
          <>
            {compareAt ? (
              <span className="mr-1 text-lg text-neutral-500 line-through dark:text-neutral-400">
                {compareAt}
              </span>
            ) : null}
            <span className="text-4xl font-semibold tracking-tight" data-testid="plan-price">
              {price}
            </span>
          </>
        )}
        {period ? (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{period}</span>
        ) : null}
      </p>
      {note ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{note}</p> : null}
      <ul className="mt-6 flex-1 space-y-2.5 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        {items.map((i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-1.5 text-accent dark:text-orange-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="h-3.5 w-3.5"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </span>
            {i}
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}
