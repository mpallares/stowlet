-- Stowlet license service schema (Postgres). Idempotent: safe to run on every deploy.
-- Rows are mirrored from verified Paddle webhooks; never edit or delete them by hand.

CREATE TABLE IF NOT EXISTS customers (
  customer_id TEXT PRIMARY KEY,                 -- Paddle "ctm_..."
  email       TEXT NOT NULL,
  event_at    TIMESTAMPTZ NOT NULL,             -- occurred_at of the event that wrote this row
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers (email);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id         TEXT PRIMARY KEY,     -- Paddle "sub_..."
  customer_id             TEXT NOT NULL REFERENCES customers (customer_id),
  status                  TEXT NOT NULL,        -- active | trialing | past_due | paused | canceled
  price_id                TEXT NOT NULL,
  product_id              TEXT NOT NULL,
  scheduled_change_action TEXT,                 -- cancel | pause | resume, informational only
  scheduled_change_at     TIMESTAMPTZ,
  event_at                TIMESTAMPTZ NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_customer_id_idx ON subscriptions (customer_id);

-- Completed transactions. `lifetime` marks a one-time Pro lifetime purchase.
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id  TEXT PRIMARY KEY,             -- Paddle "txn_..."
  customer_id     TEXT NOT NULL REFERENCES customers (customer_id),
  subscription_id TEXT,
  price_id        TEXT NOT NULL,
  product_id      TEXT NOT NULL,
  lifetime        BOOLEAN NOT NULL,
  completed_at    TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_customer_id_idx ON transactions (customer_id);

-- One license key per customer. Whether it unlocks Pro is derived from the tables above.
CREATE TABLE IF NOT EXISTS licenses (
  license_key TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL UNIQUE REFERENCES customers (customer_id),
  emailed_at  TIMESTAMPTZ,                      -- null until the key email was accepted
  revoked_at  TIMESTAMPTZ,                      -- set by hand for refunds, chargebacks, leaked keys
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
