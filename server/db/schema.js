import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const merchants = sqliteTable('merchants', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const customers = sqliteTable('customers', {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id').notNull().references(() => merchants.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone').notNull(),
    optedOut: integer('opted_out', { mode: 'boolean' }).default(false).notNull(),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const transactions = sqliteTable('transactions', {
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
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const recoveryCases = sqliteTable('recovery_cases', {
    id: text('id').primaryKey(),
    transactionId: text('transaction_id').notNull().references(() => transactions.id),
    customerId: text('customer_id').notNull().references(() => customers.id),
    status: text('status').notNull(),
    recoveryEligible: integer('recovery_eligible', { mode: 'boolean' }).default(true).notNull(),
    revenueAtRiskMinor: integer('revenue_at_risk_minor').notNull(),
    recoveredAmountMinor: integer('recovered_amount_minor').default(0).notNull(),
    currentAttempt: integer('current_attempt').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(3).notNull(),
    promiseToPayDate: text('promise_to_pay_date'),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const recoveryActions = sqliteTable('recovery_actions', {
    id: text('id').primaryKey(),
    recoveryCaseId: text('recovery_case_id').notNull().references(() => recoveryCases.id),
    actionType: text('action_type').notNull(),
    status: text('status').notNull(),
    idempotencyKey: text('idempotency_key').notNull(),
    attemptNumber: integer('attempt_number').notNull(),
    scheduledAt: text('scheduled_at').notNull().$defaultFn(() => new Date().toISOString()),
    executedAt: text('executed_at'),
    result: text('result', { mode: 'json' }),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const aiDecisions = sqliteTable('ai_decisions', {
    id: text('id').primaryKey(),
    recoveryCaseId: text('recovery_case_id').notNull().references(() => recoveryCases.id),
    diagnosis: text('diagnosis').notNull(),
    failureCategory: text('failure_category').notNull(),
    recommendedAction: text('recommended_action').notNull(),
    confidence: integer('confidence').notNull(),
    rationale: text('rationale').notNull(),
    hinglishScript: text('hinglish_script'),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const auditEvents = sqliteTable('audit_events', {
    id: text('id').primaryKey(),
    recoveryCaseId: text('recovery_case_id'),
    actionId: text('action_id'),
    eventType: text('event_type').notNull(),
    metadata: text('metadata', { mode: 'json' }),
    createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
export const policies = sqliteTable('policies', {
    id: text('id').primaryKey(),
    merchantId: text('merchant_id').notNull().references(() => merchants.id),
    maxRetries: integer('max_retries').default(3).notNull(),
    maxRecoveryWindowHours: integer('max_recovery_window_hours').default(72).notNull(),
    maxReminders: integer('max_reminders').default(2).notNull(),
    maxAutomatedActions: integer('max_automated_actions').default(3).notNull(),
    minimumAiConfidence: integer('minimum_ai_confidence').default(65).notNull(),
    updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
