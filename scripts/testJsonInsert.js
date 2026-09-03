import { db, initDb } from '../server/db/index.js';
import { auditEvents, recoveryActions, recoveryCases } from '../server/db/schema.js';
async function test() {
    await initDb();
    console.log('Testing recoveryCases insert...');
    await db.insert(recoveryCases).values({
        id: 'rc_test_1',
        transactionId: 'tx_10001',
        customerId: 'cust_1001',
        status: 'DETECTED',
        recoveryEligible: true,
        revenueAtRiskMinor: 299900,
        recoveredAmountMinor: 0,
        currentAttempt: 0,
        maxAttempts: 3
    });
    console.log('Testing auditEvents insert with metadata object...');
    await db.insert(auditEvents).values({
        id: 'aud_test_1',
        recoveryCaseId: 'rc_test_1',
        eventType: 'PAYMENT_FAILED',
        metadata: { failureReason: 'Network error', amountMinor: 299900 }
    });
    console.log('Testing recoveryActions insert with result object...');
    await db.insert(recoveryActions).values({
        id: 'act_test_1',
        recoveryCaseId: 'rc_test_1',
        actionType: 'IMMEDIATE_RETRY',
        status: 'EXECUTED',
        idempotencyKey: 'idem_test_1',
        attemptNumber: 1,
        result: { status: 'SUCCESS' }
    });
    console.log('All inserts succeeded!');
    process.exit(0);
}
test().catch(e => {
    console.error('Error during test:', e);
    process.exit(1);
});
