import { pgTable, text, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
export const merchants = pgTable('merchants', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const customers = pgTable('customers', {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id').notNull().references(() => merchants.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    optedOut: boolean('opted_out').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const transactions = pgTable('transactions', {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id').notNull().references(() => merchants.id),
    customerId: text('customer_id').notNull().references(() => customers.id),
    orderId: text('order_id').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').default('INR').notNull(),
    paymentStatus: text('payment_status').notNull(),
    failureReason: text('failure_reason'),
    paymentMethod: text('payment_method').notNull(),
    checkoutStatus: text('checkout_status').notNull(),
    attemptCount: integer('attempt_count').default(1).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const recoveryCases = pgTable('recovery_cases', {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id').notNull().references(() => transactions.id),
    customerId: text('customer_id').notNull().references(() => customers.id),
    status: text('status').notNull(),
    recoveryEligible: boolean('recovery_eligible').default(true).notNull(),
    revenueAtRiskMinor: integer('revenue_at_risk_minor').notNull(),
    recoveredAmountMinor: integer('recovered_amount_minor').default(0).notNull(),
    currentAttempt: integer('current_attempt').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    promiseToPayDate: timestamp('promise_to_pay_date', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const recoveryActions = pgTable('recovery_actions', {
    id: text('id').primaryKey(),
    recoveryCaseId: text('recovery_case_id').notNull().references(() => recoveryCases.id),
    actionType: text('action_type').notNull(),
    status: text('status').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).defaultNow().notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    result: jsonb('result'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const aiDecisions = pgTable('ai_decisions', {
    id: text('id').primaryKey(),
    recoveryCaseId: text('recovery_case_id').notNull().references(() => recoveryCases.id),
    diagnosis: text('diagnosis').notNull(),
    failureCategory: text('failure_category').notNull(),
    recommendedAction: text('recommended_action').notNull(),
    confidence: integer('confidence').notNull(),
    rationale: text('rationale').notNull(),
    hinglishScript: text('hinglish_script'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const auditEvents = pgTable('audit_events', {
    id: text('id').primaryKey(),
    recoveryCaseId: text('recovery_case_id'),
    actionId: text('action_id'),
    eventType: text('event_type').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
export const policies = pgTable('policies', {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id').notNull().references(() => merchants.id),
    maxRetries: integer('max_retries').default(3).notNull(),
    maxRecoveryWindowHours: integer('max_recovery_window_hours').default(72).notNull(),
    maxReminders: integer('max_reminders').default(2).notNull(),
    maxAutomatedActions: integer('max_automated_actions').default(3).notNull(),
    minimumAiConfidence: integer('minimum_ai_confidence').default(65).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
