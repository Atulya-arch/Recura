import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './schema.js';
import path from 'node:path';
import fs from 'node:fs';
const dbDir = path.resolve(process.cwd(), '.data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'pglite_data');
const pgliteClient = new PGlite(dbPath);
export const db = drizzle(pgliteClient, { schema });
export async function initDb() {
    await pgliteClient.exec(`
    CREATE TABLE IF NOT EXISTS merchants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      opted_out BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      order_id TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      payment_status TEXT NOT NULL,
      failure_reason TEXT,
      payment_method TEXT NOT NULL,
      checkout_status TEXT NOT NULL,
      attempt_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recovery_cases (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions(id),
      customer_id TEXT NOT NULL REFERENCES customers(id),
      status TEXT NOT NULL,
      recovery_eligible BOOLEAN NOT NULL DEFAULT TRUE,
      revenue_at_risk_minor INTEGER NOT NULL,
      recovered_amount_minor INTEGER NOT NULL DEFAULT 0,
      current_attempt INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recovery_actions (
      id TEXT PRIMARY KEY,
      recovery_case_id TEXT NOT NULL REFERENCES recovery_cases(id),
      action_type TEXT NOT NULL,
      status TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      attempt_number INTEGER NOT NULL,
      scheduled_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      executed_at TIMESTAMPTZ,
      result JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_decisions (
      id TEXT PRIMARY KEY,
      recovery_case_id TEXT NOT NULL REFERENCES recovery_cases(id),
      diagnosis TEXT NOT NULL,
      failure_category TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      confidence INTEGER NOT NULL,
      rationale TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      recovery_case_id TEXT,
      action_id TEXT,
      event_type TEXT NOT NULL,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL REFERENCES merchants(id),
      max_retries INTEGER NOT NULL DEFAULT 3,
      max_recovery_window_hours INTEGER NOT NULL DEFAULT 72,
      max_reminders INTEGER NOT NULL DEFAULT 2,
      max_automated_actions INTEGER NOT NULL DEFAULT 3,
      minimum_ai_confidence INTEGER NOT NULL DEFAULT 65,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE policies ADD COLUMN IF NOT EXISTS minimum_ai_confidence INTEGER NOT NULL DEFAULT 65;

    CREATE INDEX IF NOT EXISTS idx_tx_merchant ON transactions(merchant_id);
    CREATE INDEX IF NOT EXISTS idx_tx_status ON transactions(payment_status);
    CREATE INDEX IF NOT EXISTS idx_rc_tx ON recovery_cases(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_rc_status ON recovery_cases(status);
    CREATE INDEX IF NOT EXISTS idx_ra_case ON recovery_actions(recovery_case_id);
    CREATE INDEX IF NOT EXISTS idx_ra_idem ON recovery_actions(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_events(recovery_case_id);
  `);
}
export { pgliteClient };
